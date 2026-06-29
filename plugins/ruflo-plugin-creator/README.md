# ruflo-plugin-creator

Scaffold, validate, and publish new Claude Code plugins with proper structure, MCP tool wiring, AND the canonical plugin contract (ADR + smoke + Compatibility + namespace coordination).

## Install

```
/plugin marketplace add pwnapplehat/ruflo
/plugin install ruflo-plugin-creator@ruflo
```

## Features

- **Scaffold plugins**: Generate complete plugin directory structure in seconds, including the canonical contract (ADR-0001, scripts/smoke.sh, README contract sections)
- **Validate format**: Check plugin.json, SKILL.md frontmatter, and file references
- **MCP tool wiring**: Auto-discover and wire ruflo MCP tools into skills, with **drift warnings** for known-broken tool references (`embeddings_embed`, namespace passed to `agentdb_hierarchical-*` / `agentdb_pattern-*`)
- **Marketplace integration**: Update marketplace.json for distribution

## Commands

- `/create-plugin` -- Interactively scaffold a new Claude Code plugin

## Skills

- `create-plugin` -- Generate plugin structure with skills, commands, agents, ADR-0001, smoke test, and contract sections
- `validate-plugin` -- Validate plugin format and catch issues before publishing

## Compatibility

- **CLI:** pinned to `@claude-flow/cli` v3.6 major+minor.
- **Verification:** `bash plugins/ruflo-plugin-creator/scripts/smoke.sh` is the contract.

## Canonical plugin contract (what gets scaffolded)

Every plugin scaffolded by this plugin inherits the same shape every other plugin in the ruflo family adopted via its own ADR-0001:

```
plugins/<name>/
â”œâ”€â”€ .claude-plugin/plugin.json     # version, keywords, mcp keyword
â”œâ”€â”€ skills/<skill>/SKILL.md         # name + description + allowed-tools (no wildcards)
â”œâ”€â”€ commands/<command>.md           # name + description + dispatch logic
â”œâ”€â”€ agents/<agent>.md               # name + description + model
â”œâ”€â”€ docs/adrs/0001-<name>-contract.md   # ADR (Proposed) â€” pinning, namespace, smoke scope
â”œâ”€â”€ scripts/smoke.sh                # Structural contract, â‰¥8 checks
â””â”€â”€ README.md                       # Compatibility + Namespace coordination + Verification + ADR
```

## MCP-tool drift to avoid

Lessons learned from sibling-ADR fixes â€” the scaffolder warns about these:

| Bug | Real tool / pattern |
|-----|---------------------|
| `embeddings_embed` referenced as a tool | Use `embeddings_generate` (the `_embed` name does not exist) |
| `namespace` arg passed to `agentdb_hierarchical-*` | Use `tier` (working/episodic/semantic), or use `memory_*` for namespaced reads/writes |
| `namespace` arg passed to `agentdb_pattern-*` | Don't pass it â€” ReasoningBank routes; fallback writes to `pattern` reserved |
| `pattern` and `patterns` confused | They are **different** reserved namespaces |
| Hard-coded "19 AgentDB controllers" | Defer to `agentdb_controllers` runtime; real count varies (~15 MCP tools, 29 controller names) |

## Verification

```bash
bash plugins/ruflo-plugin-creator/scripts/smoke.sh
# Expected: "10 passed, 0 failed"
```

## Architecture Decisions

- [`ADR-0001` â€” ruflo-plugin-creator plugin contract (scaffold-the-canonical-contract, MCP-drift warnings, smoke as contract)](./docs/adrs/0001-plugin-creator-contract.md)

## Related Plugins

- `ruflo-agentdb` â€” namespace convention owner; `agentdb_controllers` runtime is the canonical controller list
- `ruflo-cost-tracker`, `ruflo-market-data`, `ruflo-migrations`, `ruflo-observability` â€” each fixed namespace-routing bugs the scaffolder now warns about
- `ruflo-knowledge-graph`, `ruflo-market-data` â€” each fixed `embeddings_embed` references the scaffolder now warns about
