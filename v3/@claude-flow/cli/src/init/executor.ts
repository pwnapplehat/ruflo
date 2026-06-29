/**
 * Init Executor — Cursor-native ONLY
 *
 * This fork has fully removed Claude Code integration. All init/upgrade paths
 * delegate to executeCursorInit which writes the .cursor/ tree using Cursor's
 * verified hook/MCP/agents contracts. There is no .claude/ fallback.
 */

import type { InitOptions, InitResult } from './types.js';
import { DEFAULT_INIT_OPTIONS } from './types.js';
import { executeCursorInit } from './cursor-executor.js';

/**
 * Init result — delegates to executeCursorInit (Cursor-native).
 */
export async function executeInit(options: InitOptions): Promise<InitResult> {
  return executeCursorInit(options);
}

/**
 * Upgrade result shape (retained for API compatibility with commands/init.ts).
 */
export interface UpgradeResult {
  success: boolean;
  updated: string[];
  created: string[];
  preserved: string[];
  errors: string[];
  settingsUpdated: string[];
  addedSkills?: string[];
  addedAgents?: string[];
  addedCommands?: string[];
}

/**
 * Upgrade — delegates to executeCursorInit with force=true (re-init overwrites
 * stale files, preserves user data in .cursor-flow/).
 */
export async function executeUpgrade(targetDir: string, _upgradeSettings = false): Promise<UpgradeResult> {
  const cursorResult = await executeCursorInit({
    ...DEFAULT_INIT_OPTIONS,
    targetDir,
    force: true,
    host: 'cursor',
  });
  return {
    success: cursorResult.success,
    updated: [],
    created: cursorResult.created.files,
    preserved: [],
    errors: cursorResult.errors,
    settingsUpdated: cursorResult.summary.hooksEnabled > 0 ? ['.cursor/hooks.json'] : [],
  };
}

/**
 * Upgrade with missing — same as upgrade (re-init with force).
 */
export async function executeUpgradeWithMissing(targetDir: string, upgradeSettings = false): Promise<UpgradeResult> {
  return executeUpgrade(targetDir, upgradeSettings);
}

export default executeInit;
