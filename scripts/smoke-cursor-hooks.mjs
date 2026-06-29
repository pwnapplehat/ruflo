#!/usr/bin/env node
/**
 * Cursor Hook Contract Smoke Test
 *
 * Verifies that .cursor/hooks/cursor-hook-handler.cjs and
 * .cursor/hooks/cursor-memory-hook.cjs emit Cursor's verified stdout JSON
 * contract when fed simulated Cursor stdin payloads.
 *
 * Verified against cursor.com/docs/hooks (2026-06-29):
 *   beforeShellExecution -> { permission: "allow"|"deny", user_message?, agent_message? }
 *   afterFileEdit        -> { additional_context? }
 *   beforeSubmitPrompt   -> { additional_context? }
 *   sessionStart         -> { additional_context? }
 *   stop                 -> { followup_message? }   (ruflo omits -> {})
 *   subagentStop         -> { followup_message? }   (ruflo omits -> {})
 *
 * Run: node scripts/smoke-cursor-hooks.mjs
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HANDLER = join(ROOT, '.cursor', 'hooks', 'cursor-hook-handler.cjs');
const MEMHOOK = join(ROOT, '.cursor', 'hooks', 'cursor-memory-hook.cjs');

let passed = 0;
let failed = 0;
const failures = [];

function runHook(script, subcommand, stdinPayload) {
  const result = spawnSync('node', [script, subcommand], {
    input: JSON.stringify(stdinPayload),
    encoding: 'utf-8',
    timeout: 8000,
    cwd: ROOT,
  });
  const stdout = (result.stdout || '').trim();
  let parsed = null;
  try { parsed = stdout ? JSON.parse(stdout) : null; } catch (e) { /* keep null */ }
  return { exitCode: result.status, stdout, parsed, stderr: result.stderr || '' };
}

function assert(condition, label, detail) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label + (detail ? ': ' + detail : ''));
  }
}

function hasOnlyKeys(obj, allowed) {
  if (!obj || typeof obj !== 'object') return false;
  const keys = Object.keys(obj);
  return keys.every((k) => allowed.includes(k));
}

// === beforeShellExecution: allow path ===
{
  const r = runHook(HANDLER, 'pre-bash', {
    hook_event_name: 'beforeShellExecution',
    command: 'git status',
    workspace_roots: [ROOT],
  });
  assert(r.exitCode === 0, 'pre-bash allow exit 0', `exit=${r.exitCode}`);
  assert(r.parsed && r.parsed.permission === 'allow', 'pre-bash allow emits permission:allow', r.stdout);
  assert(hasOnlyKeys(r.parsed, ['permission']), 'pre-bash allow only permission key', r.stdout);
}

// === beforeShellExecution: deny path ===
{
  const r = runHook(HANDLER, 'pre-bash', {
    hook_event_name: 'beforeShellExecution',
    command: 'rm -rf /',
    workspace_roots: [ROOT],
  });
  assert(r.exitCode === 0, 'pre-bash deny exit 0 (not 2)', `exit=${r.exitCode}`);
  assert(r.parsed && r.parsed.permission === 'deny', 'pre-bash deny emits permission:deny', r.stdout);
  assert(typeof r.parsed.user_message === 'string' && r.parsed.user_message.length > 0, 'pre-bash deny has user_message', r.stdout);
  assert(hasOnlyKeys(r.parsed, ['permission', 'user_message', 'agent_message']), 'pre-bash deny only allowed keys', r.stdout);
}

// === afterFileEdit ===
{
  const r = runHook(HANDLER, 'post-edit', {
    hook_event_name: 'afterFileEdit',
    file_path: 'src/test.ts',
    edits: [{ old_string: 'a', new_string: 'b' }],
    workspace_roots: [ROOT],
  });
  assert(r.exitCode === 0, 'post-edit exit 0', `exit=${r.exitCode}`);
  assert(r.parsed && typeof r.parsed.additional_context === 'string', 'post-edit emits additional_context', r.stdout);
  assert(hasOnlyKeys(r.parsed, ['additional_context']), 'post-edit only additional_context key', r.stdout);
}

// === beforeSubmitPrompt (route) ===
{
  const r = runHook(HANDLER, 'route', {
    hook_event_name: 'beforeSubmitPrompt',
    prompt: 'fix the auth bug',
    attachments: [],
    workspace_roots: [ROOT],
  });
  assert(r.exitCode === 0, 'route exit 0', `exit=${r.exitCode}`);
  assert(r.parsed && typeof r.parsed.additional_context === 'string', 'route emits additional_context', r.stdout);
}

// === sessionStart (session-restore) ===
{
  const r = runHook(HANDLER, 'session-restore', {
    hook_event_name: 'sessionStart',
    workspace_roots: [ROOT],
  });
  assert(r.exitCode === 0, 'session-restore exit 0', `exit=${r.exitCode}`);
  assert(r.parsed && typeof r.parsed === 'object', 'session-restore emits JSON', r.stdout);
}

// === stop (memory sync) — MUST NOT emit followup_message ===
{
  const r = runHook(MEMHOOK, 'sync', {
    hook_event_name: 'stop',
    status: 'completed',
    loop_count: 0,
    workspace_roots: [ROOT],
  });
  assert(r.exitCode === 0, 'stop/sync exit 0', `exit=${r.exitCode}`);
  assert(r.parsed !== null, 'stop/sync emits JSON', r.stdout);
  assert(r.parsed && !('followup_message' in r.parsed), 'stop/sync NO followup_message (avoids loops)', r.stdout);
}

// === subagentStop (post-task) — MUST NOT emit followup_message ===
{
  const r = runHook(HANDLER, 'post-task', {
    hook_event_name: 'subagentStop',
    workspace_roots: [ROOT],
  });
  assert(r.exitCode === 0, 'post-task exit 0', `exit=${r.exitCode}`);
  assert(r.parsed !== null, 'post-task emits JSON', r.stdout);
  assert(r.parsed && !('followup_message' in r.parsed), 'post-task NO followup_message (avoids loops)', r.stdout);
}

// === sessionStart (memory import) ===
{
  const r = runHook(MEMHOOK, 'import', {
    hook_event_name: 'sessionStart',
    workspace_roots: [ROOT],
  });
  assert(r.exitCode === 0, 'memory import exit 0', `exit=${r.exitCode}`);
  assert(r.parsed && typeof r.parsed === 'object', 'memory import emits JSON', r.stdout);
}

// === preCompact ===
{
  const r = runHook(HANDLER, 'compact-manual', {
    hook_event_name: 'preCompact',
    workspace_roots: [ROOT],
  });
  assert(r.exitCode === 0, 'compact-manual exit 0', `exit=${r.exitCode}`);
  assert(r.parsed && typeof r.parsed.additional_context === 'string', 'compact-manual emits additional_context', r.stdout);
}

// === Windows-nativeness: hook scripts must not invoke /bin/bash or .sh ===
{
  const handlerSrc = readFileSync(HANDLER, 'utf-8');
  const memSrc = readFileSync(MEMHOOK, 'utf-8');
  assert(!handlerSrc.includes('/bin/bash'), 'handler no /bin/bash', 'found /bin/bash in cursor-hook-handler.cjs');
  assert(!handlerSrc.includes('.sh'), 'handler no .sh references', 'found .sh in cursor-hook-handler.cjs');
  assert(!memSrc.includes('/bin/bash'), 'memory hook no /bin/bash', 'found /bin/bash in cursor-memory-hook.cjs');
  assert(handlerSrc.includes('#!/usr/bin/env node'), 'handler has node shebang', 'missing node shebang');
  assert(memSrc.includes('#!/usr/bin/env node'), 'memory hook has node shebang', 'missing node shebang');
}

// === Summary ===
const total = passed + failed;
process.stdout.write(
  `\nCursor hook smoke test: ${passed}/${total} passed, ${failed} failed.\n`
);
if (failures.length > 0) {
  process.stderr.write('Failures:\n');
  for (const f of failures) process.stderr.write('  - ' + f + '\n');
  process.exit(1);
}
process.stdout.write('All Cursor hook contract assertions passed.\n');
