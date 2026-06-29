#!/usr/bin/env node
/**
 * Ruflo Cursor Hook Handler (Cross-Platform, Windows-first)
 *
 * Dispatches Cursor hook events to the ruflo helper modules and responds
 * using Cursor's verified hook stdin/stdout JSON contract.
 *
 * Cursor hook stdin base fields (all events):
 *   conversation_id, generation_id, model, model_id?, model_params?,
 *   hook_event_name, cursor_version, workspace_roots[], user_email, transcript_path
 *
 * Event-specific stdin fields (verified against cursor.com/docs/hooks):
 *   beforeShellExecution : + command, cwd
 *   afterFileEdit        : + file_path, edits[{old_string,new_string}]
 *   beforeSubmitPrompt   : + prompt, attachments
 *   postToolUse          : + tool_name, tool_input, tool_output
 *   stop                 : + status (completed|aborted|error), loop_count
 *   subagentStop         : + subagent fields
 *
 * Cursor hook stdout contract (verified):
 *   beforeShellExecution / beforeMCPExecution / preToolUse:
 *     { "permission": "allow"|"deny"|"ask", "user_message"?, "agent_message"?, "updated_input"? }
 *   afterFileEdit / postToolUse / beforeSubmitPrompt / sessionStart / preCompact:
 *     { "additional_context"?: string }
 *   stop / subagentStop:
 *     { "followup_message"?: string }   (ruflo intentionally omits this to avoid loops)
 *
 * Exit codes (Cursor-compat): 0 = success, 2 = block (equivalent to permission:"deny").
 *
 * This handler reuses the same router/session/memory/intelligence CJS helpers that
 * the Claude Code path uses — only the stdout serialization changes.
 */

const path = require('path');
const fs = require('fs');

const helpersDir = path.join(__dirname, '..', '..', '.cursor-flow', 'helpers');

function safeRequire(modulePath) {
  try {
    if (fs.existsSync(modulePath)) {
      const origLog = console.log;
      const origError = console.error;
      console.log = () => {};
      console.error = () => {};
      try {
        const mod = require(modulePath);
        return mod;
      } finally {
        console.log = origLog;
        console.error = origError;
      }
    }
  } catch (e) {
    // silently fail — helpers are optional
  }
  return null;
}

const router = safeRequire(path.join(helpersDir, 'router.cjs'));
const session = safeRequire(path.join(helpersDir, 'session.cjs'));
const memory = safeRequire(path.join(helpersDir, 'memory.cjs'));
const intelligence = safeRequire(path.join(helpersDir, 'intelligence.cjs'));

var INTELLIGENCE_TIMEOUT_MS = 3000;

function runWithTimeout(fn, label) {
  var timer;
  var timeout = new Promise(function (resolve) {
    timer = setTimeout(function () {
      process.stderr.write('[WARN] ' + label + ' timed out after ' + INTELLIGENCE_TIMEOUT_MS + 'ms, skipping\n');
      resolve(null);
    }, INTELLIGENCE_TIMEOUT_MS);
  });
  var work = Promise.resolve().then(fn).catch(function () { return null; });
  return Promise.race([work, timeout]).then(function (result) {
    clearTimeout(timer);
    return result;
  });
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function emitAllow() {
  emit({ permission: 'allow' });
}

function emitDeny(userMessage, agentMessage) {
  var obj = { permission: 'deny' };
  if (userMessage) obj.user_message = userMessage;
  if (agentMessage) obj.agent_message = agentMessage;
  emit(obj);
}

function emitContext(context) {
  if (context && String(context).trim()) {
    emit({ additional_context: String(context) });
  } else {
    emit({});
  }
}

const [, , command, ...args] = process.argv;

async function readStdin() {
  if (process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => {
      process.stdin.removeAllListeners();
      process.stdin.pause();
      resolve(data);
    }, 500);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
    process.stdin.resume();
  });
}

async function main() {
  var safetyTimer = setTimeout(function () {
    process.stderr.write('[WARN] Cursor hook handler global timeout (5s), forcing exit\n');
    process.exit(0);
  }, 5000);
  safetyTimer.unref();

  let stdinData = '';
  try { stdinData = await readStdin(); } catch (e) { /* ignore */ }

  let hookInput = {};
  if (stdinData.trim()) {
    try { hookInput = JSON.parse(stdinData); } catch (e) { /* ignore */ }
  }

  var toolInput = hookInput.toolInput || hookInput.tool_input || {};
  var toolName = hookInput.toolName || hookInput.tool_name || '';
  var prompt = hookInput.prompt || hookInput.command || toolInput.command
    || process.env.PROMPT || process.env.TOOL_INPUT_command || '';
  var filePath = hookInput.file_path || toolInput.file_path
    || process.env.TOOL_INPUT_file_path || args[0] || '';

  var workspaceRoot = '';
  if (Array.isArray(hookInput.workspace_roots) && hookInput.workspace_roots.length > 0) {
    workspaceRoot = hookInput.workspace_roots[0];
  }
  if (!workspaceRoot) {
    workspaceRoot = process.env.CURSOR_PROJECT_DIR || process.cwd();
  }

  const handlers = {
    // beforeShellExecution — gate dangerous shell commands
    'pre-bash': () => {
      var cmd = String(hookInput.command || toolInput.command || prompt || '').toLowerCase();
      var dangerous = ['rm -rf /', 'format c:', 'del /s /q c:\\', ':(){:|:&};:'];
      for (var i = 0; i < dangerous.length; i++) {
        if (cmd.includes(dangerous[i])) {
          emitDeny(
            'Ruflo blocked a dangerous command: ' + dangerous[i],
            'A shell command was blocked by the ruflo pre-bash safety hook.'
          );
          return;
        }
      }
      emitAllow();
    },

    // afterFileEdit — record edit + inject intelligence context
    'post-edit': () => {
      if (session && session.metric) {
        try { session.metric('edits'); } catch (e) { /* no active session */ }
      }
      if (intelligence && intelligence.recordEdit) {
        try { intelligence.recordEdit(filePath); } catch (e) { /* non-fatal */ }
      }
      var ctx = '';
      if (intelligence && intelligence.getContext) {
        try { ctx = intelligence.getContext(filePath) || ''; } catch (e) { /* non-fatal */ }
      }
      emitContext(ctx || '[ruflo] Edit recorded for intelligence graph.');
    },

    // beforeSubmitPrompt — route the prompt + inject context
    'route': () => {
      var parts = [];
      if (intelligence && intelligence.getContext) {
        try {
          var ctx = intelligence.getContext(prompt);
          if (ctx) parts.push(ctx);
        } catch (e) { /* non-fatal */ }
      }
      if (router && router.routeTask) {
        try {
          var result = router.routeTask(prompt);
          parts.push('[ruflo-router] Agent: ' + result.agent
            + ' | Confidence: ' + (result.confidence * 100).toFixed(1) + '%'
            + ' | Reason: ' + result.reason);
        } catch (e) { /* non-fatal */ }
      }
      emitContext(parts.join('\n') || '[ruflo] Prompt routing complete.');
    },

    // sessionStart — restore session + init intelligence
    'session-restore': async () => {
      if (session) {
        var existing = session.restore && session.restore();
        if (!existing) session.start && session.start();
      }
      if (intelligence && intelligence.init) {
        var initResult = await runWithTimeout(function () { return intelligence.init(); }, 'intelligence.init()');
        if (initResult && initResult.nodes > 0) {
          emitContext('[ruflo] Session restored. Intelligence loaded '
            + initResult.nodes + ' patterns, ' + initResult.edges + ' edges.');
          return;
        }
      }
      emitContext('[ruflo] Session restored.');
    },

    // stop / sessionEnd — consolidate intelligence + end session
    'session-end': async () => {
      if (intelligence && intelligence.consolidate) {
        var consResult = await runWithTimeout(function () { return intelligence.consolidate(); }, 'intelligence.consolidate()');
        if (consResult && consResult.entries > 0) {
          var msg = '[ruflo] Consolidated: ' + consResult.entries + ' entries, '
            + consResult.edges + ' edges, PageRank recomputed.';
          if (session && session.end) session.end();
          emitContext(msg);
          return;
        }
      }
      if (session && session.end) session.end();
      // stop event: intentionally NO followup_message (would create auto-continue loops)
      emit({});
    },

    'pre-task': () => {
      if (session && session.metric) {
        try { session.metric('tasks'); } catch (e) { /* no active session */ }
      }
      if (router && router.routeTask && prompt) {
        try {
          var result = router.routeTask(prompt);
          emitContext('[ruflo] Task routed to: ' + result.agent + ' (confidence: ' + result.confidence + ')');
          return;
        } catch (e) { /* non-fatal */ }
      }
      emitContext('[ruflo] Task started.');
    },

    // subagentStop — record feedback, NO followup_message (avoids loops)
    'post-task': () => {
      if (intelligence && intelligence.feedback) {
        try { intelligence.feedback(true); } catch (e) { /* non-fatal */ }
      }
      emit({});
    },

    'compact-manual': () => {
      emitContext(
        '[ruflo] PreCompact Guidance: Review AGENTS.md and .cursor/agents/ for available agents, '
        + 'swarm coordination strategies, and concurrent execution rules before compacting.'
      );
    },

    'compact-auto': () => {
      emitContext(
        '[ruflo] Auto-Compact Guidance: Context window full. Before compacting, recall agents in '
        + '.cursor/agents/, swarm strategies from AGENTS.md, and the golden rule (batch operations '
        + 'in single messages). Proceeding with full agent context.'
      );
    },

    'status': () => {
      emitContext('[ruflo] Status check OK.');
    },

    'stats': () => {
      if (intelligence && intelligence.stats) {
        try { intelligence.stats(args.includes('--json')); } catch (e) { /* non-fatal */ }
      }
      emit({});
    },
  };

  if (command && handlers[command]) {
    try {
      await Promise.resolve(handlers[command]());
    } catch (e) {
      // Fail open: emit allow/empty on handler error so Cursor isn't blocked
      if (command === 'pre-bash') {
        emitAllow();
      } else {
        emit({});
      }
      process.stderr.write('[WARN] Cursor hook ' + command + ' error: ' + e.message + '\n');
    }
  } else if (command) {
    // Unknown subcommand — fail open
    emit({});
  } else {
    process.stderr.write(
      'Usage: cursor-hook-handler.cjs <route|pre-bash|post-edit|session-restore|session-end|pre-task|post-task|compact-manual|compact-auto|status|stats>\n'
    );
  }
}

if (require.main === module) {
  main().catch(function (e) {
    process.stderr.write('[WARN] Cursor hook handler error: ' + e.message + '\n');
  }).finally(function () {
    process.exit(0);
  });
}

module.exports = { runWithTimeout: runWithTimeout, INTELLIGENCE_TIMEOUT_MS: INTELLIGENCE_TIMEOUT_MS };
