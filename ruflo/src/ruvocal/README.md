# RuVocal — RuFlo Web UI

> A self-hostable SvelteKit web UI for the Cursor-native [RuFlo](https://github.com/pwnapplehat/ruflo) fork — multi-model AI chat with built-in Model Context Protocol (MCP) tool calling.

RuVocal is the SvelteKit web app that lets you chat with Qwen, Claude, Gemini, or OpenAI while [RuFlo](https://github.com/pwnapplehat/ruflo) invokes the same ~210 MCP tools the CLI uses — agent orchestration, persistent memory, swarm coordination, code review, GitHub ops — all directly from chat. Bring your own API key and your own MCP servers; nothing is hosted for you.

It started as a fork of the [HuggingFace chat-ui](https://github.com/huggingface/chat-ui) v0.20.0 and has been extended with a WASM-MCP integration layer, parallel tool execution, an in-browser tool gallery, and a "RuFlo Capabilities" tour modal. See [ADR-033](../../docs/adr/ADR-033-RUVOCAL-WASM-MCP-INTEGRATION.md) for the architecture.

## What RuVocal adds on top of upstream chat-ui

| | |
|---|---|
| 🛠️ **~210 MCP tools, prefixed** | Five RuFlo server groups (Core, Intelligence, Agents, Memory, DevTools) plus a 18-tool in-browser WASM gallery |
| ⚡ **Parallel tool calls** | One model turn fires 4–6+ tools at once via `Promise.all`. The UI shows a *Step N — X tools completed* badge per turn |
| 📘 **RuFlo Capabilities modal** | Question-mark icon → multi-section tour: models, tools, architecture, shortcuts |
| 💾 **AgentDB-backed memory** | "Remember my favorite color is indigo" → recalled weeks later via HNSW vector search |
| 🧠 **6 curated frontier models** | Qwen 3.6 Max (default), Claude Sonnet 4.6, Claude Haiku 4.5, Gemini 2.5 Pro, Gemini 2.5 Flash, OpenAI — via OpenRouter |
| 🔌 **Bring-your-own MCP servers** | Add HTTP/SSE/stdio endpoints from the chat input; they join the parallel-execution flow |
| 🏠 **Self-hostable** | Multi-stage Dockerfile (`INCLUDE_DB=true` builds in MongoDB), `cloudbuild.yaml` for Google Cloud Run |

## Quick Start

### Local dev

```bash
git clone https://github.com/pwnapplehat/ruflo
cd ruflo/ruflo/src/ruvocal
cp .env .env.local        # then edit .env.local — see below
npm install
npm run dev               # → http://localhost:5173
```

Minimum `.env.local` to use OpenRouter:

```env
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-v1-...

# Curated RuFlo model list (optional — defaults to /models from the base URL)
TASK_MODEL=qwen/qwen3.6-max-preview
PUBLIC_APP_NAME=RuFlo
PUBLIC_APP_DESCRIPTION="Intelligent workflow automation assistant powered by Claude/Gemini/Qwen and MCP tools."
```

Any OpenAI-compatible endpoint works (vLLM, Ollama, LM Studio, llama.cpp, Together, Groq, self-hosted, …):

| Provider | `OPENAI_BASE_URL` | Key |
| --- | --- | --- |
| OpenRouter | `https://openrouter.ai/api/v1` | `sk-or-v1-...` |
| Hugging Face router | `https://router.huggingface.co/v1` | `hf_xxx` |
| llama.cpp server | `http://127.0.0.1:8080/v1` | any string |
| Ollama (OAI bridge) | `http://127.0.0.1:11434/v1` | `ollama` |
| Poe | `https://api.poe.com/v1` | `pk_...` |

### Docker (with embedded MongoDB)

```bash
docker build -t ruvocal --build-arg INCLUDE_DB=true .
docker run -p 3000:3000 \
  -e OPENAI_BASE_URL=https://openrouter.ai/api/v1 \
  -e OPENAI_API_KEY=sk-or-v1-... \
  -v ruvocal-data:/data \
  ruvocal
```

### Google Cloud Run (self-hosted production-style)

`cloudbuild.yaml` does a multi-stage build with `INCLUDE_DB=true`, pushes to Artifact Registry, and deploys to Cloud Run. Use this as a starting point for your own deployment. See [`cloudbuild.yaml`](./cloudbuild.yaml) and the deploy notes in [ADR-033](../../docs/adr/ADR-033-RUVOCAL-WASM-MCP-INTEGRATION.md).

## Database

Chat history, users, settings, files, and stats live in MongoDB. Three options:

- **Embedded (zero-config)** — omit `MONGODB_URL`; the app uses `MongoMemoryServer` and persists to `./db`. Good for local dev and the `INCLUDE_DB=true` Docker path.
- **MongoDB Atlas (managed)** — free cluster at [mongodb.com](https://www.mongodb.com/pricing), allow-list your IP, set `MONGODB_URL` to the connection string.
- **Local container** — `docker run -d -p 27017:27017 --name mongo-ruvocal mongo:latest` then `MONGODB_URL=mongodb://localhost:27017`.

`MONGODB_DB_NAME` defaults to `chat-ui` (kept for upstream compatibility); change per environment.

## MCP Tools (the RuFlo difference)

RuVocal calls tools exposed by Model Context Protocol servers and feeds results back to the model via OpenAI function calling. Configure trusted servers via env, let users add their own, and the router auto-selects tools-capable models when needed.

```env
MCP_SERVERS=[
  {"name":"RuFlo Core","url":"http://localhost:3001/mcp/core","transport":"sse"},
  {"name":"RuFlo Intelligence","url":"http://localhost:3001/mcp/intelligence","transport":"sse"},
  {"name":"RuFlo Agents","url":"http://localhost:3001/mcp/agents","transport":"sse"},
  {"name":"RuFlo Memory","url":"http://localhost:3001/mcp/memory","transport":"sse"},
  {"name":"RuFlo DevTools","url":"http://localhost:3001/mcp/devtools","transport":"sse"}
]
```

In the chat UI: **MCP (n)** pill in the chat input → *Add Server* to drop in any HTTP/SSE/stdio endpoint. Run a local MCP server on `localhost:3000` and it just works.

When a model calls a tool, the message shows a compact card with parameters, a progress bar while running, and the result. Multiple tools in the same turn render as a parallel-execution group.

## LLM Router (Omni)

RuVocal can do server-side smart routing using [katanemo/Arch-Router-1.5B](https://huggingface.co/katanemo/Arch-Router-1.5B) without a separate router service. Selecting "Omni" in the model picker:

1. Calls Arch once (non-streaming) to pick the best route for recent turns
2. Emits `RouterMetadata` so the UI shows route + selected model
3. Streams from the selected model via `OPENAI_BASE_URL`; on errors, tries route fallbacks

Shortcut paths bypass Arch:
- **Multimodal** — `LLM_ROUTER_ENABLE_MULTIMODAL=true` + image attached → uses `LLM_ROUTER_MULTIMODAL_MODEL`
- **Tools/Agentic** — `LLM_ROUTER_ENABLE_TOOLS=true` + ≥1 MCP server enabled → uses `LLM_ROUTER_TOOLS_MODEL`

Configure via `LLM_ROUTER_ROUTES_PATH` (JSON array of route entries with `name`, `description`, `primary_model`, optional `fallback_models`), `LLM_ROUTER_ARCH_BASE_URL`, `LLM_ROUTER_ARCH_MODEL`, `LLM_ROUTER_OTHER_ROUTE`, `LLM_ROUTER_FALLBACK_MODEL`, `LLM_ROUTER_ARCH_TIMEOUT_MS`.

Display: `PUBLIC_LLM_ROUTER_ALIAS_ID` (default `omni`), `PUBLIC_LLM_ROUTER_DISPLAY_NAME` (default `Omni`), `PUBLIC_LLM_ROUTER_LOGO_URL`.

## Theming

```env
PUBLIC_APP_NAME=RuFlo
PUBLIC_APP_ASSETS=chatui
PUBLIC_APP_DESCRIPTION="Intelligent workflow automation assistant powered by Claude/Gemini/Qwen and MCP tools."
PUBLIC_APP_DATA_SHARING=
```

`PUBLIC_APP_ASSETS` picks the logo/favicon directory under `static/$PUBLIC_APP_ASSETS`.

## Build

```bash
npm run build         # production bundle
npm run preview       # preview the build locally
```

## Architecture (one-pager)

- **SvelteKit 2 + Svelte 5 runes** (`$state`, `$derived`, `$effect`)
- **MongoDB** persistence with `MongoMemoryServer` fallback
- **TailwindCSS** with `scrollbar-custom` and Tailwind class sorting
- **OpenAI-compatible** model registry pulled from `${OPENAI_BASE_URL}/models`
- **MCP bridge** in `src/lib/server/mcp/`; each server group exposes its own SSE endpoint
- **WASM tool gallery** via Web Worker (`src/lib/wasm/wasm.worker.ts`), opt-in via `?worker=1`
- **Parallel tool calls** — `Promise.all` in `src/lib/server/tools/toolInvocation.ts`
- **Capabilities modal** — `src/lib/components/RufloHelpModal.svelte`
- **Dynamic follow-ups** — tool-call-aware suggested next prompts in `ChatWindow.svelte`

For deeper internals, see [`CLAUDE.md`](./CLAUDE.md) and [ADR-033](../../docs/adr/ADR-033-RUVOCAL-WASM-MCP-INTEGRATION.md).

## Related

- 🏠 **Project home** — [pwnapplehat/ruflo](https://github.com/pwnapplehat/ruflo)
- 📖 **ADR-033** — RuVocal/WASM-MCP integration architecture
- 🍴 **Upstream** — [huggingface/chat-ui](https://github.com/huggingface/chat-ui) (RuVocal is forked from v0.20.0)

## License

MIT — same as the [RuFlo](https://github.com/pwnapplehat/ruflo) project.
