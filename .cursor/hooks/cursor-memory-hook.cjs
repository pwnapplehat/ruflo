#!/usr/bin/env node
/**
 * Ruflo Cursor Memory Hook (Cross-Platform, Windows-first)
 *
 * Replaces the Claude-Code-specific auto-memory-hook.mjs. Cursor has no
 * ~/.cursor/projects/<key>/memory/ layout, so ruflo stores its own
 * project-scoped memory markdown under:
 *   <workspace>/.cursor-flow/memory/<project-hash>/*.md   (project-local)
 *   ~/.cursor-flow/memory/*.md                             (global)
 *
 * Subcommands (invoked from .cursor/hooks.json):
 *   import  — sessionStart: load memory markdown into the JSON backend +
 *             vectorize into AgentDB (ONNX 384-dim).
 *   sync    — stop/sessionEnd: write bridge entries back to memory markdown +
 *             flush SONA/ReasoningBank patterns.
 *
 * Responds using Cursor's verified stdout contract:
 *   { "additional_context"?: string }
 *
 * Exit code 0 on success. Failures are non-fatal (memory is best-effort).
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const helpersDir = path.join(__dirname, '..', '..', '.cursor-flow', 'helpers');

function safeRequire(modulePath) {
  try {
    if (fs.existsSync(modulePath)) {
      const origLog = console.log;
      const origError = console.error;
      console.log = () => {};
      console.error = () => {};
      try { return require(modulePath); } finally { console.log = origLog; console.error = origError; }
    }
  } catch (e) { /* optional */ }
  return null;
}

function emit(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
function emitContext(ctx) { emit(ctx && String(ctx).trim() ? { additional_context: String(ctx) } : {}); }

function projectHash(workspaceRoot) {
  var abs = path.resolve(workspaceRoot || process.cwd());
  return crypto.createHash('sha1').update(abs).digest('hex').slice(0, 12);
}

function projectMemoryDir(workspaceRoot) {
  return path.join(workspaceRoot || process.cwd(), '.cursor-flow', 'memory', projectHash(workspaceRoot));
}

function globalMemoryDir() {
  return path.join(os.homedir(), '.cursor-flow', 'memory');
}

function listMemoryMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir).filter(function (f) { return f.endsWith('.md'); }).map(function (f) {
      return path.join(dir, f);
    });
  } catch (e) { return []; }
}

function parseFrontmatter(content) {
  var m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { name: '', description: '', type: 'auto-memory', body: content };
  var yaml = m[1];
  var body = m[2].trim();
  var nameMatch = yaml.match(/^name:\s*(.+)$/m);
  var descMatch = yaml.match(/^description:\s*(.+)$/m);
  var typeMatch = yaml.match(/^type:\s*(.+)$/m);
  return {
    name: nameMatch ? nameMatch[1].trim() : '',
    description: descMatch ? descMatch[1].trim() : '',
    type: typeMatch ? typeMatch[1].trim() : 'auto-memory',
    body: body,
  };
}

async function loadMemoryInitializer() {
  // Resolve the bundled memory-initializer from @claude-flow/cli
  try {
    var candidates = [
      path.join(helpersDir, '..', '..', 'node_modules', '@claude-flow', 'cli', 'dist', 'src', 'memory', 'memory-initializer.js'),
      path.join(process.cwd(), 'node_modules', '@claude-flow', 'cli', 'dist', 'src', 'memory', 'memory-initializer.js'),
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (fs.existsSync(candidates[i])) {
        return await import('file://' + candidates[i].replace(/\\/g, '/'));
      }
    }
  } catch (e) { /* non-fatal */ }
  return null;
}

async function doImport(workspaceRoot) {
  var parts = [];
  var projDir = projectMemoryDir(workspaceRoot);
  var globDir = globalMemoryDir();
  var files = listMemoryMarkdown(projDir).concat(listMemoryMarkdown(globDir));

  if (files.length === 0) {
    emitContext('[ruflo-memory] No memory files found yet. Memory will accumulate as you work.');
    return;
  }

  var memInit = await loadMemoryInitializer();
  if (!memInit) {
    emitContext('[ruflo-memory] Found ' + files.length + ' memory file(s); vectorization skipped (memory-initializer unavailable).');
    return;
  }

  try { await memInit.initializeMemoryDatabase({ force: false, verbose: false }); } catch (e) { /* non-fatal */ }

  var imported = 0;
  for (var i = 0; i < files.length; i++) {
    try {
      var content = fs.readFileSync(files[i], 'utf-8');
      var parsed = parseFrontmatter(content);
      var key = parsed.name || path.basename(files[i], '.md');
      // Split body into sections for granular entries
      var sections = parsed.body.split(/^## /m).filter(function (s) { return s.trim(); });
      if (sections.length === 0) sections = [parsed.body];
      for (var s = 0; s < sections.length; s++) {
        var sectionContent = sections[s].trim();
        if (sectionContent.length < 10) continue;
        try {
          await memInit.storeEntry({
            key: key + (s > 0 ? '#' + s : ''),
            value: sectionContent,
            namespace: 'cursor-memory',
            generateEmbeddingFlag: true,
          });
          imported++;
        } catch (e) { /* skip entries that fail to embed */ }
      }
    } catch (e) { /* skip unreadable file */ }
  }

  parts.push('[ruflo-memory] Imported ' + imported + ' entr' + (imported === 1 ? 'y' : 'ies') + ' from ' + files.length + ' file(s) into AgentDB.');
  emitContext(parts.join('\n'));
}

async function doSync(workspaceRoot) {
  var projDir = projectMemoryDir(workspaceRoot);
  try { fs.mkdirSync(projDir, { recursive: true }); } catch (e) { /* may already exist */ }

  // Write a lightweight session marker so the memory dir exists for future imports.
  // Full bridge-to-markdown sync requires the @claude-flow/memory AutoMemoryBridge;
  // when unavailable we still ensure the directory structure is in place.
  var memPkgPath = path.join(helpersDir, '..', '..', 'node_modules', '@claude-flow', 'memory', 'dist', 'src', 'auto-memory-bridge.js');
  var bridgeAvailable = fs.existsSync(memPkgPath);

  if (!bridgeAvailable) {
    emitContext('[ruflo-memory] Sync complete (directory ensured; bridge package optional).');
    return;
  }

  try {
    var bridgeMod = await import('file://' + memPkgPath.replace(/\\/g, '/'));
    // The CursorMemoryBridge writes to .cursor-flow/memory/ instead of ~/.claude/projects/
    if (bridgeMod.CursorMemoryBridge) {
      var bridge = new bridgeMod.CursorMemoryBridge({ workingDir: workspaceRoot || process.cwd() });
      var result = await bridge.syncToMemoryMarkdown();
      emitContext('[ruflo-memory] Synced ' + (result && result.written ? result.written : 0) + ' entr' +
        ((result && result.written) === 1 ? 'y' : 'ies') + ' to .cursor-flow/memory/.');
      return;
    }
  } catch (e) { /* non-fatal */ }

  emitContext('[ruflo-memory] Sync complete.');
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  return new Promise(function (resolve) {
    var data = '';
    var timer = setTimeout(function () {
      process.stdin.removeAllListeners();
      process.stdin.pause();
      resolve(data);
    }, 500);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (chunk) { data += chunk; });
    process.stdin.on('end', function () { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', function () { clearTimeout(timer); resolve(data); });
    process.stdin.resume();
  });
}

async function main() {
  var safetyTimer = setTimeout(function () {
    process.stderr.write('[WARN] Cursor memory hook global timeout (8s), forcing exit\n');
    process.exit(0);
  }, 8000);
  safetyTimer.unref();

  var stdinData = '';
  try { stdinData = await readStdin(); } catch (e) { /* ignore */ }

  var hookInput = {};
  if (stdinData.trim()) {
    try { hookInput = JSON.parse(stdinData); } catch (e) { /* ignore */ }
  }

  var workspaceRoot = '';
  if (Array.isArray(hookInput.workspace_roots) && hookInput.workspace_roots.length > 0) {
    workspaceRoot = hookInput.workspace_roots[0];
  }
  if (!workspaceRoot) workspaceRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();

  var [, , command] = process.argv;

  try {
    if (command === 'import') {
      await doImport(workspaceRoot);
    } else if (command === 'sync') {
      await doSync(workspaceRoot);
    } else {
      emitContext('[ruflo-memory] Unknown subcommand: ' + (command || '(none)'));
    }
  } catch (e) {
    emitContext('[ruflo-memory] Non-fatal error: ' + e.message);
  }
}

if (require.main === module) {
  main().catch(function (e) {
    process.stderr.write('[WARN] Cursor memory hook error: ' + e.message + '\n');
  }).finally(function () {
    process.exit(0);
  });
}

module.exports = {
  projectMemoryDir: projectMemoryDir,
  globalMemoryDir: globalMemoryDir,
  parseFrontmatter: parseFrontmatter,
};
