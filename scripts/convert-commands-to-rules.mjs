#!/usr/bin/env node
/**
 * Convert ruflo slash-command docs (.claude/commands/*.md) into Cursor-native
 * .cursor/rules/*.mdc files.
 *
 * Cursor has no first-class slash-command file convention (verified against
 * cursor.com/docs). Cursor project rules live in .cursor/rules/*.mdc with YAML
 * frontmatter (description, globs, alwaysApply). Plain .md files are IGNORED
 * — the .mdc extension is required.
 *
 * Each ruflo command .md becomes a .mdc rule with:
 *   description: derived from the command's first heading or first paragraph
 *   globs: (empty — manual/agent-requested activation)
 *   alwaysApply: false
 *
 * The command body (which references `npx ruflo <cmd>`) is preserved so the
 * agent learns when to invoke the CLI. High-value commands get
 * alwaysApply:false + descriptive text so the agent can pull them in when
 * relevant.
 *
 * Usage:
 *   node scripts/convert-commands-to-rules.mjs [--src <dir>] [--dst <dir>] [--dry-run]
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, basename, resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { src: null, dst: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--src') args.src = argv[++i];
    else if (argv[i] === '--dst') args.dst = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  if (!args.src) args.src = join(ROOT, '.claude', 'commands');
  if (!args.dst) args.dst = join(ROOT, '.cursor', 'rules');
  return args;
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

function deriveDescription(content, filename) {
  // First non-empty heading or paragraph
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('# ')) return t.replace(/^#\s*/, '').slice(0, 160);
  }
  // Fall back to first non-empty non-fence line
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('```') || t.startsWith('#')) continue;
    return t.length > 160 ? t.slice(0, 157) + '...' : t;
  }
  return 'Ruflo ' + slugify(filename) + ' command reference';
}

function toMdc(content, filename) {
  const name = slugify(basename(filename, '.md'));
  const description = deriveDescription(content, filename);
  const frontmatter = [
    '---',
    `description: ${description.replace(/\n/g, ' ').replace(/"/g, '\\"')}`,
    'globs: ',
    'alwaysApply: false',
    '---',
    '',
  ].join('\n');
  return frontmatter + content.trimStart() + '\n';
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
  const files = walkDir(args.src);
  let converted = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      // Flatten nested command paths into a single .mdc filename
      const rel = relative(args.src, file).replace(/\\/g, '/').replace(/\.md$/, '');
      const name = slugify(rel);
      if (!name) { skipped++; continue; }
      const dstFile = join(args.dst, name + '.mdc');
      if (args.dryRun) {
        process.stdout.write(`[dry-run] ${relative(ROOT, file)} -> ${relative(ROOT, dstFile)}\n`);
      } else {
        mkdirSync(args.dst, { recursive: true });
        writeFileSync(dstFile, toMdc(content, basename(file)), 'utf-8');
      }
      converted++;
    } catch (e) {
      process.stderr.write(`[skip] ${file}: ${e.message}\n`);
      skipped++;
    }
  }

  process.stdout.write(
    `\nCommand-to-rule conversion complete.\n` +
    `  Scanned: ${files.length}\n` +
    `  Converted: ${converted}\n` +
    `  Skipped: ${skipped}\n` +
    `  Destination: ${relative(ROOT, args.dst)}\n` +
    (args.dryRun ? '  (dry-run — no files written)\n' : '')
  );
}

main();
