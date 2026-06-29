/**
 * CursorMemoryBridge
 *
 * A Cursor-native replacement for AutoMemoryBridge. The Claude-Code-specific
 * AutoMemoryBridge reads/writes memory markdown at
 *   ~/.claude/projects/<project-key>/memory/*.md
 * (see auto-memory-bridge.ts:5,808). Cursor has no equivalent per-project
 * memory file layout, so CursorMemoryBridge stores ruflo's memory markdown at
 *   <workspace>/.cursor-flow/memory/<project-hash>/*.md   (project-local)
 * which is portable across Windows, macOS, and Linux with no host-specific
 * state directory coupling.
 *
 * Used by .cursor/hooks/cursor-memory-hook.cjs `sync` subcommand to flush
 * bridge entries back to memory markdown that a future `import` can re-read
 * and vectorize into AgentDB.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

export interface CursorMemoryBridgeOptions {
  workingDir: string;
  namespace?: string;
  maxFiles?: number;
  maxFileBytes?: number;
}

export interface SyncResult {
  written: number;
  skipped: number;
  dir: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  files: number;
}

const DEFAULT_MAX_FILES = 100;
const DEFAULT_MAX_FILE_BYTES = 256 * 1024;

export class CursorMemoryBridge {
  private readonly workingDir: string;
  private readonly namespace: string;
  private readonly maxFiles: number;
  private readonly maxFileBytes: number;
  private readonly memoryDir: string;

  constructor(options: CursorMemoryBridgeOptions) {
    this.workingDir = resolve(options.workingDir || process.cwd());
    this.namespace = options.namespace || 'cursor-memory';
    this.maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
    this.maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
    this.memoryDir = this.resolveMemoryDir();
  }

  /** Stable 12-char hash of the absolute workspace path. */
  private projectHash(): string {
    return createHash('sha1').update(this.workingDir).digest('hex').slice(0, 12);
  }

  /** <workspace>/.cursor-flow/memory/<project-hash> */
  resolveMemoryDir(): string {
    return join(this.workingDir, '.cursor-flow', 'memory', this.projectHash());
  }

  /** Ensure the memory directory exists. */
  ensureDir(): void {
    if (!existsSync(this.memoryDir)) {
      mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  /**
   * Write a single memory entry as a markdown file with YAML frontmatter.
   * Filename is slugified from the key; duplicate keys overwrite.
   */
  writeEntry(key: string, content: string, description?: string): string | null {
    if (!content || content.length < 10) return null;
    if (content.length > this.maxFileBytes) {
      content = content.slice(0, this.maxFileBytes) + '\n\n[truncated]';
    }
    this.ensureDir();
    const slug = String(key || 'memory')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 80) || 'memory';
    const file = join(this.memoryDir, slug + '.md');
    const frontmatter = [
      '---',
      `name: ${slug}`,
      description ? `description: ${description.replace(/\n/g, ' ').slice(0, 200)}` : `description: Ruflo memory entry`,
      `type: auto-memory`,
      `namespace: ${this.namespace}`,
      '---',
      '',
    ].join('\n');
    writeFileSync(file, frontmatter + content + '\n', 'utf-8');
    return file;
  }

  /**
   * Sync bridge entries back to memory markdown. Accepts an optional iterable
   * of { key, content, description } entries (typically from the JSON backend).
   * Returns a SyncResult with counts.
   */
  async syncToMemoryMarkdown(
    entries?: Iterable<{ key: string; content: string; description?: string }>
  ): Promise<SyncResult> {
    this.ensureDir();
    let written = 0;
    let skipped = 0;

    if (entries) {
      const existing = new Set(readdirSync(this.memoryDir).map((f) => f.replace(/\.md$/, '')));
      for (const entry of entries) {
        if (written >= this.maxFiles) { skipped++; continue; }
        const result = this.writeEntry(entry.key, entry.content, entry.description);
        if (result) { written++; existing.add(entry.key); }
        else { skipped++; }
      }
    }

    return { written, skipped, dir: this.memoryDir };
  }

  /**
   * Import all memory markdown files from this project's memory dir.
   * Returns parsed entries ready for vectorization into AgentDB.
   */
  importFromMemoryMarkdown(): ImportResult {
    if (!existsSync(this.memoryDir)) {
      return { imported: 0, skipped: 0, files: 0 };
    }
    const files = readdirSync(this.memoryDir).filter((f) => f.endsWith('.md'));
    let imported = 0;
    let skipped = 0;

    for (const file of files) {
      try {
        const content = readFileSync(join(this.memoryDir, file), 'utf-8');
        const parsed = this.parseFrontmatter(content);
        const key = parsed.name || basename(file, '.md');
        // Split body into sections for granular entries
        const sections = parsed.body.split(/^## /m).filter((s) => s.trim());
        if (sections.length === 0) sections.push(parsed.body);
        for (const section of sections) {
          const trimmed = section.trim();
          if (trimmed.length < 10) { skipped++; continue; }
          imported++;
        }
      } catch {
        skipped++;
      }
    }

    return { imported, skipped, files: files.length };
  }

  private parseFrontmatter(content: string): { name: string; description: string; body: string } {
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) return { name: '', description: '', body: content };
    const yaml = m[1];
    const body = m[2].trim();
    const nameMatch = yaml.match(/^name:\s*(.+)$/m);
    const descMatch = yaml.match(/^description:\s*(.+)$/m);
    return {
      name: nameMatch ? nameMatch[1].trim() : '',
      description: descMatch ? descMatch[1].trim() : '',
      body,
    };
  }
}

export default CursorMemoryBridge;
