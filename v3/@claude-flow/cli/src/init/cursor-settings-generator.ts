/**
 * Cursor Settings Generator
 *
 * Emits `.cursor/hooks.json` (Cursor's verified hook schema, version 1) and
 * `.cursor/mcp.json` for the ruflo Cursor-native init path.
 *
 * This replaces settings-generator.ts for the Cursor target. The Claude Code
 * `settings.json` hook object used event names like PreToolUse/PostToolUse with
 * `$CLAUDE_PROJECT_DIR` env-var path probes. Cursor uses different event names
 * (beforeShellExecution, afterFileEdit, beforeSubmitPrompt, sessionStart, stop,
 * preCompact, subagentStop), runs hooks from the project root with relative
 * paths (no env-var probe needed), and exchanges JSON over stdin/stdout with a
 * verified per-event schema.
 *
 * All mappings below are verified against cursor.com/docs/hooks (2026-06-29).
 */

import type { InitOptions } from './types.js';

const IS_WINDOWS = process.platform === 'win32';

/**
 * Build a Cursor hook command. Cursor runs project hooks from the project root
 * with relative paths, so no `$CLAUDE_PROJECT_DIR`/`$HOME` probe is needed
 * (unlike the Claude Code path in settings-generator.ts:191-206).
 */
function cursorHookCmd(subcommand: string): string {
  return `node .cursor/hooks/cursor-hook-handler.cjs ${subcommand}`;
}

function cursorMemoryCmd(subcommand: string): string {
  return `node .cursor/hooks/cursor-memory-hook.cjs ${subcommand}`;
}

export interface CursorHooksJson {
  version: 1;
  hooks: Record<string, Array<{
    command: string;
    timeout?: number;
    failClosed?: boolean;
    matcher?: string;
    loop_limit?: number | null;
  }>>;
}

/**
 * Generate the `.cursor/hooks.json` object mapping ruflo's 8 hook events to
 * Cursor's verified event names.
 */
export function generateCursorHooksJson(_options: InitOptions): CursorHooksJson {
  return {
    version: 1,
    hooks: {
      // PreToolUse(Bash) -> beforeShellExecution
      beforeShellExecution: [
        {
          command: cursorHookCmd('pre-bash'),
          timeout: 5,
          failClosed: false,
        },
      ],
      // PostToolUse(Write|Edit) -> afterFileEdit
      afterFileEdit: [
        {
          command: cursorHookCmd('post-edit'),
          timeout: 10,
          failClosed: false,
        },
      ],
      // UserPromptSubmit -> beforeSubmitPrompt
      beforeSubmitPrompt: [
        {
          command: cursorHookCmd('route'),
          timeout: 10,
          failClosed: false,
        },
      ],
      // SessionStart -> sessionStart (Cursor fires this on session begin;
      // ruflo chains session-restore + memory import)
      sessionStart: [
        {
          command: cursorHookCmd('session-restore'),
          timeout: 15,
          failClosed: false,
        },
        {
          command: cursorMemoryCmd('import'),
          timeout: 8,
          failClosed: false,
        },
      ],
      // Stop -> stop (memory sync; intentionally NO followup_message to avoid loops)
      // NOTE: Cursor's `stop` fires on every agent turn completion, not just
      // session end. We run only the lightweight memory sync here — the heavy
      // intelligence consolidation (PageRank recompute) is handled by the
      // daemon's periodic `consolidate` worker, not on every stop.
      stop: [
        {
          command: cursorMemoryCmd('sync'),
          timeout: 10,
          failClosed: false,
          loop_limit: null,
        },
      ],
      // PreCompact -> preCompact
      preCompact: [
        {
          command: cursorHookCmd('compact-manual'),
          timeout: 5,
          failClosed: false,
        },
      ],
      // SubagentStop -> subagentStop (post-task feedback; NO followup_message)
      subagentStop: [
        {
          command: cursorHookCmd('post-task'),
          timeout: 5,
          failClosed: false,
          loop_limit: null,
        },
      ],
    },
  };
}

export interface CursorMcpJson {
  mcpServers: Record<string, {
    command: string;
    args: string[];
    env?: Record<string, string>;
  }>;
}

/**
 * Generate `.cursor/mcp.json`. Schema is identical to Claude Code's `.mcp.json`
 * (verified): { mcpServers: { name: { command, args, env } } }.
 * On Windows, wrap npx in `cmd /c` (verified pattern from mcp-generator.ts:26-42).
 */
export function generateCursorMcpJson(_options: InitOptions): CursorMcpJson {
  if (IS_WINDOWS) {
    return {
      mcpServers: {
        ruflo: {
          command: 'cmd',
          args: ['/c', 'npx', '-y', 'ruflo@latest', 'mcp', 'start'],
          env: {
            RUFLO_MODE: 'v3',
            RUFLO_HOST: 'cursor',
            CLAUDE_FLOW_HOOKS_ENABLED: 'true',
          },
        },
      },
    };
  }
  return {
    mcpServers: {
      ruflo: {
        command: 'npx',
        args: ['-y', 'ruflo@latest', 'mcp', 'start'],
        env: {
          RUFLO_MODE: 'v3',
          RUFLO_HOST: 'cursor',
          CLAUDE_FLOW_HOOKS_ENABLED: 'true',
        },
      },
    },
  };
}

/**
 * Generate the AGENTS.md content (Cursor reads AGENTS.md natively, same as
 * CLAUDE.md — verified against cursor.com/docs/rules). This is a lean pointer
 * file; the rich project memory lives in .cursor/rules/*.mdc.
 */
export function generateAgentsMd(_options: InitOptions): string {
  return [
    '# Ruflo — Cursor-Native Agent Meta-Harness',
    '',
    '> **Agent = Model + Harness.** Ruflo is the harness around Cursor: 100+ agents,',
    '> coordinated swarms, self-learning memory, and ~330 MCP tools. You keep writing',
    '> code; Ruflo handles the coordination.',
    '',
    '## Quick Reference',
    '',
    '- **MCP tools**: registered in `.cursor/mcp.json` — call `mcp__ruflo__*` tools directly.',
    '- **Agents**: defined in `.cursor/agents/*.md` — invoke via the Task tool or @mention.',
    '- **Skills**: live in `.cursor/skills/*/SKILL.md` — auto-loaded when relevant.',
    '- **Rules**: `.cursor/rules/*.mdc` — scoped project conventions.',
    '- **Hooks**: `.cursor/hooks.json` wires ruflo intelligence/memory into Cursor events.',
    '- **Runtime data**: `.cursor-flow/` (sessions, intelligence, memory).',
    '',
    '## Workflow',
    '',
    '1. `memory_search(query="task keywords")` → learn from past patterns (score > 0.7 = use it)',
    '2. `swarm_init(topology="hierarchical")` → coordination record',
    '3. **YOU write the code / run the commands**',
    '4. `memory_store(key="pattern-x", value="what worked", namespace="patterns")` → remember',
    '',
    '## Key Rules',
    '',
    '- Do what is asked; nothing more, nothing less.',
    '- ALWAYS read a file before editing it.',
    '- NEVER create files unless absolutely necessary; prefer editing existing files.',
    '- NEVER save working files to the root folder.',
    '- Use ruflo commands to TRACK progress; YOU execute the actual work.',
    '',
    '## Daemon',
    '',
    '```bash',
    'npx ruflo daemon start   # 12 background workers (audit, optimize, testgaps, ...)',
    'npx ruflo daemon status',
    '```',
    '',
    'See `.cursor/rules/` for detailed conventions.',
    '',
  ].join('\n');
}
