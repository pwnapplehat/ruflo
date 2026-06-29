#!/usr/bin/env node
/**
 * Convert ruflo agent definitions from Claude Code format to Cursor's native
 * .cursor/agents/*.md format.
 *
 * Cursor agent frontmatter (verified against cursor.com/docs/subagents 2026-06-29):
 *   name        — lowercase + hyphens; defaults to filename
 *   description — shown in Task-tool hints; agent reads it to decide delegation
 *   model       — "inherit" (default) or a specific model id
 *   readonly    — true = no edits / no state-changing shell commands
 *   is_background — true = runs without blocking the parent
 *
 * Claude Code agent frontmatter (ruflo's current format):
 *   name, description, type, capabilities, hooks.pre/post, tools
 *
 * Conversion rules:
 *   - name → keep (lowercase + hyphens; derive from filename if missing)
 *   - description → keep; if missing, derive from the first non-heading body line
 *   - type → DROP; used to INFER readonly + is_background:
 *       coder/impl/tester/coordinator      → readonly:false, is_background:false
 *       reviewer/auditor/architect/researcher/security-/performance- agents → readonly:true
 *       background worker types            → is_background:true
 *   - capabilities → DROP (preserved in the body if explicitly listed)
 *   - hooks → DROP (Cursor agents have no hooks field; handled via .cursor/hooks.json)
 *   - tools → DROP (verified: "there is no tools field — that's Claude Code syntax, not Cursor")
 *   - model → ADD: "inherit" (default); lightweight routers could use a fast model
 *
 * Usage:
 *   node scripts/convert-agents-to-cursor.mjs [--src <dir>] [--dst <dir>] [--dry-run]
 *
 * Defaults:
 *   --src .claude/agents (plus v3/@claude-flow/cli/.claude/agents)
 *   --dst .cursor/agents
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const READONLY_TYPES = new Set([
  'reviewer', 'auditor', 'architect', 'researcher', 'security-architect',
  'security-auditor', 'performance-engineer', 'memory-specialist',
]);
const BACKGROUND_TYPES = new Set([
  'map', 'audit', 'optimize', 'consolidate', 'predict', 'preload',
  'deepdive', 'document', 'refactor', 'benchmark', 'testgaps', 'ultralearn',
  'background', 'worker',
]);

function parseArgs(argv) {
  const args = { src: [], dst: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--src') { args.src.push(argv[++i]); }
    else if (argv[i] === '--dst') { args.dst = argv[++i]; }
    else if (argv[i] === '--dry-run') { args.dryRun = true; }
  }
  if (args.src.length === 0) {
    args.src = [
      join(ROOT, '.claude', 'agents'),
      join(ROOT, 'v3', '@claude-flow', 'cli', '.claude', 'agents'),
    ];
  }
  if (!args.dst) args.dst = join(ROOT, '.cursor', 'agents');
  return args;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: content, hasFrontmatter: false };
  const yaml = m[1];
  const body = m[2];
  const frontmatter = {};
  const lines = yaml.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const km = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!km) continue;
    const key = km[1];
    let val = km[2].trim();
    // YAML block scalar: | (literal) or > (folded)
    if (val === '|' || val === '>') {
      const block = [];
      // Read indented continuation lines
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (next === '') { block.push(''); continue; }
        if (/^\s+/.test(next)) { block.push(next.replace(/^\s+/, '')); continue; }
        break;
      }
      val = block.join(' ').replace(/\s+/g, ' ').trim();
      i = j - 1; // advance outer loop past the block scalar continuation lines
    } else if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    // Only keep the first occurrence of each key (top-level)
    if (!(key in frontmatter)) frontmatter[key] = val;
  }
  return { frontmatter, body, hasFrontmatter: true };
}

function deriveDescription(body, name) {
  // First non-empty, non-heading line of the body
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('#')) continue;
    if (t.startsWith('---')) continue;
    // Truncate to ~160 chars for a concise description
    return t.length > 160 ? t.slice(0, 157) + '...' : t;
  }
  return `Ruflo ${name} agent`;
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function convert(frontmatter, body, filename) {
  const rawName = frontmatter.name || basename(filename, '.md');
  const name = slugify(rawName) || slugify(filename);
  const description = frontmatter.description || deriveDescription(body, name);
  const type = String(frontmatter.type || '').toLowerCase();
  const nameLower = name.toLowerCase();
  const bodyLower = body.slice(0, 600).toLowerCase();

  // Infer readonly from type, name, or body intro. Claude Code agents often
  // omit the `type` field, so we also match on the agent name and the first
  // paragraph of the body.
  const readonlyHint =
    READONLY_TYPES.has(type) ||
    /\b(review|audit|architect|research|security|performance|memory-specialist|inspect|verify|analy)\b/i.test(type) ||
    /\b(review|audit|architect|research|security|performance|memory-specialist|inspect|verify|analy)\b/i.test(nameLower) ||
    /\b(code review|security audit|architecture review|read-only|read only|does not (write|edit|modify))\b/i.test(bodyLower);
  const readonly = Boolean(readonlyHint);

  // Infer is_background from type/name (long-running daemon workers)
  const isBackground = BACKGROUND_TYPES.has(type) ||
    /\b(background|worker|daemon)\b/i.test(type) ||
    BACKGROUND_TYPES.has(nameLower) ||
    /-worker$|-daemon$/.test(name) ||
    /\b(background|long-running|daemon)\b/i.test(nameLower);

  const model = frontmatter.model || 'inherit';

  // Cursor frontmatter — ONLY the 5 verified fields, in canonical order
  const cursorFm = [
    '---',
    `name: "${name}"`,
    `description: "${description.replace(/"/g, '\\"')}"`,
    `model: ${model}`,
    `readonly: ${readonly}`,
    `is_background: ${isBackground}`,
    '---',
    '',
  ].join('\n');

  return cursorFm + body.trimStart() + '\n';
}

function walkDir(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkDir(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  let total = 0;
  let converted = 0;
  let skipped = 0;
  const seen = new Set();

  for (const src of args.src) {
    const files = walkDir(src);
    for (const file of files) {
      total++;
      try {
        const content = readFileSync(file, 'utf-8');
        const { frontmatter, body, hasFrontmatter } = parseFrontmatter(content);
        const filename = basename(file);
        const name = slugify(frontmatter.name || filename.replace(/\.md$/, ''));
        if (!name) { skipped++; continue; }
        if (seen.has(name)) { skipped++; continue; } // dedupe across src dirs
        seen.add(name);

        const out = convert(frontmatter, body, filename);
        const dstFile = join(args.dst, name + '.md');

        if (args.dryRun) {
          process.stdout.write(`[dry-run] ${relative(ROOT, file)} -> ${relative(ROOT, dstFile)}\n`);
        } else {
          mkdirSync(args.dst, { recursive: true });
          writeFileSync(dstFile, out, 'utf-8');
        }
        converted++;
      } catch (e) {
        process.stderr.write(`[skip] ${file}: ${e.message}\n`);
        skipped++;
      }
    }
  }

  process.stdout.write(
    `\nAgent conversion complete.\n` +
    `  Scanned: ${total}\n` +
    `  Converted: ${converted}\n` +
    `  Skipped (dup/error): ${skipped}\n` +
    `  Destination: ${relative(ROOT, args.dst)}\n` +
    (args.dryRun ? '  (dry-run — no files written)\n' : '')
  );
}

main();
