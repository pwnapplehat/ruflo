<div align="center">

[![npm version](https://img.shields.io/npm/v/ruflo?label=npx%20ruflo&style=for-the-badge&logo=npm&color=cb3837)](https://www.npmjs.com/package/ruflo)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Star on GitHub](https://img.shields.io/github/stars/pwnapplehat/ruflo?style=for-the-badge&logo=github&color=gold)](https://github.com/pwnapplehat/ruflo)
[![Cursor](https://img.shields.io/badge/Cursor-Native-6366f1?style=for-the-badge)](https://cursor.com)

</div>

# Ruflo

**An agent meta-harness for Cursor.**

> **Agent = Model + Harness.** The model writes code; the harness gives it tools, memory, loops, swarms, and controls so it can actually work. **Ruflo is the harness** -- the execution layer around Cursor that adds 100+ specialized agents, coordinated swarms, self-learning memory, and enterprise security guardrails. So agents don't just run, they collaborate.

One `npx ruflo init` gives Cursor a nervous system: agents self-organize into swarms, learn from every task, and remember across sessions. You keep writing code. Ruflo handles the coordination.

```
Self-Learning Agent Architecture

User --> Cursor IDE --> Ruflo (CLI/MCP) --> Router --> Swarm --> Agents --> Memory
                          ^                                   |
                          +---- Learning Loop <-----------------+
```

---

## Quick Start

### Install

```bash
# Interactive setup wizard (all platforms)
npx ruflo@latest init wizard

# Quick non-interactive init
npx ruflo@latest init
```

**Windows (PowerShell):**

```powershell
irm https://cdn.jsdelivr.net/gh/pwnapplehat/ruflo@main/scripts/install.ps1 | iex
```

**macOS / Linux:**

```bash
curl -fsSL https://cdn.jsdelivr.net/gh/pwnapplehat/ruflo@main/scripts/install.sh | bash
```

> No `claude` or `codex` binary required. This fork is Cursor-only and works natively on Windows (PowerShell/cmd), macOS, and Linux.

### What `npx ruflo init` creates

| File / Dir | Purpose |
|---|---|
| `.cursor/mcp.json` | Registers the ruflo MCP server (307 tools, `mcp__ruflo__*`) |
| `.cursor/hooks.json` | 7 Cursor hook events (beforeShellExecution, afterFileEdit, beforeSubmitPrompt, sessionStart, stop, preCompact, subagentStop) |
| `.cursor/hooks/*.cjs` | Hook dispatchers (Cursor-verified stdin/stdout JSON contract) |
| `.cursor/agents/*.md` | 106 Cursor-native subagents (5-field frontmatter: name, description, model, readonly, is_background) |
| `.cursor/skills/*/SKILL.md` | 39 skills auto-loaded when relevant |
| `.cursor/rules/*.mdc` | 168 project rules (scoped conventions) |
| `AGENTS.md` | Project memory -- Cursor reads natively (always applied) |
| `.cursor-flow/` | Runtime data (sessions, intelligence graph, vector memory, helpers) |

After init, **reload Cursor** (`Developer: Reload Window`) to load `.cursor/mcp.json` -- the 307 MCP tools become callable from Cursor chat.

### MCP Server

The ruflo MCP server is a host-agnostic stdio JSON-RPC server (protocol `2024-11-05`). Cursor loads it automatically from `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ruflo": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "ruflo@latest", "mcp", "start"],
      "env": { "RUFLO_MODE": "v3", "RUFLO_HOST": "cursor" }
    }
  }
}
```

(On macOS/Linux: `"command": "npx", "args": ["-y", "ruflo@latest", "mcp", "start"]`.)

### Headless Background Workers (optional)

The 12 daemon workers can spawn Cursor SDK agents for headless work. Requires a Cursor API key:

```bash
# Get one from Cursor Dashboard -> Integrations
export CURSOR_API_KEY="cursor_..."   # macOS/Linux
$env:CURSOR_API_KEY = "cursor_..."   # Windows PowerShell

npx ruflo daemon start   # starts 12 background workers
```

Workers' local logic (audit, optimize, testgaps, etc.) runs without the API key -- only the optional "spawn an agent to do the work" headless path needs it.

---

## What You Get

| Capability | Description |
|---|---|
| **100+ Agents** | Specialized agents for coding, testing, security, docs, architecture |
| **Swarm Coordination** | Hierarchical, mesh, and adaptive topologies with consensus |
| **Self-Learning** | SONA neural patterns, ReasoningBank, trajectory learning |
| **Vector Memory** | HNSW-indexed AgentDB with ONNX embeddings (384-dim, all-MiniLM-L6-v2) |
| **Background Workers** | 12 auto-triggered workers (audit, optimize, testgaps, etc.) |
| **Plugin Marketplace** | 33 native plugins + 21 npm plugins |
| **Security** | AIDefence, input validation, CVE remediation, path traversal prevention |
| **MetaHarness** | Grade your agent setup (1-100), scan tool configs for security, track changes over time |

---

## How It Works

### Agent Swarm

```bash
# Initialize a swarm
npx ruflo swarm init --topology hierarchical --max-agents 8

# Spawn agents
npx ruflo agent spawn --type coordinator --name lead
npx ruflo agent spawn --type coder --name coder-1
npx ruflo agent spawn --type tester --name tester-1
npx ruflo agent spawn --type reviewer --name reviewer-1

# Start the swarm with an objective
npx ruflo swarm start --objective "Build a REST API with tests" --strategy development

# Check status
npx ruflo swarm status
```

The swarm CLI coordinates agent state. Actual execution happens via:
- **Cursor's Task tool** (interactive) -- the 106 agents in `.cursor/agents/` are available as Cursor subagents
- **@cursor/sdk** (headless background) -- the daemon's 12 workers call `Agent.prompt()` via the Cursor SDK
- **MCP tools** -- 307 tools callable from Cursor chat (`mcp__ruflo__swarm_init`, `mcp__ruflo__agent_spawn`, etc.)

### Memory (Vector Search)

```bash
# Initialize memory database
npx ruflo memory init

# Store a pattern
npx ruflo memory store --key "auth-pattern" --value "JWT with refresh tokens" --namespace patterns

# Semantic search (ONNX embeddings + HNSW)
npx ruflo memory search --query "authentication" --namespace patterns
```

Or from Cursor chat:
```
Use mcp__ruflo__memory_store to store key "auth-pattern" value "JWT with refresh tokens" namespace "patterns"
Use mcp__ruflo__memory_search to search query "authentication" namespace "patterns"
```

### Daemon (Background Workers)

```bash
npx ruflo daemon start    # 12 workers: map, audit, optimize, consolidate, testgaps, ...
npx ruflo daemon status   # see worker runs, success rates, next scheduled run
npx ruflo daemon stop
```

### Hooks

Cursor hooks fire automatically on 7 events:

| Cursor Event | What ruflo does |
|---|---|
| `beforeShellExecution` | Validates shell commands against a dangerous-command denylist |
| `afterFileEdit` | Records edits in the intelligence graph, injects context |
| `beforeSubmitPrompt` | Routes the prompt to the best agent, injects memory context |
| `sessionStart` | Restores session state, imports memory, initializes intelligence |
| `stop` | Syncs memory back to disk |
| `preCompact` | Injects agent context before context window compaction |
| `subagentStop` | Records positive feedback for the active trajectory |

---

## Cursor: With vs Without Ruflo

| Capability | Cursor Alone | + Ruflo |
|---|---|---|
| Agent Collaboration | Isolated, no shared context | Swarms with shared memory and consensus |
| Coordination | Manual orchestration | Hierarchical/mesh topologies with Raft, Byzantine, Gossip consensus |
| Memory | Session-only | HNSW vector memory with semantic search (384-dim ONNX embeddings) |
| Learning | Static behavior | SONA self-learning with pattern matching |
| Task Routing | You decide | Intelligent routing based on task complexity |
| Background Workers | None | 12 auto-triggered workers (audit, optimize, testgaps, etc.) |
| Security | Standard | AIDefence prompt-injection blocking, PII detection, CVE remediation |
| Agents | Built-in subagents | 106 specialized agents (coder, tester, reviewer, architect, security, ...) |
| MCP Tools | None | 307 tools (swarm, memory, hooks, neural, GitHub, browser, ...) |

---

## Architecture

```
User --> Cursor IDE
          |
          v
    .cursor/mcp.json --> ruflo mcp start (stdio JSON-RPC, 307 tools)
          |
          v
    .cursor/hooks.json --> cursor-hook-handler.cjs + cursor-memory-hook.cjs
          |                 (intelligence graph, session, memory vectorization)
          v
    .cursor-flow/ (sessions, intelligence.json, memory, helpers)
          |
          v
    AgentDB + HNSW (WASM sql.js, pure-JS -- Windows-native, no build tools)
```

---

## CLI Commands (26 commands, 140+ subcommands)

### Core

| Command | Subcommands | Description |
|---|---|---|
| `init` | wizard, check, skills, hooks, upgrade | Project initialization |
| `agent` | spawn, list, status, stop, metrics, pool, health, logs | Agent lifecycle |
| `swarm` | init, start, status, stop, scale, coordinate | Multi-agent swarm coordination |
| `memory` | init, store, retrieve, search, list, delete, stats, configure | AgentDB vector memory |
| `mcp` | start, stop, status, tools, exec | MCP server management |
| `task` | create, list, status, assign, complete, cancel | Task lifecycle |
| `session` | save, restore, list, delete, export, import | Session state |
| `daemon` | start, stop, status, trigger | Background worker daemon |
| `hooks` | route, pre-task, post-task, pre-edit, post-edit, worker | Self-learning hooks |
| `doctor` | --fix | System diagnostics |
| `status` | --watch | System status monitoring |

### Examples

```bash
npx ruflo init                          # Initialize project
npx ruflo swarm init --topology hierarchical --max-agents 8
npx ruflo agent spawn --type coder --name my-coder
npx ruflo memory search --query "auth patterns"
npx ruflo daemon start                  # Start 12 background workers
npx ruflo doctor                        # System health check
npx ruflo security scan --depth full    # Security scan
```

---

## Available Agents (106 types)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Architecture & Design
`system-architect`, `security-architect`, `backend-dev`, `mobile-dev`, `api-docs`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`

### Performance & Optimization
`perf-analyzer`, `performance-engineer`, `performance-benchmarker`, `performance-monitor`

### GitHub & Repository
`pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`

### Security
`security-auditor`, `injection-analyst`, `pii-detector`, `aidefence-guardian`

### Testing & Validation
`tdd-london-swarm`, `production-validator`, `test-architect`

### And 70+ more...

All 106 agents are in `.cursor/agents/*.md` with Cursor's native 5-field frontmatter (`name`, `description`, `model`, `readonly`, `is_background`). Cursor loads them automatically.

---

## Plugins (33 native + 21 npm)

<details>
<summary><strong>All 35 plugins</strong></summary>

### Core & Orchestration
| Plugin | What it does |
|---|---|
| **ruflo-core** | Foundation -- server, health checks, plugin discovery |
| **ruflo-swarm** | Coordinate multiple agents as a team |
| **ruflo-autopilot** | Let agents run autonomously in a loop |
| **ruflo-loop-workers** | Schedule background tasks on a timer |
| **ruflo-workflows** | Reusable multi-step task templates |
| **ruflo-federation** | Agents on different machines collaborate securely |

### Memory & Knowledge
| Plugin | What it does |
|---|---|
| **ruflo-agentdb** | Fast vector database for agent memory |
| **ruflo-rag-memory** | Smart retrieval -- hybrid search, graph hops, diversity ranking |
| **ruflo-rvf** | Save and restore agent memory across sessions |
| **ruflo-ruvector** | GPU-accelerated search, Graph RAG, 103 tools |
| **ruflo-knowledge-graph** | Build and traverse entity relationship maps |

### Intelligence & Learning
| Plugin | What it does |
|---|---|
| **ruflo-intelligence** | Agents learn from past successes and get smarter |
| **ruflo-graph-intelligence** | Sublinear graph reasoning -- PageRank, delta updates |
| **ruflo-daa** | Dynamic agent behavior and cognitive patterns |
| **ruflo-ruvllm** | Run local LLMs (Ollama, etc.) with smart routing |
| **ruflo-goals** | Break big goals into plans and track progress |

### Code Quality & Testing
| Plugin | What it does |
|---|---|
| **ruflo-testgen** | Find missing tests and generate them automatically |
| **ruflo-browser** | Automate browser testing with Playwright |
| **ruflo-jujutsu** | Analyze git diffs, score risk, suggest reviewers |
| **ruflo-docs** | Generate and maintain documentation automatically |

### Security & Compliance
| Plugin | What it does |
|---|---|
| **ruflo-security-audit** | Scan for vulnerabilities and CVEs |
| **ruflo-aidefence** | Block prompt injection, detect PII, safety scanning |

### Architecture & Methodology
| Plugin | What it does |
|---|---|
| **ruflo-adr** | Track architecture decisions with a living record |
| **ruflo-ddd** | Scaffold domain-driven design |
| **ruflo-sparc** | Guided 5-phase development methodology with quality gates |
| **ruflo-metaharness** | Grade your agent setup, scan tool configs for security |
| **ruflo-arena** | Competitive ruliology -- pit agent strategies against each other |

### DevOps & Observability
| Plugin | What it does |
|---|---|
| **ruflo-migrations** | Manage database schema changes safely |
| **ruflo-observability** | Structured logs, traces, and metrics in one place |
| **ruflo-cost-tracker** | Track token usage, set budgets, get cost alerts |

### Extensibility
| Plugin | What it does |
|---|---|
| **ruflo-agent** | Run agents -- local WASM sandbox + cloud managed agents |
| **ruflo-plugin-creator** | Scaffold, validate, and publish your own plugins |

### Domain-Specific
| Plugin | What it does |
|---|---|
| **ruflo-iot-cognitum** | IoT device management -- trust scoring, anomaly detection |
| **ruflo-neural-trader** | AI trading with 4 agents, backtesting, 112+ tools |
| **ruflo-market-data** | Ingest market data, vectorize OHLCV, detect patterns |

</details>

---

## Windows-Native

Ruflo is Windows-first:
- `npx ruflo init` works natively in PowerShell and cmd (no Git-Bash/WSL needed)
- `scripts/install.ps1` -- native PowerShell installer
- `agentdb` memory backend is pure JavaScript (no native bindings, no build tools required)
- Daemon uses `child_process.fork()` + `windowsHide` (no `nohup`/`setsid`)
- All hook dispatchers are Node.js CJS (no bash scripts)
- 29-assertion smoke test verifies Windows-native hook execution

---

## Documentation

| Doc | When to read it |
|---|---|
| **[User Guide](docs/USERGUIDE.md)** | Daily reference -- every command, every config flag |
| **[Status](docs/STATUS.md)** | See what currently works -- capability counts, test baselines |
| **[MetaHarness Guide](docs/metaharness-user-guide.md)** | Grade your agent setup, scan tool configs for security |

---

## Support

| Resource | Link |
|---|---|
| Documentation | [User Guide](docs/USERGUIDE.md) |
| Issues & Bugs | [GitHub Issues](https://github.com/pwnapplehat/ruflo/issues) |

## License

MIT
