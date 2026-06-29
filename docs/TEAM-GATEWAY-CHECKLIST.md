# Team Gateway Checklist

This checklist covers governance and safety gates for teams running Cursor-style agent workflows through a shared gateway or proxy. It supersedes ad-hoc runbooks and is enforced by the before-merge CI gates listed below.

Related: [#2058](https://github.com/pwnapplehat/ruflo/issues/2058)

---

## 1. Before-Merge Gates

Run these checks before every merge to main:

| Gate | Command | Blocks merge if |
|------|---------|-----------------|
| Lint | `npm run lint` | Any lint error |
| Type-check | `npx tsc --noEmit` | Any TypeScript error |
| Unit tests | `npm test` | Fewer than 1999 passing |
| Smoke tests | `node scripts/smoke-*.mjs` | Any exit code != 0 |
| Witness manifest | `npx ruflo@latest verify` | Checksum mismatch |
| Semver bump | `npm version <patch\|minor\|major>` | No version bump on API change |

Every merge to main **must** record a new witness manifest entry. Generate it with:

```bash
npx ruflo@latest sign --message "merge: <PR title>"
```

---

## 2. Multi-Agent Handoff

When handing work between different agent workers:

1. **Shared memory namespace**: use `collaboration` Ã¢â‚¬â€ all cross-platform writes go here.
2. **Store design decisions before switching platforms**:
   ```bash
   npx ruflo@latest memory store \
     --namespace collaboration \
     --key "design-<feature>" \
     --value "<design decisions as JSON or markdown>"
   ```
3. **Kick off the next worker after the first produces the design:
   ```bash
   npx ruflo@latest agent spawn \
     --worker "codex:coder:Implement based on design-<feature>" \
     --namespace collaboration
   ```
4. **Validate compatibility before shipping** Ã¢â‚¬â€ OpenAI-compatible and Anthropic-compatible endpoints are verified subsets. Always smoke-test streaming, tool calling / MCP, and reasoning blocks independently before putting them in an autonomous workflow.
5. **Keep provider keys separate** Ã¢â‚¬â€ gateway or proxy keys must be distinct from upstream provider keys and must be rotatable / revocable without rotating the upstream secret.

---

## 3. Memory Namespace Sharing

All agents in a team workflow share state through named namespaces. Conventions:

| Namespace | Owner | Contents |
|-----------|-------|----------|
| `collaboration` | All cross-platform agents | Design decisions, code paths, review findings |
| `patterns` | All agents | Reusable solution patterns (stored after each successful task) |
| `tasks` | Coordinator | Task assignments and status |
| `security` | Security auditor | Vulnerability findings, remediation status |

Rules:
- Never write credentials or raw API keys to any namespace Ã¢â‚¬â€ store only key names or rotation identifiers.
- Namespaces are **not** access-controlled by default; treat all shared namespaces as readable by every agent in the swarm.
- Use `--ttl` to expire ephemeral coordination messages (e.g., handoff signals):
  ```bash
  npx ruflo@latest memory store \
    --namespace collaboration \
    --key "handoff-signal-<run-id>" \
    --value "ready" \
    --ttl 300
  ```

---

## 4. Witness Manifest Entry Per Merge

Each merge to main must include a signed witness manifest entry so `npx ruflo@latest verify` can confirm the installed dist matches the audited fix footprint.

### Generating a manifest entry

```bash
# Sign the current dist with a descriptive message
npx ruflo@latest sign --message "merge: <PR-number> Ã¢â‚¬â€ <one-line description>"

# Commit the updated manifest alongside code changes
git add verification.md verification.md.json
git commit -m "chore: update witness manifest for <PR-number>"
```

### Verifying an installation

```bash
# After npm install / npx ruflo@latest
npx ruflo@latest verify
# Expected output: "Verification passed Ã¢â‚¬â€ dist matches audited footprint"
```

If `verify` reports a mismatch, do **not** use the installation in a shared gateway until the discrepancy is investigated and a new manifest is signed.

---

## 5. Gateway Logging and Audit Scope

Be explicit with teammates about what your gateway logs contain:

- **Logged**: usage metadata (tokens, model, latency), route, HTTP status, error class.
- **Not logged by default**: prompt content or completion content (check your gateway config).
- Avoid unauthenticated shared gateway access outside local experiments.
- Review `CLAUDE_FLOW_LOG_LEVEL=debug` output before sharing logs Ã¢â‚¬â€ debug level may include request bodies.

---

## See Also

- [AGENT_CONTRIBUTOR.md](../docs/AGENT_CONTRIBUTOR.md) Ã¢â‚¬â€ how to contribute as an agent or swarm participant
- [USERGUIDE.md](../docs/USERGUIDE.md) Ã¢â‚¬â€ full usage documentation
- [ADR index](../docs/) Ã¢â‚¬â€ architectural decision records
