/**
 * Cursor Init Executor
 *
 * Performs the Cursor-native `npx ruflo init` — writes the `.cursor/` tree
 * (mcp.json, hooks.json, agents, skills, rules) + AGENTS.md + .cursor-flow/
 * runtime dir, using the verified Cursor hook/MCP/agents contracts.
 *
 * This is the Cursor-fork replacement for the Claude-Code-specific
 * executeInit() in executor.ts. When `options.host === 'cursor'`, the init
 * command dispatches here instead of to the .claude/ tree writer.
 *
 * All output paths and schemas are verified against cursor.com/docs
 * (2026-06-29): .cursor/mcp.json, .cursor/hooks.json v1, .cursor/agents/.md
 * (5-field frontmatter), .cursor/skills/ SKILL.md, AGENTS.md.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { generateCursorHooksJson, generateCursorMcpJson, generateAgentsMd } from './cursor-settings-generator.js';
import type { InitOptions, InitResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the ruflo template directory containing the shipped .cursor/ tree
 * (agents, skills, hooks, mcp.json, hooks.json). This lives relative to the
 * CLI package root: v3/@claude-flow/cli/.cursor/ OR the repo root .cursor/.
 */
function resolveTemplateDir(): string {
  // The .cursor/ template ships inside the @claude-flow/cli package. From
  // the compiled dist (dist/src/init/), the package root is 3 levels up;
  // from the tsx source (src/init/), it's 2 levels up. Check both, plus a
  // few extra depths for safety, and the repo root for dev clones.
  const candidates = [
    path.resolve(__dirname, '..', '..', '.cursor'),        // src/init -> cli/.cursor (source)
    path.resolve(__dirname, '..', '..', '..', '.cursor'),   // dist/src/init -> cli/.cursor (built)
    path.resolve(__dirname, '..', '..', '..', '..', '..', '.cursor'), // repo root .cursor (dev)
    path.resolve(__dirname, 'templates', 'cursor'),          // packaged template fallback
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand;
  }
  return '';
}

function copyDir(src: string, dst: string): { files: string[] } {
  const files: string[] = [];
  if (!fs.existsSync(src)) return { files };
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      const sub = copyDir(s, d);
      files.push(...sub.files);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
      files.push(d);
    }
  }
  return { files };
}

function safeWrite(file: string, content: string, force: boolean): boolean {
  if (fs.existsSync(file) && !force) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf-8');
  return true;
}

/**
 * Execute the Cursor-native init. Writes the full .cursor/ tree + AGENTS.md +
 * .cursor-flow/ runtime dir into options.targetDir.
 */
export async function executeCursorInit(options: InitOptions): Promise<InitResult> {
  const targetDir = options.targetDir;
  const templateDir = resolveTemplateDir();

  const result: InitResult = {
    success: true,
    platform: { os: process.platform, shell: process.platform === 'win32' ? 'powershell' : 'bash' } as any,
    created: { directories: [], files: [] },
    skipped: [],
    errors: [],
    summary: { skillsCount: 0, commandsCount: 0, agentsCount: 0, hooksEnabled: 0 },
  };

  try {
    // 1. Create directory structure
    const dirs = [
      '.cursor',
      '.cursor/hooks',
      '.cursor/agents',
      '.cursor/rules',
      '.cursor/skills',
      '.cursor-flow',
      '.cursor-flow/data',
      '.cursor-flow/sessions',
      '.cursor-flow/memory',
    ];
    for (const d of dirs) {
      const full = path.join(targetDir, d);
      if (!fs.existsSync(full)) {
        fs.mkdirSync(full, { recursive: true });
        result.created.directories.push(d);
      }
    }

    // 2. Write .cursor/mcp.json
    if (options.components.mcp) {
      const mcpFile = path.join(targetDir, '.cursor', 'mcp.json');
      if (safeWrite(mcpFile, JSON.stringify(generateCursorMcpJson(options), null, 2) + '\n', options.force)) {
        result.created.files.push('.cursor/mcp.json');
      } else {
        result.skipped.push('.cursor/mcp.json (exists)');
      }
    }

    // 3. Write .cursor/hooks.json
    if (options.components.settings) {
      const hooksFile = path.join(targetDir, '.cursor', 'hooks.json');
      if (safeWrite(hooksFile, JSON.stringify(generateCursorHooksJson(options), null, 2) + '\n', options.force)) {
        result.created.files.push('.cursor/hooks.json');
        result.summary.hooksEnabled = 7; // 7 Cursor event mappings
      } else {
        result.skipped.push('.cursor/hooks.json (exists)');
      }
    }

    // 4. Copy hook dispatchers to .cursor/hooks/
    if (options.components.helpers) {
      const hookScripts = ['cursor-hook-handler.cjs', 'cursor-memory-hook.cjs'];
      for (const script of hookScripts) {
        const src = templateDir ? path.join(templateDir, 'hooks', script) : '';
        const dst = path.join(targetDir, '.cursor', 'hooks', script);
        if (src && fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
          result.created.files.push('.cursor/hooks/' + script);
        } else {
          safeWrite(dst, `#!/usr/bin/env node\n// ${script} — install ruflo (npm install ruflo) to populate this file.\nprocess.exit(0);\n`, options.force);
          result.created.files.push('.cursor/hooks/' + script + ' (stub)');
        }
      }

      // 4b. Copy CJS helper modules (router, session, memory, intelligence) to
      // .cursor-flow/helpers/ — the hook dispatchers require() these at runtime
      // for routing, session tracking, and the intelligence graph.
      const helperModules = ['router.cjs', 'session.cjs', 'memory.cjs', 'intelligence.cjs', 'statusline.cjs'];
      const helpersDst = path.join(targetDir, '.cursor-flow', 'helpers');
      fs.mkdirSync(helpersDst, { recursive: true });
      for (const mod of helperModules) {
        const src = templateDir ? path.join(templateDir, 'helpers', mod) : '';
        const dst = path.join(helpersDst, mod);
        if (src && fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
        }
      }
      result.created.files.push('.cursor-flow/helpers/ (' + helperModules.length + ' CJS modules)');
    }

    // 5. Copy agents to .cursor/agents/
    if (options.components.agents) {
      const agentsSrc = templateDir ? path.join(templateDir, 'agents') : '';
      if (agentsSrc && fs.existsSync(agentsSrc)) {
        const copied = copyDir(agentsSrc, path.join(targetDir, '.cursor', 'agents'));
        result.summary.agentsCount = copied.files.filter((f) => f.endsWith('.md')).length;
        result.created.files.push('.cursor/agents/ (' + result.summary.agentsCount + ' files)');
      }
    }

    // 6. Copy skills to .cursor/skills/
    if (options.components.skills) {
      const skillsSrc = templateDir ? path.join(templateDir, 'skills') : '';
      if (skillsSrc && fs.existsSync(skillsSrc)) {
        const copied = copyDir(skillsSrc, path.join(targetDir, '.cursor', 'skills'));
        result.summary.skillsCount = copied.files.filter((f) => f.endsWith('SKILL.md')).length;
        result.created.files.push('.cursor/skills/ (' + result.summary.skillsCount + ' SKILL.md files)');
      }
    }

    // 6b. Copy rules to .cursor/rules/ (slash commands converted to .mdc)
    if (options.components.commands) {
      const rulesSrc = templateDir ? path.join(templateDir, 'rules') : '';
      if (rulesSrc && fs.existsSync(rulesSrc)) {
        const copied = copyDir(rulesSrc, path.join(targetDir, '.cursor', 'rules'));
        result.summary.commandsCount = copied.files.filter((f) => f.endsWith('.mdc')).length;
        result.created.files.push('.cursor/rules/ (' + result.summary.commandsCount + ' .mdc files)');
      }
    }

    // 7. Write AGENTS.md (Cursor reads it natively, always applied)
    if (options.components.settings) {
      const agentsMd = path.join(targetDir, 'AGENTS.md');
      if (safeWrite(agentsMd, generateAgentsMd(options), options.force)) {
        result.created.files.push('AGENTS.md');
      } else {
        result.skipped.push('AGENTS.md (exists)');
      }
    }

    // 8. Create .gitignore entries for runtime data
    const gitignore = path.join(targetDir, '.gitignore');
    const entries = ['.cursor-flow/', '.cursor/sessions/'];
    let existing = '';
    if (fs.existsSync(gitignore)) existing = fs.readFileSync(gitignore, 'utf-8');
    let added: string[] = [];
    for (const e of entries) {
      if (!existing.includes(e)) added.push(e);
    }
    if (added.length > 0) {
      fs.appendFileSync(gitignore, '\n# Ruflo runtime data\n' + added.join('\n') + '\n');
      result.created.files.push('.gitignore (ruflo entries)');
    }

    result.success = result.errors.length === 0;
  } catch (e) {
    result.success = false;
    result.errors.push((e as Error).message);
  }

  return result;
}

export default executeCursorInit;
