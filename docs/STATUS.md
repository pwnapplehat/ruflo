# Ruflo Ã¢â‚¬â€ Overview Ã‚Â· Usage Ã‚Â· Status

> The complementary doc to [`USERGUIDE.md`](USERGUIDE.md) (deep reference) and [`/verification.md`](../verification.md) (cryptographic witness). This doc tells you **what Ruflo is**, **how to use it day-to-day**, and **what currently works** Ã¢â‚¬â€ without the encyclopedic reference depth.

---

## Overview

Ruflo is a multi-agent AI orchestration layer for Cursor. It turns Cursor from a single-context coding assistant into a coordinated swarm of agents that share memory, learn from outcomes, talk across machines, and remain auditable.

The runtime is the `ruflo` npm package. End-user surface is:

- **MCP server** Ã¢â‚¬â€ exposes 323 tools to Cursor (memory, agents, swarm coordination, hooks, GitHub integration, browser automation, etc.).
- **CLI** Ã¢â‚¬â€ 45 top-level commands (`ruflo agent`, `ruflo swarm`, `ruflo memory`, `ruflo hooks`, `ruflo verify`, Ã¢â‚¬Â¦) for terminal/script use.
- **Cursor plugins** Ã¢â‚¬â€ 32 installable plugins (`ruflo-core`, `ruflo-federation`, `ruflo-cost-tracker`, Ã¢â‚¬Â¦) that bundle agent + skill + slash-command definitions.
- **WASM kernels** Ã¢â‚¬â€ Rust-compiled WASM for the policy engine, embeddings, and proof system; plugged into the same MCP/CLI surface.

For the "why" Ã¢â‚¬â€ coordinated swarms, self-learning memory, federated comms, enterprise security Ã¢â‚¬â€ see [`README.md`](../README.md).

## Usage at a glance

The intended day-to-day flow:

1. **Install once**:
   ```bash
   npx ruflo init --wizard
   ```
   This writes an `AGENTS.md` with hooks and routing rules, registers the MCP server with Cursor (.cursor/mcp.json), and seeds `.claude-flow/` with config + memory.

2. **Just use Cursor normally**. Hooks automatically route tasks, retrieve relevant memory patterns, and coordinate background agents. You don't have to learn the 323 MCP tools Ã¢â‚¬â€ the routing layer does.

3. **Run the CLI for orchestration tasks** that don't fit naturally into Claude Code:
   - `ruflo agent spawn -t coder --name api-worker` Ã¢â‚¬â€ long-running agent
   - `ruflo swarm init --topology hierarchical --max-agents 8` Ã¢â‚¬â€ coordinated team
   - `ruflo memory search --query "auth patterns"` Ã¢â‚¬â€ semantic search across stored knowledge
   - `ruflo doctor --fix` Ã¢â‚¬â€ diagnose & repair install
   - `ruflo verify` Ã¢â‚¬â€ confirm your installed bytes match the signed witness

4. **Install plugins as you need them**:
   ```bash
   /plugin marketplace add pwnapplehat/ruflo
   /plugin install ruflo-federation@ruflo
   ```

Full command reference: [`USERGUIDE.md`](USERGUIDE.md).

## Status Ã¢â‚¬â€ what currently works

**Snapshot at `ruflo@3.10.2` / `@claude-flow/cli@3.10.1`**, branch `main` @ commit `cdd5308d8`. Capability counts updated 2026-05-25 via quality-sweep audit (see `docs/QUALITY-SWEEP.md`).

### Test baseline

| Suite | Count | Status |
|---|---|---|
| `@claude-flow/cli` vitest | 1999 / 1999 | green, 0 failures, 46 intentionally skipped |
| `@claude-flow/plugin-agent-federation` vitest | 366 / 366 | green |
| **Combined audit-fix surface** | all encryption + federation + graph tests | green |

### Capability inventory (auto-generated via [`scripts/inventory-capabilities.mjs`](../scripts/inventory-capabilities.mjs))

| Surface | Count | Verified by |
|---|---|---|
| MCP tools | **323** | `verification/inventory.json` + quality-sweep audit 2026-05-25 |
| CLI commands (top-level) | **45** | quality-sweep audit 2026-05-25 (commands/index.ts) |
| Plugins (`plugins/ruflo-*`) | **33** | quality-sweep audit 2026-05-25 (33 dirs with .claude-plugin/plugin.json) |
| Agent definitions | **45** | quality-sweep audit 2026-05-25 (plugins/*/agents/*.md count) |

### Recently shipped (since `ruflo@3.6.24` published)

**Audit hardening Ã¢â‚¬â€ `audit_1776853149979`**:
- Command injection closed in `github-safe.js`, `statusline.js/cjs` (git calls), `github-tools` MCP (gh pr/issue/run), `update/executor` (npm install).
- Loader-hijack env vars (`LD_PRELOAD`, `NODE_OPTIONS`, `DYLD_*`) denied at the `terminal_create` boundary via `validateEnv()`.
- File mode 0600 enforced on session, terminal, memory stores via `fs-secure.writeFileRestricted`.
- MCP stdin DoS cap (10MB) on `bin/mcp-server.js` + `bin/cli.js` to prevent un-newlined-input OOM.
- Fetch timeouts on `verify` + IPFS HEAD probe.

**Encryption at rest Ã¢â‚¬â€ [ADR-096](../v3/docs/adr/ADR-096-encryption-at-rest.md), all 4 phases shipped**:
- AES-256-GCM vault module with magic-byte format (`RFE1`) for backward-compat migration.
- Opt-in via `CLAUDE_FLOW_ENCRYPT_AT_REST=1`; off-by-default preserves the 1865-test baseline.
- High-tier stores wired: `sessions/`, `terminals/`, `.swarm/memory.db` (sql.js SQLite + ONNX embeddings).
- 76 dedicated tests across vault primitives, integration, tamper detection, migration paths.

**Federation budget circuit breaker Ã¢â‚¬â€ [ADR-097](../v3/docs/adr/ADR-097-federation-budget-circuit-breaker.md), Phase 1 shipped**:
- `federation_send` accepts optional `budget`/`maxHops`/`hopCount`/`spent` metadata.
- Default `maxHops: 8` defangs recursive delegation loops even for callers that don't opt in.
- Constant-string error reasons (`HOP_LIMIT_EXCEEDED`, `BUDGET_EXCEEDED`, `INVALID_BUDGET`) Ã¢â‚¬â€ no oracle leak.
- Closes #1723 (and dup #1724).

### What's next

Tracked in the project task list (see GitHub Project / `TaskList`):

| Track | Status |
|---|---|
| ADR-096 Phase 5 Ã¢â‚¬â€ `ruflo doctor` encryption status | pending |
| ADR-096 Phase 5+ Ã¢â‚¬â€ keychain (`keytar`) + passphrase resolvers | deferred |
| ADR-097 Phase 2 Ã¢â‚¬â€ peer state machine (ACTIVE / SUSPENDED / EVICTED) | deferred |
| ADR-097 Phase 3 Ã¢â‚¬â€ `ruflo-cost-tracker` integration | deferred |
| ADR-097 Phase 4 Ã¢â‚¬â€ `ruflo doctor` peer state + `federation_breaker_status` MCP tool | deferred |
| `verification.md` per-MCP-tool witness signing | pending (task #25) |
| `verification.md` functional smoke tests for `ruflo verify --functional` | pending (task #26) |
| Batch publish `3.6.25` + witness manifest regen | pending |

### Verification

Every fix in `verification.md` is signed with Ed25519 keyed off the git commit. To verify your installed bytes match what was witnessed:

```bash
ruflo verify
```

The command fetches the manifest, recomputes SHA-256 for every cited file, re-derives the public key from the git commit, and verifies the signature. Drift in any fix produces a non-zero exit + a structured error pointing at the regressed file.

Per-capability witness signing for the full 300-tool / 49-command surface is in flight Ã¢â‚¬â€ see tasks #25 / #26.

## Where to go next

| If you want toÃ¢â‚¬Â¦ | Read this |
|---|---|
| Pitch / why-ruflo | [`README.md`](../README.md) |
| Day-to-day commands + config | This doc, plus [`USERGUIDE.md`](USERGUIDE.md) for depth |
| Architecture decisions | [`v3/docs/adr/`](../v3/docs/adr/) Ã¢â‚¬â€ ADR-093, ADR-095, ADR-096, ADR-097 are the recent ones |
| Cryptographic proof of build correctness | [`verification.md`](../verification.md) + [`ruflo verify`](#verification) |
| Plugin development | [`USERGUIDE.md` Ã¢â€ â€™ Plugin section](USERGUIDE.md#-ecosystem--integrations) |
| Open issues + roadmap | [GitHub Issues](https://github.com/pwnapplehat/ruflo/issues) |
