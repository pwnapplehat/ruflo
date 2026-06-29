# Ruflo Federation Ã¢â‚¬â€ User Guide

> Cross-installation agent peering with built-in cost limits, circuit breaker, signed envelopes, and (as of alpha.14) opt-in WireGuard mesh layer governed by federation trust.

This guide walks through what federation is, when to use it, and how to set it up. For the architectural backstory and per-phase release notes see the [companion gist](https://gist.github.com/ruvnet/3b5111a2ea7e450ff262ce96e88560bf).

## What federation does

Federation lets two or more Ruflo installations Ã¢â‚¬â€ your mac, a server, a teammate's laptop Ã¢â‚¬â€ discover each other, exchange signed manifests, and send messages between them with bounded cost and per-peer trust gates. Key properties:

- **Ed25519 identity** Ã¢â‚¬â€ each node holds a private key; peers exchange Ed25519-signed manifests. No central directory.
- **Five-level trust ladder** Ã¢â‚¬â€ `UNTRUSTED Ã¢â€ â€™ VERIFIED Ã¢â€ â€™ ATTESTED Ã¢â€ â€™ TRUSTED Ã¢â€ â€™ PRIVILEGED`. Each level unlocks a wider set of operations (`discovery`, `send`, `share-context`, `remote-spawn`, Ã¢â‚¬Â¦).
- **Per-peer budget + circuit breaker** Ã¢â‚¬â€ bounded tokens/USD per peer. Sustained failures auto-SUSPEND; further failures EVICT. ADR-097.
- **PII pipeline + audit trail** Ã¢â‚¬â€ every cross-peer envelope passes through PII detection. Every state transition is auditable.
- **Real wire transport** Ã¢â‚¬â€ WSS with permessage-deflate compression, optional cert pinning, stream multiplexing. ADR-104.
- **Optional WG mesh layer** Ã¢â‚¬â€ opt-in opaque packet-layer reachability that follows federation trust changes. Compromised peer auto-isolated at L3 when the breaker fires. ADR-111.

## When to use federation

| Use case | Fit |
|---|---|
| Two laptops collaborating on a project, want bounded cost sharing + audit | Ã¢Å“â€¦ |
| Personal home server agent Ã¢â€ â€ travel laptop | Ã¢Å“â€¦ |
| Team of 5 engineers sharing memory/skills across machines | Ã¢Å“â€¦ |
| Mobile / Windows / sub-50 peers with NAT issues | Ã¢Å“â€¦ over Tailscale + federation |
| Public-internet exposed agent endpoints | Ã¢Å“â€¦ with TLS cert pinning (ADR-107) |
| Internal HR/finance multi-agent workflow with strict access tiers | Ã¢Å“â€¦ with PRIVILEGED gating + audit |
| Replacing Slack/Discord Ã¢â‚¬â€ no | Ã¢ÂÅ’ federation is for agent-to-agent, not human chat |
| Untrusted-internet messaging without identity vetting | Ã¢ÂÅ’ Ã¢â‚¬â€ trust ladder must be bootstrapped out-of-band |

## Quick start

### 1. Install the plugin

```bash
npx ruflo@latest                                     # if you don't have it yet
npx ruflo plugins install @claude-flow/plugin-agent-federation
```

Or directly via npm:

```bash
npm i @claude-flow/plugin-agent-federation@latest    # currently 1.0.0-alpha.14
```

### 2. Initialize a node

```bash
npx ruflo@latest agent spawn -t federation --name fed-1
```

Or via the MCP tool `federation_init`:

```json
{
  "tool": "federation_init",
  "params": {
    "nodeId": "my-mac",
    "endpoint": "ws://my-mac.tailnet:9100",
    "agentTypes": ["coder", "tester"]
  }
}
```

This generates an Ed25519 keypair (persisted to `.claude-flow/federation/keys-<nodeId>.json`, mode 0600), publishes a signed manifest, and starts the discovery service.

### 3. Join a peer

```json
{
  "tool": "federation_join",
  "params": {
    "endpoint": "ws://other-host.tailnet:9100"
  }
}
```

The handshake exchanges manifests, verifies Ed25519 signatures, and establishes the initial trust level (`UNTRUSTED` until the trust-evaluator records enough successful interactions to promote).

### 4. Send a message

```json
{
  "tool": "federation_send",
  "params": {
    "targetNodeId": "other-host",
    "messageType": "agent-handoff",
    "payload": { "task": "Investigate the failing integration test" }
  }
}
```

Budget and trust gates apply: if the peer is below `ATTESTED`, only `discovery`/`status`/`ping` go through. If the breaker has the peer SUSPENDED, the send short-circuits with `PEER_SUSPENDED`.

## MCP tools at a glance

| Tool | What it does | Trust gate |
|---|---|---|
| `federation_init` | Initialize this node | Ã¢â‚¬â€ |
| `federation_join` | Join a peer by endpoint | Ã¢â‚¬â€ |
| `federation_peers` | List discovered peers | Ã¢â‚¬â€ |
| `federation_send` | Send a typed message to a peer | per-peer (varies) |
| `federation_query` | Synchronous query Ã¢â€ â€™ response | `ATTESTED+` |
| `federation_status` | Current node + peer trust summary | Ã¢â‚¬â€ |
| `federation_trust` | View / adjust trust levels | operator |
| `federation_audit` | Read audit log | operator |
| `federation_breaker_status` | Per-peer state, when changed, why | Ã¢â‚¬â€ |
| `federation_evict` | Operator manual evict | operator |
| `federation_reactivate` | Operator manual reactivate | operator |
| `federation_report_spend` | Report cost of a completed call | integrator |
| `federation_consensus` | Federated proposal across peers | varies |
| **`federation_wg_status`** | (ADR-111) Per-peer mesh state | Ã¢â‚¬â€ |
| **`federation_wg_attest`** | (ADR-111) Operator-signed witness entry | operator |
| **`federation_wg_keyrotate`** | (ADR-111) Rotate WG keypair | operator + `confirm:true` |

## Trust levels Ã¢â‚¬â€ what each unlocks

| Level | Capabilities (federation) | WG reachability (if ADR-111 active) |
|---|---|---|
| `UNTRUSTED` | `discovery` | Excluded from mesh Ã¢â‚¬â€ drop all |
| `VERIFIED` | `+ status, ping` | Discovery port (9100) only |
| `ATTESTED` | `+ send, receive, query-redacted` | + federation messaging (9101-9199) |
| `TRUSTED` | `+ share-context, collaborative-task` | + ssh (22), services (80/443) |
| `PRIVILEGED` | `+ full-memory, remote-spawn` | Full mesh |

Trust is earned via repeated successful interactions (the `TrustEvaluator` tracks score + interaction count). Promotion thresholds are documented in `domain/entities/trust-level.ts`.

## Circuit breaker

If a peer's failure ratio or cost spend exceeds the policy:

```
ACTIVE Ã¢â€ â€™ SUSPENDED Ã¢â€ â€™ EVICTED
   Ã¢â€ â€˜          Ã¢â€â€š
   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬operator-onlyÃ¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
```

- **SUSPEND**: peer's outbound sends short-circuit (`PEER_SUSPENDED`). Existing sessions continue; new sends rejected. Auto-eviction on continued failures.
- **EVICT**: peer's outbound sends short-circuit (`PEER_EVICTED`). Session terminated. Operator must explicitly reactivate.
- The breaker **does not auto-reactivate**. The integrator's health probe is responsible for confirming the peer is healthy and calling `federation_reactivate`.

Policy is tunable; defaults are conservative (50+ samples needed before suspend, high failure ratio threshold).

## ADR-111 Ã¢â‚¬â€ WireGuard mesh (opt-in, since alpha.14)

Federation today treats network connectivity as the integrator's problem (Tailscale, LAN, wss://+pinning). That works but trust changes don't propagate to the L3 layer Ã¢â‚¬â€ a peer EVICTED in federation stays in the tailnet until an admin manually removes it.

ADR-111 closes that gap with an optional in-tree WG mesh:

- WG keypair generated alongside the federation key
- Mesh IP derived deterministically from `nodeId` (sha256 Ã¢â€ â€™ `10.50.0.0/16` host portion, with collision-handling probe loop)
- WG identity published inside the same Ed25519-signed manifest
- Federation breaker SUSPEND Ã¢â€ â€™ `wg set ... allowed-ips ""` (soft-block at L3)
- Federation breaker EVICT Ã¢â€ â€™ `wg set ... remove` (terminal)
- Operator reactivate Ã¢â€ â€™ AllowedIPs restored
- Each mutation entered into an append-only Ed25519-signed witness chain

**Phases shipped in alpha.14:**
- Phase 1 Ã¢â‚¬â€ Manifest extension + key generation
- Phase 2 Ã¢â‚¬â€ `WgMeshService` (no shell Ã¢â‚¬â€ emits configs + commands)
- Phase 3 Ã¢â‚¬â€ Coordinator/breaker wiring
- Phase 4 Ã¢â‚¬â€ Firewall projection (`nftables` / `pf`) Ã¢â‚¬â€ PR #1895
- Phase 5 Ã¢â‚¬â€ Witness attestation chain Ã¢â‚¬â€ PR #1895
- Phase 6 Ã¢â‚¬â€ Operator MCP tools Ã¢â‚¬â€ PR #1895

**Phase 7 Ã¢â‚¬â€ operator-mediated**:
See [`docs/federation/phase7-mesh-bringup.md`](./phase7-mesh-bringup.md) for the cross-OS bringup procedure (mac Ã¢â€ â€ ruvultra over Tailscale).

### Enabling ADR-111

Set `config.wgMesh: true` in your federation plugin config, then run the staging helper:

```bash
node v3/@claude-flow/plugin-agent-federation/scripts/phase7-stage.mjs \
  <localNodeId> <peerNodeId> <peerPubkey> <peerMeshIP> <peerEndpoint>
```

The script generates `/tmp/adr-111-stage/`:
- `wg-key-<nodeId>.json` (mode 0600 Ã¢â‚¬â€ your private WG key)
- `ruflo-fed.conf` (the wg-quick interface config)
- `ruflo-fed.nft` or `ruflo-fed.pf` (firewall projection)

After review, the operator manually activates:

```bash
sudo install -m 0600 /tmp/adr-111-stage/ruflo-fed.conf /etc/wireguard/ruflo-fed.conf
# Linux:
sudo nft -f /tmp/adr-111-stage/ruflo-fed.nft
# macOS:
sudo pfctl -a ruflo-fed -f /tmp/adr-111-stage/ruflo-fed.pf
sudo wg-quick up ruflo-fed
```

## Using `claude -p` headless mode

`claude -p` (print/pipe mode) can drive federation MCP tools non-interactively. Each invocation processes its prompt and exits Ã¢â‚¬â€ for a persistent federation listener, run a long-lived MCP server instead.

**On the originating host** (mac mini):

```bash
claude -p --model haiku --max-budget-usd 0.20 --output-format text \
  "Federation MCP tools to verify cross-machine peering health: name 3. One line."
# Ã¢â€ â€™ Three Federation MCP tools for peering health verification:
#   federation-init (keypair generation), federation-status (peers/trust/metrics),
#   federation-audit (compliance filtering).
```

**On the peer host (ruvultra)** Ã¢â‚¬â€ requires interactive `/login` first since `claude -p` reads stored credentials:

```bash
# First time only Ã¢â‚¬â€ operator-mediated:
claude   # then /login

# After that:
claude -p --model haiku --max-budget-usd 0.20 \
  "Run federation_status MCP and report peer count."
```

**Workflow for cross-machine task handoff:**

```bash
# Host A Ã¢â‚¬â€ kick off a federated task:
claude -p --model sonnet --output-format json --resume <session> \
  "Use federation_send to dispatch this task to ruvultra: analyze the failing test"

# Host B (ruvultra) Ã¢â‚¬â€ receive + work:
claude -p --resume <session> "Continue handling the federated task"
```

The federation plugin handles signing, PII gating, breaker, and audit on every send. The two `claude -p` invocations don't share state directly Ã¢â‚¬â€ they communicate exclusively through the federation envelope channel.

## Anti-goals Ã¢â‚¬â€ when **NOT** to use federation

- **Replacement for Slack/Discord.** Federation moves agent envelopes, not human chat.
- **Public internet without identity vetting.** Trust ladder bootstrapping is your responsibility.
- **NAT traversal magic.** Use Tailscale (or Headscale) for that; federation rides on top.
- **A general-purpose RPC framework.** It's specifically for AI agents with cost-aware budgeting.

## Where things live

| What | Path |
|---|---|
| Plugin source | `v3/@claude-flow/plugin-agent-federation/src/` |
| Tests | `v3/@claude-flow/plugin-agent-federation/__tests__/` |
| ADRs | `v3/docs/adr/ADR-{097,104,105,106,107,109,110,111}-*.md` |
| Phase 7 staging script | `v3/@claude-flow/plugin-agent-federation/scripts/phase7-stage.mjs` |
| Witness signing | `plugins/ruflo-core/scripts/witness/` |

## Releases

| Version | What landed |
|---|---|
| `1.0.0-alpha.9` | First user-visible release Ã¢â‚¬â€ see [announcement gist](https://gist.github.com/ruvnet/3b5111a2ea7e450ff262ce96e88560bf) |
| `1.0.0-alpha.10` | ADR-097 Phases 2.a-4 + ADR-104 transport + ADR-109 inbound dispatcher |
| `1.0.0-alpha.11-12` | ADR-109 sig verify, ADR-104 compression, ADR-107 TLS cert pinning |
| `1.0.0-alpha.13` | ADR-104 stream multiplexing + ADR-110 MemorySpendReporter |
| **`1.0.0-alpha.14`** | **ADR-111 Phases 1-3 (WG mesh foundation)** |
| `1.0.0-alpha.15` (in flight) | ADR-111 Phases 4-6 (firewall + witness + MCP tools) Ã¢â‚¬â€ PR #1895 |

## Related ADRs

- [ADR-097](../../v3/docs/adr/ADR-097-federation-budget-circuit-breaker.md) Ã¢â‚¬â€ budget + circuit breaker
- [ADR-104](../../v3/docs/adr/ADR-104-federation-wire-transport.md) Ã¢â‚¬â€ WSS transport + multiplexing
- [ADR-105](../../v3/docs/adr/ADR-105-federation-v1-state-snapshot.md) Ã¢â‚¬â€ state snapshot/replay
- [ADR-106](../../v3/docs/adr/ADR-106-peer-discovery.md) Ã¢â‚¬â€ discovery mechanisms
- [ADR-107](../../v3/docs/adr/ADR-107-federation-tls.md) Ã¢â‚¬â€ TLS + cert pinning
- [ADR-109](../../v3/docs/adr/ADR-109-federation-inbound-dispatcher.md) Ã¢â‚¬â€ inbound dispatch + sig verify
- [ADR-110](../../v3/docs/adr/ADR-110-federation-memory-spend-reporter.md) Ã¢â‚¬â€ production SpendReporter
- [**ADR-111**](../../v3/docs/adr/ADR-111-federation-wg-mesh.md) Ã¢â‚¬â€ **WG mesh layer**

## Support

- Issues: https://github.com/pwnapplehat/ruflo/issues
- Tracking issue (ADR-111): [#1879](https://github.com/pwnapplehat/ruflo/issues/1879)
- Federation gist (current through alpha.14): https://gist.github.com/ruvnet/3b5111a2ea7e450ff262ce96e88560bf
- ADR-111 deep-dive gist: https://gist.github.com/ruvnet/c640fc71c7a6ced37908e645d5db84c5
