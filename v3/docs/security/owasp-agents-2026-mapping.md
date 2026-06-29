# OWASP Top 10 for Agentic Applications 2026 â€” Ruflo control mapping

**Reference**: OWASP Gen AI Security Project, "OWASP Top 10 for Agentic Applications" (Dec 2025, 100+ contributors).
**Issue**: [pwnapplehat/ruflo#2149](https://github.com/pwnapplehat/ruflo/issues/2149)
**Last updated**: 2026-05-26

## Legend

| Symbol | Meaning |
|---|---|
| âœ“ | Covered â€” controls present and validated |
| â— | Partial â€” some surfaces covered, gaps documented |
| âœ— | Open â€” no Ruflo control yet, tracked for future work |

## Matrix

| ID | Risk | Coverage | Ruflo controls | Gaps / follow-ups |
|---|---|---|---|---|
| **ASI01** | **Agent Goal Hijacking** (indirect prompt injection via retrieved content) | â— | `ToolOutputGuardrail` (ADR-131) â€” class shipped, integration phased: P2 MCP tool dispatch, P3 memory read, P4 swarm payload | Phase 2â€“4 wiring tracked under ADR-131 |
| **ASI02** | **Excessive Tool Permissions** (over-broad tool access) | â— | `SafeExecutor` allowed-commands list; claims-based authorization (ADR-101); init-time tool permissions in settings.json | No per-tool runtime-scoping inside agent reasoning; no tool-use telemetry |
| **ASI03** | **Insecure Tool Invocation** (unsafe arg construction, shell injection) | âœ“ | `SafeExecutor` (HIGH-1 CVE fix), `InputValidator` Zod schemas at boundary, `PathValidator` for FS args | â€” |
| **ASI04** | **Insecure Output Handling** (untrusted agent output flows downstream) | â— | AIDefence threat detection (ADR-118), `sanitizeHtml` / `sanitizePath` helpers | No structured taint propagation between tool calls |
| **ASI05** | **Compromised Memory** (poisoned long-term memory) | â— | AgentDB witness manifest (ADR-103); `ToolOutputGuardrail` planned for memory read path (ADR-131 P3) | Memory write screening is open |
| **ASI06** | **Excessive Agency** (agent acts beyond intended scope) | â— | Claims (ADR-101), hierarchical swarm topology w/ Raft consensus, witness verify | No quorum gate on irreversible actions (delete, transfer, deploy) |
| **ASI07** | **Insecure Inter-Agent Communication** (message tampering) | âœ“ | Federation TLS (ADR-107), Ed25519 witness signing, claims-based handoff | â€” |
| **ASI08** | **Sensitive Data Leakage** (secrets in prompts / logs / outputs) | â— | `PII_PATTERNS` in AIDefence, `TokenGenerator` rotation, env-var-precedence guard (#2144) | No deterministic egress filter on tool output before model context |
| **ASI09** | **Insecure Plugin / Extension** (untrusted plugin code execution) | â— | Plugin signature + supply-chain audit (#2046); allowlist; CVE scan in `audit-plugin-packages.mjs` | Plugin hooks run unsandboxed; no per-plugin capability boundary |
| **ASI10** | **Insufficient Logging & Monitoring** (no audit trail for agent decisions) | â— | Witness manifest (ADR-103), trajectory logs in SONA, cost-tracker | No structured security-event channel; no signed audit log |

## Highest-priority gaps (by exploitability Ã— impact)

1. **ASI01 indirect prompt injection** â€” *being addressed*. `ToolOutputGuardrail` class shipped in ADR-131 P1. Integration into MCP dispatch (P2) and memory read (P3) is the next wave.
2. **ASI06 excessive agency** â€” no quorum gate on destructive operations. A swarm-level "require-N-approvals" check before irreversible tool calls is the natural next ADR.
3. **ASI09 plugin sandboxing** â€” plugins execute hooks with full host capability. Capability tokens or `vm` isolation are candidates; no ADR yet.
4. **ASI10 audit log** â€” no signed append-only event channel for security decisions. Witness manifest covers releases but not runtime agent events.

## How to update this matrix

When a new control ships, update the relevant row's "Coverage" column and add the control reference. When a new gap is identified, add a follow-up bullet linking to the issue/ADR. If you flip â— â†’ âœ“, link the validating PR + test.

This file is intended to evolve alongside the OWASP 2026 living document; cross-check against the upstream version quarterly.
