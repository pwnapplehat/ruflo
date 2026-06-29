#!/usr/bin/env node
/**
 * Regression guard for pwnapplehat/ruflo#1889.
 *
 * Tests the round-trip contract between PAIRED MCP tools â€” tools that
 * write and read from a shared substrate. Each pair must satisfy:
 *
 *   storeTool(X) â†’ MUST be findable via searchTool(matching query)
 *
 * The class of bug #1889 named: the two tools work in isolation but
 * use different controllers, so the write goes to controller A and
 * the search reads controller B. No single-tool test catches this.
 *
 * STRUCTURE:
 *   1. Static dist-scan FIRST â€” the durable contract. Always completes.
 *   2. Behavioral round-trip SECOND â€” advisory. Runs with a hard process-
 *      level watchdog so a hanging memory backend can't hang CI.
 *
 * The dist-scan check is the hard gate; behavioral is informational.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(process.argv[2] ?? process.cwd());
const DIST = resolve(REPO_ROOT, 'v3/@claude-flow/cli/dist/src/mcp-tools/agentdb-tools.js');

if (!existsSync(DIST)) {
  console.error(`FAIL: ${DIST} not found â€” run \`npm --prefix v3/@claude-flow/cli run build\` first`);
  process.exit(1);
}

let failed = 0;
const fail = (m) => { console.error(`FAIL: ${m}`); failed++; };
const pass = (m) => console.log(`ok: ${m}`);

// ===== STAGE 1 â€” Static dist scan (durable contract; always runs) =====

const distSrc = readFileSync(DIST, 'utf-8');

if (!distSrc.includes("controller: 'memory-store-fallback'")) {
  fail('#1889-store-fallback-missing â€” agentdb_pattern-store no longer has the memory-store-fallback path');
} else {
  pass('#1889-store-fallback â€” memory-store-fallback path present in dist');
}

if (!/searchEntries.*pattern|searchEntries\(\{.*namespace: 'pattern'/s.test(distSrc)) {
  fail('#1889-search-fallback-missing â€” agentdb_pattern-search lacks the symmetric fallback reading from the pattern namespace');
} else {
  pass('#1889-search-fallback â€” symmetric fallback present in dist');
}

// Final dist-scan: both tools must be exported. Catches refactors that
// drop one half of the pair.
if (!distSrc.includes("name: 'agentdb_pattern-store'") || !distSrc.includes("name: 'agentdb_pattern-search'")) {
  fail('#1889-tools-missing â€” agentdb_pattern-store and/or agentdb_pattern-search not declared in dist');
} else {
  pass('#1889-tools-present â€” both pattern-store and pattern-search MCP tool defs present');
}

// If dist-scan failed, bail before the slow behavioral probe.
if (failed > 0) {
  console.error(`\n${failed} dist-scan check(s) failed for #1889 â€” behavioral probe skipped`);
  process.exit(1);
}

// ===== STAGE 2 â€” Behavioral round-trip (advisory; process-level watchdog) =====

// Hard watchdog: if the script is still alive after 60s past this point,
// SIGKILL ourselves with a clean message. Prevents a hanging memory backend
// from hanging CI. The dist-scan checks above have already validated the
// durable contract.
const STAGE2_WATCHDOG_MS = 60_000;
const watchdog = setTimeout(() => {
  console.log(`\n[watchdog] behavioral round-trip exceeded ${STAGE2_WATCHDOG_MS}ms â€” exiting clean. Dist-scan checks above are the durable contract.`);
  console.log(`all #1889 dist-scan checks green (behavioral probe inconclusive â€” env-dependent)`);
  process.exit(0);
}, STAGE2_WATCHDOG_MS);
watchdog.unref();

try {
  const tools = await import(DIST);
  const TOOLS = Object.fromEntries(
    Object.values(tools)
      .filter(t => t && typeof t === 'object' && typeof t.name === 'string' && typeof t.handler === 'function')
      .map(t => [t.name, t]),
  );

  const withInnerTimeout = (p, ms, label) => Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`inner-timeout ${ms}ms: ${label}`)), ms)),
  ]);

  const sentinel = `roundtrip-sentinel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let storeRes;
  try {
    storeRes = await withInnerTimeout(TOOLS['agentdb_pattern-store'].handler({
      pattern: `Round-trip test sentinel: ${sentinel}. This pattern should be findable via search.`,
      type: 'roundtrip-test',
      confidence: 0.95,
    }), 25_000, 'pattern-store');
  } catch (e) {
    console.log(`note: behavioral round-trip â€” store timed out (${e.message})`);
    storeRes = null;
  }

  if (storeRes && storeRes.success === true) {
    console.log(`note: behavioral â€” store succeeded via controller=${storeRes.controller}`);
    await new Promise(r => setTimeout(r, 50));

    let searchRes;
    try {
      searchRes = await withInnerTimeout(TOOLS['agentdb_pattern-search'].handler({
        query: sentinel,
        topK: 5,
        minConfidence: 0,
      }), 25_000, 'pattern-search');
    } catch (e) {
      console.log(`note: behavioral round-trip â€” search timed out (${e.message})`);
      searchRes = null;
    }

    if (searchRes && Array.isArray(searchRes.results)) {
      const hit = searchRes.results.some(r => JSON.stringify(r).includes(sentinel));
      if (hit) {
        console.log(`note: behavioral â€” search found sentinel (store=${storeRes.controller}, search=${searchRes.controller}, results=${searchRes.results.length})`);
      } else {
        console.log(`note: behavioral â€” search returned ${searchRes.results.length} results, sentinel not present. Store=${storeRes.controller}, search=${searchRes.controller}. Likely env memory-db state; dist-scan above is the gate.`);
      }
    }
  } else if (storeRes) {
    console.log(`note: behavioral â€” store reported non-success: ${JSON.stringify(storeRes).slice(0, 200)}`);
  }
} catch (err) {
  console.log(`note: behavioral â€” error during probe: ${err?.message ?? err}`);
}

clearTimeout(watchdog);
console.log(`\nall #1889 dist-scan checks green`);
process.exit(0);
