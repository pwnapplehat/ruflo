# Ruflo Goal Planner UI

> Self-hostable Goal-Oriented Action Planning (GOAP) UI for the Cursor-native
> [ruflo](https://github.com/pwnapplehat/ruflo) fork. A Vite + React web app that
> turns plain-English goals into executable agent plans using A* search through a
> state space of actions with preconditions and effects.

Ruflo Research applies classic Goal-Oriented Action Planning (GOAP) — A* search
through a state space of actions with preconditions and effects — to autonomous
AI research, then dispatches the work to live agents you can inspect in real
time. This package is part of the Cursor-native ruflo fork and is intended to be
self-hosted alongside your ruflo installation.

## Highlights

| | |
|---|---|
| 🎯 **Plain-English goals** | Describe an outcome — ruflo extracts success criteria, constraints, and implicit preconditions |
| 🧭 **GOAP A\* planner** | Shortest-path search through actions with preconditions/effects; replans on the fly when state changes |
| 🤖 **Live agent dashboard** | `/agents` shows every spawned agent — role, current step, status, trajectories |
| 🌳 **Visual plan tree** | Goals render as collapsible action trees with progress, blocked branches, rollbacks |
| ♻️ **Adaptive replanning** | When an action fails, A* re-runs from the current state instead of restarting |
| 🔌 **Embeddable widget** | Drop the research UI into any site via `<script src="widget.js">` |

## Quick Start

```bash
# from /v3/goal_ui
npm install
npm run dev          # main app on http://localhost:8080
```

For the embeddable widget:

```bash
npm run build:widget         # produces dist/widget.js + dist/widget.css
npm run widget:dev           # build widget + start dev server
```

## Project Structure

```
v3/goal_ui/
├── src/
│   ├── components/          # React components (GoalInput, AgentStep, ResearchReportModal, …)
│   ├── pages/               # Index, Agents, Demo, NotFound
│   ├── lib/goapPlanner.ts   # GOAP A* implementation
│   ├── integrations/supabase/  # Supabase client + types
│   └── widget.tsx           # Embeddable widget entry
├── supabase/functions/      # Edge functions (research-step, generate-research-goal, …)
├── public/                  # Static assets, widget-embed.html demo
├── docs/                    # DEPLOYMENT.md, WIDGET-INTEGRATION.md, WIDGET_SETUP.md
└── netlify.toml             # Hosting config
```

## Embedding the Widget

Host `dist/widget.js` and `dist/widget.css` on your own domain, then:

```html
<div id="ruflo-research-widget-container"></div>
<script>
  window.RufloResearchWidgetConfig = {
    primaryColor: "#8b5cf6",
    accentColor: "#10b981",
  };
</script>
<script src="https://YOUR-DOMAIN/widget.js"></script>
<link rel="stylesheet" href="https://YOUR-DOMAIN/widget.css" />
```

The widget exposes a global `window.RufloResearchWidget` with `init(containerId)` and `version` for programmatic control. See [`docs/WIDGET-INTEGRATION.md`](docs/WIDGET-INTEGRATION.md) for the full integration guide.

## Tech Stack

React 18 · TypeScript 5 · Vite 5 · Tailwind 3 · shadcn/ui · Radix UI · React Query · React Router · Supabase Edge Functions · GOAP A* planner

## Deployment

Self-host on Netlify (`netlify.toml`) or any static host. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for self-hosting instructions and
edge-function deploy steps. There is no upstream-hosted demo in this fork —
run it on your own infrastructure.

## Environment

Copy `example.env` → `.env` and set the Supabase publishable variables (all `VITE_*` prefixed and safe to ship to the browser):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

For the Supabase Edge Functions, set `AI_GATEWAY_URL` and `AI_GATEWAY_API_KEY`
as secrets in your Supabase project (Dashboard → Project Settings → Edge
Functions → Secrets) pointing to any OpenAI-compatible chat-completions
endpoint you control.

## License

MIT — same as the parent [ruflo](https://github.com/pwnapplehat/ruflo) project.
