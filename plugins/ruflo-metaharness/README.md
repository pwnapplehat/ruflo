# ruflo-metaharness

MetaHarness integration plugin for ruflo. Surfaces the upstream `metaharness` / `harness` / `@metaharness/darwin` CLIs through eleven ruflo skills, honoring [ADR-150](../../v3/docs/adr/ADR-150-metaharness-integration-surfaces.md)'s architectural constraint that MetaHarness must remain a removable augmentation â€” never a required runtime dependency.

## ADR-150 architectural constraint (load-bearing)

**Ruflo remains operational if every MetaHarness package is removed.** Every code path in this plugin satisfies four rules:

1. **Removable** â€” no static `import '@metaharness/*'` outside the optional-router path in `v3/@claude-flow/cli/src/ruvector/neural-router.ts`.
2. **Optional in package.json** â€” `metaharness` is in `optionalDependencies`, never `dependencies`.
3. **Graceful degradation** â€” every script catches `MODULE_NOT_FOUND`/network failure and emits `{ degraded: true, reason: 'metaharness-not-available' }` JSON, exits 0. The graceful path is the default behavior, not a special case.
4. **CI gate** â€” `no-metaharness-smoke.yml` runs the plugin smoke with `npm install --no-optional` and asserts the contract still passes.

## Skills

| Skill | Usage | Description |
|-------|-------|-------------|
| `harness-score` | `/harness-score [--path .] [--alert-on-fit-below 70]` | 5-dim readiness scorecard (harnessFit/compile/coverage/safety/memory + cost) |
| `harness-genome` | `/harness-genome [--path .] [--alert-on-risk-above 0.5]` | 7-section categorical report (repo_type/topology/risk/mcp/test/publish) |
| `harness-mcp-scan` | `/harness-mcp-scan [--path .] [--fail-on high]` | Static MCP security findings â€” pure-read, no dispatch |
| `harness-threat-model` | `/harness-threat-model [--path .] [--fail-on high]` | Enterprise-grade threat model (clean/low/medium/high + findings) |
| `harness-mint` | `/harness-mint --name <id> --template <id> [--confirm]` | Scaffold a custom harness; DRY-RUN by default; refuses project-root writes |
| `harness-similarity` | `/harness-similarity --a a.json --b b.json [--per-dimension] [--alert-below 0.5]` | ADR-152 Â§3.1 weighted similarity between two harness fingerprints (cosine + categorical + jaccard) |
| `harness-oia-audit` | `/harness-oia-audit [--path .] [--alert-on-worst high] [--dry-run]` | Composite Phase-2 audit (oia-manifest + threat-model + mcp-scan) into `metaharness-audit` namespace |
| `harness-drift-from-history` | `/harness-drift-from-history [--baseline-since 7d] [--threshold 0.95]` | 1-command drift detection â€” composes audit-list + oia-audit + audit-trend |
| `harness-bench` | `/harness-bench --op create\|verify --repo <path>` | Manage `@metaharness/darwin` bench suites â€” fixed evaluation corpora for `harness-evolve` |
| `harness-evolve` | `/harness-evolve --repo <path> [--generations 3] [--sandbox real\|mock\|agent]` | Run `@metaharness/darwin evolve` â€” mutate seven policy surfaces, sandbox-score variants, promote measured wins |
| `harness-security-bench` | `/harness-security-bench [--population 2] [--cycles 1] [--alert-on-fail]` | "Darwin Shield" / ADR-155 â€” evolve a security-detection harness against a 10-vuln corpus |

## Phase-0 baseline (ruflo itself, 2026-06-16)

```json
{
  "harnessFit": 82,
  "compileConfidence": 100,
  "taskCoverage": 79,
  "toolSafety": 100,
  "memoryUsefulness": 40,
  "estCostPerRunUsd": 0.048,
  "recommendedMode": "CLI + MCP",
  "archetype": "typescript-sdk-harness",
  "template": "vertical:coding",
  "scaffoldReady": true,
  "risk_score": 0.27,
  "publish_readiness": 0.9
}
```

## Architecture

All skills use subprocess invocation through the `_harness.mjs` shared helper:

```
skills/X/SKILL.md â†’ scripts/X.mjs â†’ scripts/_harness.mjs â†’ spawnSync('npx', ['metaharness', â€¦])
                                                  â†˜ on MODULE_NOT_FOUND â†’ emit degraded JSON, exit 0
```

This means:
- No library import overhead on ruflo's boot path
- 60s hard timeout per subprocess (bounded blast radius)
- `--json` flag forced for structured parsing
- Graceful degradation is a single helper used by every skill

## Cross-links

- [ADR-150](../../v3/docs/adr/ADR-150-metaharness-integration-surfaces.md) â€” decision + architectural constraint
- [Issue #2399](https://github.com/pwnapplehat/ruflo/issues/2399) â€” phase rollout tracker
- [Research dossier](https://gist.github.com/ruvnet/19d166ff9acf368c9da4172d91ac9113) â€” full graded-evidence sourcing
- [Upstream](https://github.com/ruvnet/agent-harness-generator) â€” `metaharness` source
- ADR-148/149 â€” `@metaharness/router` cost-optimal routing (sibling integration)
