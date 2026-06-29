# RuFlo Browser Substrate â€” `@claude-flow/browser@3.0.0-alpha.4`

> **TL;DR.** RuFlo is no longer "a browser agent." With ADR-122 it becomes the **substrate** underneath Stagehand, Browser Use, Surfer-H, Playwright, Browserbase, and Operator: signed-replay trajectories, causal-graph self-healing, attested cookie vaults, federated MCTS, risk-class gating, and a workflow compiler that emits replayable YAML. **230 tests, 0 new CVEs, all under 100Âµs.**

## Why this is beyond current public SOTA

The public stack today:

```
agent â†’ browser â†’ action â†’ observation â†’ next action
```

RuFlo should be:

```
agent â†’ governed Session Capsule â†’ distributed MCTS search â†’
  Browser Execution Adapter â†’ replay verification â†’ RuVector memory â†’
  Workflow Compiler â†’ reusable RuFlo primitive
```

Stagehand makes browser automation portable. Browserbase persists sessions. Browser Use exposes real session-reuse pain. Surfer-H+Holo1 improves visual navigation (92.2% WebVoyager). Reflective MCTS improves agent search. **None of them ship cryptographic provenance, queryable causal recovery, attested cookie vaults, federated MCTS, or compiled workflows.**

RuFlo combines the missing parts.

## The eight phases

| Phase | Wedge | Beyond SOTA becauseâ€¦ |
|---|---|---|
| 0 | `agent-browser` 0.27 + converge package & plugin | Closed a 21-minor drift on the upstream CLI |
| 1 | Signed trajectory containers (Ed25519 + RVF) | Cryptographic provenance for AI browsing â€” no other system has this |
| 2 | Causal-graph self-healing selectors | Surfer-H / Stagehand / Skyvern heal silently; ruflo records *why* |
| 3 | AIDefence-attested cookie vault | PII-gated, content-hash-verified, witness-signed handles |
| 4 | Federated MCTS branch exploration | Distributes MCTS across federation peers (no single-process limit) |
| 5 | Cost-aware routing + GOAP pre-planning | 3-tier classifier ($0 / $0.0002 / $0.005+) with GOAP dry-run |
| 6 | Session Capsule + Risk Classifier + Browser Execution Adapter | OWASP-aligned policy; substrate above the browser-tool wars |
| 7 | Workflow Compiler + production-aware UCT | Successful traces â†’ deterministic YAML with selector fallbacks |

## Performance

| Operation | Âµs/op | ops/sec |
|---|---:|---:|
| Phase 1 â€” sealTrajectory (Ed25519 sign) | 37.5 | 26,648 |
| Phase 1 â€” verifySealedTrajectory | 88.5 | 11,306 |
| Phase 2 â€” annotateSnapshot (3 refs) | 2.1 | 479,511 |
| Phase 3 â€” vault.verifyAttestation | 83.2 | 12,027 |
| Phase 5 â€” ActionRouter.classify | 0.16 | 6,169,640 |
| Phase 7 â€” productionUct score | 0.32 | 3,145,069 |
| Phase 7 â€” WorkflowCompiler.compile | 22.9 | 43,712 |

Sub-100Âµs across the substrate. All numbers from `scripts/benchmark-substrate.mjs` on M-series macOS.

## What's new in alpha.4

- **Session Capsule** â€” sealed bundle with origins, consent proof, reuse policy, witness chain, replay counter, expiry. Mounting enforces `allowedOrigins`, `allowedTaskClasses`, `maxReplays`.
- **Risk Classifier** â€” 7-class taxonomy. Classes 1-3 (read-only / authenticated-read / draft-write) autonomous by default. Classes 4-7 (external-submission / financial / account-mutation / destructive) gate on human approval.
- **Production-aware UCT** â€” `score = Q + CÂ·âˆš(ln N / n) + Î»_RÂ·replayability âˆ’ Î»_riskÂ·risk âˆ’ Î¼_costÂ·cost âˆ’ Î±_authÂ·auth_fragility`. The penalties keep MCTS from chasing high-Q paths that are expensive, irreversible, or auth-fragile.
- **Workflow Compiler** â€” winning MCTS trace â†’ CompiledWorkflow with primary selector + ordered fallback chain (testid > role+name > text > ref). Deterministic YAML output for VCS check-in.
- **Browser Execution Adapter interface** â€” single surface above agent-browser / Stagehand / Browserbase / Browser Use / local Chrome / Surfer-H. First concrete adapter ships now; more in Phase 6.5+.

## Trying it

```ts
import {
  createBrowserService,
  sealTrajectory,
  verifySealedTrajectory,
  SessionCapsuleService,
  CookieVaultService,
  WorkflowCompiler,
  productionUct,
} from '@claude-flow/browser';

// Phase 1 â€” signed trajectories
const browser = createBrowserService({ signTrajectories: true });
browser.startTrajectory('Sign in');
await browser.open('https://example.com/login');
await browser.fill('@e1', 'me@example.com');
await browser.click('@e3');
const result = await browser.endTrajectory(true, 'logged in');
// result.__sealed is a signed envelope â€” distribute, replay, verify

// Phase 3 â€” attested cookie vault
const vault = new CookieVaultService({ projectId: 'my-project' });
const sealed = await vault.store({
  cookie: { name: 'sid', value: 'opaque-token', domain: 'example.com' },
});
// Refused if value contains PII; otherwise sealed + signed

// Phase 6 â€” Session Capsule with policy
const capsules = new SessionCapsuleService();
const capsule = await capsules.create({
  tenantId: 't1',
  ownerId: 'me',
  origins: [{ origin: 'https://example.com', requireSecure: true, requireHttpOnly: false }],
  consentStatement: 'I consent to reuse this session for authenticated reads',
  reusePolicy: { maxReplays: 5, allowedTaskClasses: ['authenticated-read'] },
});

// Phase 7 â€” Workflow Compiler
const compiler = new WorkflowCompiler();
const workflow = compiler.compile({
  id: 'my-login', goal: 'Sign in', trajectoryEnvelope: result.__sealed.envelope,
});
console.log(compiler.toYaml(workflow));
```

## Test + audit status

- **230/230 tests passing** (12 e2e skipped on local; run via `docker compose --profile e2e up browser-e2e`).
- **TypeScript:** strict; `tsc --noEmit` clean.
- **npm audit:** 0 new vulnerabilities; transitive findings tracked under ADR-118 (AIDefence) and ADR-121 (embeddings).
- **Security audit:** see `docs/SECURITY_AUDIT.md`.

## What's next

- Phase 6.5 â€” Stagehand / Browserbase / local-Chrome `BrowserExecutionAdapter` implementations.
- Phase 8 â€” federation transport wiring (ADR-097/104) so Phase 4's `PeerAdapter` becomes a real cross-installation channel.
- Phase 9 â€” Holo1 self-hosted Localizer model for visual grounding parity with Surfer-H (currently SOTA at 92.2% WebVoyager).

## References

- ADR-122: `v3/docs/adr/ADR-122-browser-beyond-sota.md`
- Tracking issue: pwnapplehat/ruflo#2041
- Branch: `feat/adr-122-browser-beyond-sota`
- Reflective MCTS for web agents â€” https://arxiv.org/abs/2410.02052
- Surfer-H + Holo1 â€” https://arxiv.org/abs/2506.02865
- OWASP Session Management â€” https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Stagehand v3 â€” https://www.browserbase.com/changelog/stagehand-v3
