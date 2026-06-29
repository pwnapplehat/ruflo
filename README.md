<div align="center">

[![Ruflo Banner](ruflo/assets/ruflo-small.jpeg)](https://cognitum.one/agentic-engineering)

<!-- Try Ruflo Ã¢â‚¬â€ the 4 badges first-time visitors actually act on -->
[![Try the UI Beta Ã¢â‚¬â€ flo.ruv.io](https://img.shields.io/badge/_Try_the_UI_Beta-flo.ruv.io-6366f1?style=for-the-badge&logoColor=white&logo=svelte)](https://flo.ruv.io/)
[![npm version (ruflo)](https://img.shields.io/npm/v/ruflo?label=npx%20ruflo&style=for-the-badge&logo=npm&color=cb3837)](https://www.npmjs.com/package/ruflo)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Star on GitHub](https://img.shields.io/github/stars/pwnapplehat/ruflo?style=for-the-badge&logo=github&color=gold)](https://github.com/pwnapplehat/ruflo)

<!-- Ecosystem strip (collapsed visually with flat-square) -->
[![Goal Planner](https://img.shields.io/badge/_Goal_Planner-goal.ruv.io-8b5cf6?style=flat-square&logoColor=white&logo=react)](https://goal.ruv.io/)
[![Live Agents](https://img.shields.io/badge/_Live_Agents-goal.ruv.io%2Fagents-10b981?style=flat-square&logoColor=white&logo=react)](https://goal.ruv.io/agents)
[![Ã°Å¸â€¢Â¸Ã¯Â¸Â RuVector Agentic DB](https://img.shields.io/badge/RuVector_Agentic-DB-06b6d4?style=flat-square&logoColor=white&logo=graphql)](https://github.com/ruvnet/ruvector)
[![Ecosystem downloads](https://img.shields.io/badge/ecosystem%20downloads-8.1M%2B-blue?style=flat-square&logo=npm)](https://github.com/pwnapplehat/ruflo/blob/main/data/clone-data.proof.json)
[![Git clones (14d)](https://img.shields.io/badge/git%20clones%2014d-106k-blueviolet?style=flat-square&logo=github)](https://github.com/pwnapplehat/ruflo/blob/main/data/clone-data.ledger.json)
[![Cursor](https://img.shields.io/badge/Cursor-Native-6366f1?style=flat-square&logoColor=white&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI%2BPHBhdGggZD0iTTkgMTFMMTUgNUw5IDkiLz48L3N2Zz4%3D)](https://cursor.com)

# Ruflo

**An agent meta-harness for Cursor.**

</div>

> **Agent = Model + Harness.** The model writes; the harness gives it tools, memory, loops, sandboxes, and controls so it can actually work. **Ruflo is the harness** Ã¢â‚¬â€ the execution layer around Cursor that adds 100+ specialized agents, coordinated swarms, self-learning memory, federated comms across machines, and enterprise security guardrails. So agents don't just run, they collaborate.
>
> This is the **Cursor-native fork** (pwnapplehat/ruflo). `npx ruflo init` writes the `.cursor/` tree (`.cursor/mcp.json`, `.cursor/hooks.json`, `.cursor/agents/`, `.cursor/skills/`, `.cursor/rules/`) + `AGENTS.md` using Cursor's verified hook/MCP/agents contracts. Claude Code and Codex integration has been fully removed.

One `npx ruflo init` gives Cursor a nervous system: agents self-organize into swarms, learn from every task, remember across sessions, and Ã¢â‚¬â€ with federation Ã¢â‚¬â€ securely talk to agents on other machines without leaking data. You keep writing code. Ruflo handles the coordination.

```
Self-Learning / Self-Optimizing Agent Architecture

User --> Cursor IDE --> Ruflo (CLI/MCP) --> Router --> Swarm --> Agents --> Memory --> LLM Providers
                          ^                                   |
                          +---- Learning Loop <-----------------+
```

> **New to Ruflo?** You don't need to learn 306 MCP tools or 26 CLI commands. After `init`, just use Cursor normally Ã¢â‚¬â€ the hooks system automatically routes tasks, learns from successful patterns, and coordinates agents in the background.

<details>
<summary><strong>Ã°Å¸â€œâ€“ Background Ã¢â‚¬â€ where the name comes from</strong></summary>

> Claude Flow is now Ruflo Ã¢â‚¬â€ named by [`rUv`](https://ruv.io), who loves Rust, flow states, and building things that feel inevitable. The "Ru" is the rUv. The "flo" is working until 3am. Underneath, powered by [`Cognitum.One`](https://cognitum.one/?RuFlo) agentic architecture, running a supercharged Rust-based AI engine, embeddings, memory, and plugin system.

</details>

---

![Ruflo Plugins](./ruflo-plugins.gif)

## Quick Start

### Install (Windows / macOS / Linux Ã¢â‚¬â€ native PowerShell, cmd, bash, zsh)

```bash
# Interactive setup wizard Ã¢â‚¬â€ runs natively on every platform (no Git-Bash/WSL needed)
npx ruflo@latest init wizard

# Quick non-interactive init
npx ruflo@latest init
```

**Windows (PowerShell / cmd) one-line installer:**

```powershell
irm https://cdn.jsdelivr.net/gh/pwnapplehat/ruflo@main/scripts/install.ps1 | iex
```

**macOS / Linux / WSL / Git-Bash:**

```bash
curl -fsSL https://cdn.jsdelivr.net/gh/pwnapplehat/ruflo@main/scripts/install.sh | bash
```

> The `npx ruflo init` line works natively in PowerShell and cmd. No `claude` or `codex` binary required Ã¢â‚¬â€ this fork is Cursor-only.

### What `npx ruflo init` creates (Cursor-native)

| File / Dir | Purpose |
|---|---|
| `.cursor/mcp.json` | Registers the ruflo MCP server (307 tools, `mcp__ruflo__*`) |
| `.cursor/hooks.json` | 7 Cursor hook event mappings (beforeShellExecution, afterFileEdit, beforeSubmitPrompt, sessionStart, stop, preCompact, subagentStop) |
| `.cursor/hooks/*.cjs` | Hook dispatchers (Cursor-verified stdin/stdout JSON contract) |
| `.cursor/agents/*.md` | 106 Cursor-native subagents (5-field frontmatter: name, description, model, readonly, is_background) |
| `.cursor/skills/*/SKILL.md` | 39 skills auto-loaded when relevant |
| `.cursor/rules/*.mdc` | 168 project rules (scoped conventions) |
| `AGENTS.md` | Project memory Ã¢â‚¬â€ Cursor reads natively (always applied) |
| `.cursor-flow/` | Runtime data (sessions, intelligence graph, vector memory, helpers) |

After init, **reload Cursor** (`Developer: Reload Window`) to load `.cursor/mcp.json` Ã¢â‚¬â€ the 307 MCP tools become callable.

### MCP Server

The ruflo MCP server is a host-agnostic stdio JSON-RPC server (protocol `2024-11-05`) Ã¢â‚¬â€ Cursor loads it automatically from `.cursor/mcp.json`:

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
# Get one from Cursor Dashboard Ã¢â€ â€™ Integrations
export CURSOR_API_KEY="cursor_..."   # macOS/Linux
$env:CURSOR_API_KEY = "cursor_..."   # Windows PowerShell

npx ruflo daemon start   # starts 12 background workers
```

Workers' local logic (audit, optimize, testgaps, etc.) runs without the API key Ã¢â‚¬â€ only the optional "spawn an agent to do the work" headless path needs it.

<details>
<summary><strong>Ã°Å¸â€Å’ All 35 plugins</strong></summary>

#### Core & Orchestration

| Plugin | What it does |
|--------|-------------|
| [**ruflo-core**](plugins/ruflo-core/README.md) | Foundation Ã¢â‚¬â€ server, health checks, plugin discovery |
| [**ruflo-swarm**](plugins/ruflo-swarm/README.md) | Coordinate multiple agents as a team |
| [**ruflo-autopilot**](plugins/ruflo-autopilot/README.md) | Let agents run autonomously in a loop |
| [**ruflo-loop-workers**](plugins/ruflo-loop-workers/README.md) | Schedule background tasks on a timer |
| [**ruflo-workflows**](plugins/ruflo-workflows/README.md) | Reusable multi-step task templates |
| [**ruflo-federation**](plugins/ruflo-federation/README.md) | Agents on different machines collaborate securely |

#### Memory & Knowledge

| Plugin | What it does |
|--------|-------------|
| [**ruflo-agentdb**](plugins/ruflo-agentdb/README.md) | Fast vector database for agent memory |
| [**ruflo-rag-memory**](plugins/ruflo-rag-memory/README.md) | Smart retrieval Ã¢â‚¬â€ hybrid search, graph hops, diversity ranking |
| [**ruflo-rvf**](plugins/ruflo-rvf/README.md) | Save and restore agent memory across sessions |
| [**ruflo-ruvector**](plugins/ruflo-ruvector/README.md) | [`ruvector`](https://npmjs.com/package/ruvector) Ã¢â‚¬â€ GPU-accelerated search, Graph RAG, 103 tools |
| [**ruflo-knowledge-graph**](plugins/ruflo-knowledge-graph/README.md) | Build and traverse entity relationship maps |

#### Intelligence & Learning

| Plugin | What it does |
|--------|-------------|
| [**ruflo-intelligence**](plugins/ruflo-intelligence/README.md) | Agents learn from past successes and get smarter |
| [**ruflo-graph-intelligence**](plugins/ruflo-graph-intelligence/) | Sublinear graph reasoning Ã¢â‚¬â€ PageRank, delta updates, complexity-aware execution (ADR-123) |
| [**ruflo-daa**](plugins/ruflo-daa/README.md) | Dynamic agent behavior and cognitive patterns |
| [**ruflo-ruvllm**](plugins/ruflo-ruvllm/README.md) | Run local LLMs (Ollama, etc.) with smart routing |
| [**ruflo-goals**](plugins/ruflo-goals/README.md) | Break big goals into plans and track progress |

#### Code Quality & Testing

| Plugin | What it does |
|--------|-------------|
| [**ruflo-testgen**](plugins/ruflo-testgen/README.md) | Find missing tests and generate them automatically |
| [**ruflo-browser**](plugins/ruflo-browser/README.md) | Automate browser testing with Playwright |
| [**ruflo-jujutsu**](plugins/ruflo-jujutsu/README.md) | Analyze git diffs, score risk, suggest reviewers |
| [**ruflo-docs**](plugins/ruflo-docs/README.md) | Generate and maintain documentation automatically |

#### Security & Compliance

| Plugin | What it does |
|--------|-------------|
| [**ruflo-security-audit**](plugins/ruflo-security-audit/README.md) | Scan for vulnerabilities and CVEs |
| [**ruflo-aidefence**](plugins/ruflo-aidefence/README.md) | Block prompt injection, detect PII, safety scanning |

#### Architecture & Methodology

| Plugin | What it does |
|--------|-------------|
| [**ruflo-adr**](plugins/ruflo-adr/README.md) | Track architecture decisions with a living record |
| [**ruflo-ddd**](plugins/ruflo-ddd/README.md) | Scaffold domain-driven design Ã¢â‚¬â€ contexts, aggregates, events |
| [**ruflo-sparc**](plugins/ruflo-sparc/README.md) | Guided 5-phase development methodology with quality gates |
| [**ruflo-metaharness**](plugins/ruflo-metaharness/README.md) | Grade your agent setup, scan tool configs for security risks, and track changes over time ([guide](docs/metaharness-user-guide.md)) |
| [**ruflo-arena**](plugins/ruflo-arena/README.md) | Competitive ruliology Ã¢â‚¬â€ pit agent strategies against each other in tournaments, hill-climb and co-evolve the winners (ADR-147/148) |

#### DevOps & Observability

| Plugin | What it does |
|--------|-------------|
| [**ruflo-migrations**](plugins/ruflo-migrations/README.md) | Manage database schema changes safely |
| [**ruflo-observability**](plugins/ruflo-observability/README.md) | Structured logs, traces, and metrics in one place |
| [**ruflo-cost-tracker**](plugins/ruflo-cost-tracker/README.md) | Track token usage, set budgets, get cost alerts |

#### Extensibility

| Plugin | What it does |
|--------|-------------|
| [**ruflo-agent**](plugins/ruflo-agent/README.md) | Run agents Ã¢â‚¬â€ local WASM sandbox (rvagent) + Anthropic Claude Managed Agents (cloud) |
| [**ruflo-plugin-creator**](plugins/ruflo-plugin-creator/README.md) | Scaffold, validate, and publish your own plugins |

#### Domain-Specific

| Plugin | What it does |
|--------|-------------|
| [**ruflo-iot-cognitum**](plugins/ruflo-iot-cognitum/README.md) | IoT device management Ã¢â‚¬â€ trust scoring, anomaly detection, fleets |
| [**ruflo-neural-trader**](plugins/ruflo-neural-trader/README.md) | [`neural-trader`](https://npmjs.com/package/neural-trader) Ã¢â‚¬â€ AI trading with 4 agents, backtesting, 112+ tools |
| [**ruflo-market-data**](plugins/ruflo-market-data/README.md) | Ingest market data, vectorize OHLCV, detect patterns |

</details>

### CLI Install

**macOS / Linux / WSL / Git-Bash:**

```bash
# One-line install (POSIX shells only Ã¢â‚¬â€ see Windows note below)
curl -fsSL https://cdn.jsdelivr.net/gh/pwnapplehat/ruflo@main/scripts/install.sh | bash
```

**All platforms (including native Windows PowerShell / cmd):**

```bash
# Interactive setup wizard Ã¢â‚¬â€ runs identically on every platform
npx ruflo@latest init wizard

# Quick non-interactive init
# npx ruflo@latest init

# Or install globally
npm install -g ruflo@latest
```

> Ã°Å¸â€™Â¡ **Windows users:** the `curl ... | bash` form needs a POSIX shell (Git-Bash, WSL, MSYS). The `npx ruflo@latest init wizard` line works natively in PowerShell and cmd. If you hit an `'bash' is not recognized` error, use the `npx` line instead Ã¢â‚¬â€ both end up running the same init flow.

### MCP Server

```bash
# Ruflo is registered as an MCP server in .cursor/mcp.json (written by npx ruflo init)
# To register manually in Cursor: Settings Ã¢â€ â€™ Tools & MCP Ã¢â€ â€™ New MCP Server, or add to .cursor/mcp.json:
# { "mcpServers": { "ruflo": { "command": "npx", "args": ["-y", "ruflo@latest", "mcp", "start"] } } }
```

---

## What You Get

| Capability | Description |
|------------|-------------|
| Ã°Å¸Â¤â€“ **100+ Agents** | Specialized agents for coding, testing, security, docs, architecture |
| Ã°Å¸â€œÂ¡ **Comms Layer** | Zero-trust federation Ã¢â‚¬â€ agents across machines/orgs discover, authenticate, and exchange work securely |
| Ã°Å¸ÂÂ **Swarm Coordination** | Hierarchical, mesh, and adaptive topologies with consensus |
| Ã°Å¸Â§Â  **Self-Learning** | SONA neural patterns, ReasoningBank, trajectory learning |
| Ã°Å¸â€™Â¾ **Vector Memory** | HNSW-indexed AgentDB Ã¢â‚¬â€ measured ~1.9x faster at N=20k, ~3.2xÃ¢â‚¬â€œ4.7x at N=5k vs brute force (recall@10 ~0.99); ANN wins above the crossover, ties/loses at small N. See [audit](docs/reviews/intelligence-system-audit-2026-05-29.md) + [`scripts/benchmark-intelligence.mjs`](scripts/benchmark-intelligence.mjs) |
| Ã¢Å¡Â¡ **Background Workers** | 12 auto-triggered workers (audit, optimize, testgaps, etc.) |
| Ã°Å¸Â§Â© **Plugin Marketplace** | 33 native plugins + 21 npm plugins |
| Ã°Å¸â€Å’ **Multi-Provider** | Claude, GPT, Gemini, Cohere, Ollama with smart routing |
| Ã°Å¸â€ºÂ¡Ã¯Â¸Â **Security** | AIDefence, input validation, CVE remediation, path traversal prevention |
| Ã°Å¸Å’Â **Agent Federation** | Cross-installation agent collaboration with zero-trust security |
| Ã°Å¸â€Â¬ **[MetaHarness](docs/metaharness-user-guide.md)** | Audit your AI agent setup before you ship. Grade readiness (1-100), scan tool configs for security issues, snapshot the whole project to catch regressions over time, and find templates that match your repo. `ruflo eject` turns a ruflo project into a standalone agent toolkit with its own name. [Full guide](docs/metaharness-user-guide.md). |
| Ã°Å¸â€™Â¬ **[Web UI Beta](https://flo.ruv.io/)** | Multi-model chat at flo.ruv.io with parallel MCP tool calling and an in-browser WASM tool gallery |
| Ã°Å¸Å½Â¯ **[RuFlo Research](https://goal.ruv.io/)** | GOAP A\* planner at goal.ruv.io Ã¢â‚¬â€ plain-English goals Ã¢â€ â€™ executable agent plans, with a live agent dashboard at [/agents](https://goal.ruv.io/agents) |

<p align="center">
  <a href="https://flo.ruv.io/">
    <img src="v3/docs/assets/ruVocal.png" alt="RuFlo Web UI executing parallel MCP tool calls at flo.ruv.io Ã¢â‚¬â€ ruflo__memory_store and ruflo__memory_search firing in a single model turn with the 'Step 1 Ã¢â‚¬â€ 2 tools completed' parallel-execution indicator, thinking process panel visible, Qwen 3.6 Max as the active model. Multi-agent AI chat with Model Context Protocol (MCP) tool calling, persistent vector memory via AgentDB + HNSW, swarm coordination, and 6 frontier models including Claude Sonnet 4.6, Gemini 2.5 Pro, and OpenAI through OpenRouter." width="100%" />
  </a>
</p>

### Web UI (Beta) Ã¢â‚¬â€ self-hostable, hosted demo at [flo.ruv.io](https://flo.ruv.io/)

**RuFlo's web UI is a multi-model AI chat with built-in Model Context Protocol (MCP) tool calling.** Talk to Qwen, Claude, Gemini, or OpenAI while RuFlo invokes the same MCP tools the CLI uses Ã¢â‚¬â€ agent orchestration, persistent memory, swarm coordination, code review, GitHub ops Ã¢â‚¬â€ directly from chat. No install, no API key needed to try it.

| | What it is | Why it matters |
|---|------------|----------------|
| Ã°Å¸Â§Â  | **Any model, local or remote** | 6 curated frontier models out-of-the-box Ã¢â‚¬â€ Qwen 3.6 Max (default), Claude Sonnet 4.6, Claude Haiku 4.5, Gemini 2.5 Pro, Gemini 2.5 Flash, OpenAI Ã¢â‚¬â€ via OpenRouter. Add your own: any OpenAI-compatible endpoint (vLLM, Ollama, LM Studio, Together, Groq, self-hosted). |
| Ã°Å¸Â¦Â¾ | **ruvLLM self-learning AI** | Native support for [ruvLLM](https://github.com/ruvnet/RuVector/tree/main/examples/ruvLLM) (lives in `ruvnet/RuVector/examples/ruvLLM`) Ã¢â‚¬â€ RuFlo's self-improving local model layer. Routes to MicroLoRA adapters, learns from your trajectories via SONA, and stays on your machine. Pair with the cloud models or run fully offline. |
| Ã°Å¸â€ºÂ Ã¯Â¸Â | **~210 tools, ready to call** | 5 server groups (Core, Intelligence, Agents, Memory, DevTools) plus an 18-tool gallery that runs entirely in your browser Ã¢â‚¬â€ works offline. |
| Ã°Å¸â€Å’ | **Bring your own MCP servers** | Click the **MCP (n)** pill in the chat input Ã¢â€ â€™ *Add Server* and paste any MCP endpoint (HTTP, SSE, or stdio). Your tools join RuFlo's native ones in the same parallel-execution flow. Run a local MCP server on `localhost:3000` and it just works. |
| Ã¢Å¡Â¡ | **Tools run in parallel** | One model response can fire 4Ã¢â‚¬â€œ6+ tools at the same time. The UI shows them as cards with a *Step 1 Ã¢â‚¬â€ 2 tools completed* badge so you can see exactly what ran. |
| Ã°Å¸â€™Â¾ | **Memory that sticks** | Say *"remember my favorite color is indigo"* and ask weeks later Ã¢â‚¬â€ RuFlo recalls it. Backed by AgentDB + HNSW vector search (measured ~1.9xÃ¢â‚¬â€œ4.7x faster than brute force above the crossover, recall@10 ~0.99). |
| Ã°Å¸â€œËœ | **Built-in capabilities tour** | Click the question-mark icon in the sidebar Ã¢â‚¬â€ a "RuFlo Capabilities" modal opens with the full tool list, model strengths, architecture, and keyboard shortcuts. |
| Ã°Å¸ÂÂ  | **Self-hostable** | Web UI is shipped as Docker (`ruflo/src/ruvocal/Dockerfile`) with embedded Mongo. Deploy to your own Cloud Run / Fly / Kubernetes / docker-compose. The hosted [flo.ruv.io](https://flo.ruv.io/) demo is one option; running your own is fully supported. |
| Ã°Å¸Å¡â‚¬ | **Zero install to try** | Open the hosted URL, pick a model, type a question. That's the whole onboarding. |

**Try the hosted demo:** [https://flo.ruv.io/](https://flo.ruv.io/) Ã¢â‚¬â€ no account, no API key. **Run your own:** the source lives in [`ruflo/src/ruvocal/`](ruflo/src/ruvocal/) with a multi-stage Dockerfile (`INCLUDE_DB=true` builds in MongoDB) and a `cloudbuild.yaml` for Google Cloud Run. See [ADR-033](ruflo/docs/adr/ADR-033-RUVOCAL-WASM-MCP-INTEGRATION.md) for the architecture and [issue #1689](https://github.com/pwnapplehat/ruflo/issues/1689) for the roadmap.

<p align="center">
  <a href="https://goal.ruv.io/agents">
    <img src="v3/docs/assets/goal.png" alt="goal.ruv.io/agents Ã¢â‚¬â€ RuFlo Goal-Oriented Action Planning (GOAP) UI for autonomous AI agents. Visual goal decomposition, A* search through state spaces, multi-agent task assignment, and live agent telemetry." width="100%" />
  </a>
</p>

### Goal Planner UI Ã¢â‚¬â€ autonomous agents at [goal.ruv.io](https://goal.ruv.io/)

**Turn high-level goals into executable agent plans.** `goal.ruv.io` is RuFlo's hosted Goal-Oriented Action Planning (GOAP) front-end Ã¢â‚¬â€ describe an outcome in plain English and watch RuFlo decompose it into preconditions, actions, and an A* path through state space, then dispatch the work to live agents at [`/agents`](https://goal.ruv.io/agents).

| | What it is | Why it matters |
|---|------------|----------------|
| Ã°Å¸Å½Â¯ | **Plain-English goals** | Type *"ship the auth refactor with tests and a PR"* Ã¢â‚¬â€ RuFlo extracts the success criteria, the constraints, and the implicit preconditions. No JSON, no DSL. |
| Ã°Å¸Â§Â­ | **GOAP A\* planner** | Classic gaming-AI planning ported to software work: state-space search through actions with preconditions/effects to find the shortest viable path. Replans on the fly when state changes. |
| Ã°Å¸Â¤â€“ | **Live agent dashboard** | [goal.ruv.io/agents](https://goal.ruv.io/agents) shows every spawned agent Ã¢â‚¬â€ role, current step, memory namespace, token budget, status. Click in to inspect trajectories, kill runaway workers, or reassign. |
| Ã°Å¸Å’Â³ | **Visual plan tree** | Goals render as collapsible action trees with progress, blocked branches, and rollbacks highlighted. See *exactly* why an agent picked a path Ã¢â‚¬â€ no opaque chain-of-thought. |
| Ã¢â„¢Â»Ã¯Â¸Â | **Adaptive replanning** | When an action fails or new info arrives, the planner re-runs A\* from the current state instead of restarting. Failures become learning, not loops. |
| Ã°Å¸Â§Â  | **Shared memory + SONA** | Plans, trajectories, and outcomes flow into AgentDB. Future plans retrieve past solutions via HNSW Ã¢â‚¬â€ the planner gets smarter with every run. |
| Ã°Å¸â€â€” | **Wired to MCP tools** | Every action node maps to a tool call (RuFlo's ~210 MCP tools, your custom servers, or shell). The planner schedules them in parallel where the dependency graph allows. |
| Ã°Å¸Å¡â‚¬ | **Zero install to try** | Open [goal.ruv.io](https://goal.ruv.io/), describe a goal, watch it run. Source lives in [`v3/goal_ui/`](v3/goal_ui/) Ã¢â‚¬â€ Vite + Supabase, self-hostable. |

**Try it:** [https://goal.ruv.io/](https://goal.ruv.io/) for goals Ã‚Â· [https://goal.ruv.io/agents](https://goal.ruv.io/agents) for live agents. **Run your own:** clone the `goal` branch and `cd v3/goal_ui && npm install && npm run dev`.

### Agent Federation Ã¢â‚¬â€ Slack for Agents

```
Your Agent --> [ Remove secrets ] --> [ Sign message ] --> [ Encrypted channel ]
                 Emails, SSNs,        Proves it came       No one reads it
                 keys stripped         from you              in transit
                                                                |
                                                                v
Their Agent <-- [ Block attacks ] <-- [ Check identity ] <------+
                 Stops prompt          Rejects forgeries
                 injection

                          Audit trail on both sides.
                  Trust builds over time. Bad behavior = instant downgrade.
```

Slack gave teams channels. Federation gives agents the same thing Ã¢â‚¬â€ **shared workspaces across trust boundaries**, where agents on different machines, orgs, or cloud regions can discover each other, prove who they are, and collaborate on tasks.

The difference: some channels are trusted, some aren't. [`@claude-flow/plugin-agent-federation`](https://github.com/pwnapplehat/ruflo/issues/1669) handles that automatically. Your agents join a federation, get verified via mTLS + ed25519, and start exchanging work Ã¢â‚¬â€ with PII stripped before anything leaves your node and every message auditable. Untrusted agents can still participate at lower privilege: they see discovery info, not your memory. As they prove reliable, trust upgrades. If they misbehave, they get downgraded instantly Ã¢â‚¬â€ no human in the loop required.

You don't configure handshakes or manage certificates. You `federation init`, `federation join`, and your agents start talking. The protocol handles identity, the PII pipeline handles data safety, and the audit trail handles compliance.

> **Ã°Å¸â€œËœ Full user guide:** [`docs/federation/`](./docs/federation/) Ã¢â‚¬â€ setup, MCP tools, trust levels, circuit breaker, and the (opt-in) WireGuard mesh layer that ties packet-layer reachability to federation trust. ADR-111 deep-dive at [`docs/federation/phase7-mesh-bringup.md`](./docs/federation/phase7-mesh-bringup.md).

<details>
<summary><strong>Federation capabilities</strong></summary>

| | Capability | How it works |
|---|---|---|
| Ã°Å¸â€â€™ | **Zero-trust federation** | Remote agents start untrusted. Identity proven via mTLS + ed25519 challenge-response. No API keys, no shared secrets. |
| Ã°Å¸â€ºÂ¡Ã¯Â¸Â | **PII-gated data flow** | 14-type detection pipeline scans every outbound message. Per-trust-level policies: BLOCK, REDACT, HASH, or PASS. Adaptive calibration reduces false positives. |
| Ã°Å¸â€œÅ  | **Behavioral trust scoring** | Formula (`0.4Ãƒâ€”success + 0.2Ãƒâ€”uptime + 0.2Ãƒâ€”threat + 0.2Ãƒâ€”integrity`) continuously evaluates peers. Upgrades require history; downgrades are instant. |
| Ã°Å¸â€œâ€¹ | **Compliance built-in** | HIPAA, SOC2, GDPR audit trails as compliance modes. Every federation event produces a structured record searchable via HNSW. |
| Ã°Å¸Â¤Â | **9 MCP tools + 10 CLI commands** | Full lifecycle: `federation_init`, `federation_send`, `federation_trust`, `federation_audit`, and more. |

</details>

<details>
<summary><strong>Example: two teams sharing fraud signals without sharing customer data</strong></summary>

```bash
# Team A: initialize federation and generate keypair
npx ruflo@latest federation init

# Team A: join Team B's federation endpoint
npx ruflo@latest federation join wss://team-b.example.com:8443

# Team A: send a task Ã¢â‚¬â€ PII is stripped automatically before it leaves
npx ruflo@latest federation send --to team-b --type task-request \
  --message "Analyze transaction patterns for account anomalies"

# Team A: check peer trust levels and session health
npx ruflo@latest federation status
```

</details>

See [issue #1669](https://github.com/pwnapplehat/ruflo/issues/1669) for the complete architecture, trust model, and implementation roadmap.

```bash
# Cursor: add the federation plugin's MCP server to .cursor/mcp.json, or:
npx ruflo@latest plugins install ruflo-federation

# Or via CLI
npx ruflo@latest plugins install @claude-flow/plugin-agent-federation
```

<details>
<summary><strong>Cursor: With vs Without Ruflo</strong></summary>

| Capability | Cursor Alone | + Ruflo |
|------------|-------------------|---------|
| Agent Collaboration | Isolated, no shared context | Swarms with shared memory and consensus |
| Coordination | Manual orchestration | Queen-led hierarchy (Raft, Byzantine, Gossip) |
| Memory | Session-only | HNSW vector memory with sub-ms retrieval |
| Learning | Static behavior | SONA self-learning with pattern matching |
| Task Routing | You decide | Intelligent routing (89% accuracy) |
| Background Workers | None | 12 auto-triggered workers |
| LLM Providers | Anthropic only | 5 providers with failover |
| Security | Standard | CVE-hardened with AIDefence |

</details>

<details>
<summary><strong>Architecture overview</strong></summary>

```
User --> Cursor / CLI
          |
          v
    Orchestration Layer
    (MCP Server, Router, 27 Hooks)
          |
          v
    Swarm Coordination
    (Queen, Topology, Consensus)
          |
          v
    100+ Specialized Agents
    (coder, tester, reviewer, architect, security...)
          |
          v
    Memory & Learning
    (AgentDB, HNSW, SONA, ReasoningBank)
          |
          v
    LLM Providers
    (Claude, GPT, Gemini, Cohere, Ollama)
```

</details>

---

## Documentation

Four docs for four audiences:

| Doc | When to read it |
|-----|-----------------|
| **[Status](docs/STATUS.md)** | See what currently works Ã¢â‚¬â€ capability counts, test baselines, recent fixes, what's next. The *is-it-ready* doc. |
| **[User Guide](docs/USERGUIDE.md)** | Daily reference Ã¢â‚¬â€ every command, every config flag, every plugin. The *how-do-I* doc. |
| **[MetaHarness Guide](docs/metaharness-user-guide.md)** | How to grade your agent setup, scan tool configs for security, detect changes between runs, and eject a project into a standalone agent toolkit. The *audit-my-setup* doc. |
| **[Benchmarks](https://gist.github.com/ruvnet/298f8c668c8859b369f91734a0e9cbbe)** | v3.8.0 SOTA matrix vs LangGraph / AutoGen / CrewAI on darwin-arm64 + linux-x64. ruflo wins cold start, single turn, RSS by 1.3Ãƒâ€”Ã¢â‚¬â€œ1953Ãƒâ€”. The *is-it-fast* doc. |
| **[Verification](verification.md)** | Cryptographically prove your installed bytes match the signed witness Ã¢â‚¬â€ `ruflo verify`. The *trust-but-verify* doc. |
| **[Team Gateway Checklist](docs/TEAM-GATEWAY-CHECKLIST.md)** | Before-merge gates, dual-mode handoff, memory namespace sharing, and witness manifest entry per merge. The *safer-team-workflows* doc. |

Benchmark internals (for reproduction): [`sota-workload-spec.md`](https://github.com/pwnapplehat/ruflo/blob/perf/sota-comparator-benchmarks/docs/benchmarks/sota-workload-spec.md) Ã‚Â· [`SOTA-PROGRESS.md`](https://github.com/pwnapplehat/ruflo/blob/perf/sota-comparator-benchmarks/docs/benchmarks/SOTA-PROGRESS.md) Ã‚Â· [raw matrix JSON: darwin](https://github.com/pwnapplehat/ruflo/blob/perf/sota-comparator-benchmarks/docs/benchmarks/sota-matrix.json) Ã‚Â· [linux](https://github.com/pwnapplehat/ruflo/blob/perf/sota-comparator-benchmarks/docs/benchmarks/sota-matrix-linux.json)

User Guide section index:

| Section | Topics |
|---------|--------|
| [Quick Start](docs/USERGUIDE.md#quick-start) | Installation, prerequisites, install profiles |
| [Core Features](docs/USERGUIDE.md#-core-features) | MCP tools, agents, memory, neural learning |
| [Intelligence & Learning](docs/USERGUIDE.md#-intelligence--learning) | Hooks, workers, SONA, model routing |
| [Swarm & Coordination](docs/USERGUIDE.md#-swarm--coordination) | Topologies, consensus, hive mind |
| [Security](docs/USERGUIDE.md#%EF%B8%8F-security) | AIDefence, CVE remediation, validation |
| [Ecosystem](docs/USERGUIDE.md#-ecosystem--integrations) | RuVector, agentic-flow, Flow Nexus |
| [Configuration](docs/USERGUIDE.md#%EF%B8%8F-configuration--reference) | Environment variables, config schema |
| [Plugin Marketplace](https://ruvnet.github.io/ruflo) | Browse and install plugins |

---

## Support

| Resource | Link |
|----------|------|
| Documentation | [User Guide](docs/USERGUIDE.md) |
| Issues & Bugs | [GitHub Issues](https://github.com/pwnapplehat/ruflo/issues) |
| Enterprise | [ruv.io](https://ruv.io) |
| Community | [Agentics Foundation Discord](https://discord.com/invite/dfxmpwkG2D) |
| Powered by | [Cognitum.one](https://cognitum.one) |

## License

MIT - [RuvNet](https://github.com/ruvnet)
