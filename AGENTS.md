# Ruflo — Cursor-Native Agent Meta-Harness

> **Agent = Model + Harness.** The model writes; the harness gives it tools,
> memory, loops, swarms, and controls. **Ruflo is the harness** around Cursor —
> 100+ agents, coordinated swarms, self-learning memory, ~330 MCP tools, and
> enterprise security guardrails.

One `npx ruflo init` gives Cursor a nervous system: agents self-organize into
swarms, learn from every task, remember across sessions, and securely talk to
agents on other machines via federation. You keep writing code. Ruflo handles
the coordination.

## Cursor Integration Layout (verified)

| Surface | Path | Purpose |
|---------|------|---------|
| MCP servers | `.cursor/mcp.json` | Registers `ruflo` MCP server (~330 tools, `mcp__ruflo__*`) |
| Hooks | `.cursor/hooks.json` | Wires ruflo intelligence/memory into Cursor events |
| Hook scripts | `.cursor/hooks/*.cjs` | `cursor-hook-handler.cjs`, `cursor-memory-hook.cjs` |
| Subagents | `.cursor/agents/*.md` | 106 Cursor-native agents (5-field frontmatter) |
| Skills | `.cursor/skills/*/SKILL.md` | 38 skills auto-loaded when relevant |
| Rules | `.cursor/rules/*.mdc` | Scoped project conventions |
| Project memory | `AGENTS.md` | This file — always applied (Cursor reads natively) |
| Runtime data | `.cursor-flow/` | Sessions, intelligence graph, vector memory |

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less.
- NEVER create files unless absolutely necessary; prefer editing existing files.
- NEVER proactively create documentation files (*.md, README) unless explicitly requested.
- NEVER save working files, text/mds, or tests to the root folder.
- ALWAYS read a file before editing it.
- NEVER commit secrets, credentials, or .env files.
- Never continuously check status after spawning a swarm — wait for results.

## File Organization

- `/src` — source code
- `/tests` — test files
- `/docs` — documentation
- `/scripts` — utility scripts
- `/v3/@claude-flow/*` — ruflo workspace packages (cli, mcp, memory, hooks, guidance)
- `.cursor/` — Cursor-native integration files (agents, skills, rules, hooks, mcp)
- `.cursor-flow/` — runtime data (sessions, intelligence, memory) — gitignore this

## Concurrency: 1 MESSAGE = ALL RELATED OPERATIONS

- All operations MUST be concurrent/parallel in a single message.
- Use Cursor's Task tool for spawning subagents (defined in `.cursor/agents/`).
- Batch ALL todos, file reads/writes, memory ops, and terminal ops in single messages.

## Key Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@claude-flow/cli` | `v3/@claude-flow/cli/` | CLI entry point (26 commands, ~330 MCP tools) |
| `@claude-flow/guidance` | `v3/@claude-flow/guidance/` | Governance control plane |
| `@claude-flow/hooks` | `v3/@claude-flow/hooks/` | Hooks + 12 background workers |
| `@claude-flow/memory` | `v3/@claude-flow/memory/` | AgentDB + HNSW vector search + CursorMemoryBridge |
| `@claude-flow/mcp` | `v3/@claude-flow/mcp/` | MCP server (HTTP/WS transport) |
| `@claude-flow/security` | `v3/@claude-flow/security/` | Input validation, CVE remediation, AIDefence |

## Workflow (Use MCP Tools)

1. `memory_search(query="task keywords")` → learn from past patterns (score > 0.7 = use it)
2. `swarm_init(topology="hierarchical")` → coordination record
3. **YOU write the code / run the commands** ← this is where work happens
4. `memory_store(key="pattern-x", value="what worked", namespace="patterns")` → remember

## Daemon (12 Background Workers)

```bash
npx ruflo daemon start    # map, audit, optimize, consolidate, testgaps, ...
npx ruflo daemon status
npx ruflo daemon stop
```

Workers run local logic on a timer. Headless agent work uses `@cursor/sdk`
(requires `CURSOR_API_KEY`); the 12 workers' local logic runs without it.

## Architecture

```
User --> Cursor IDE
          |
          v
    .cursor/mcp.json --> ruflo mcp start (stdio JSON-RPC, ~330 tools)
          |
          v
    .cursor/hooks.json --> cursor-hook-handler.cjs + cursor-memory-hook.cjs
          |                 (intelligence graph, session, memory vectorization)
          v
    .cursor-flow/ (sessions, intelligence.json, memory)
          |
          v
    AgentDB + HNSW (WASM sql.js, pure-JS agentdb — Windows-native)
```

## Windows-Native

Ruflo is Windows-first. `npx ruflo init` works natively in PowerShell and cmd.
The `agentdb` memory backend is pure JavaScript (no native bindings, no build
tools required). The daemon uses `child_process.fork()` + `windowsHide`.

## License

MIT — RuvNet. See [LICENSE](LICENSE).
