/**
 * MCP Configuration Generator
 * Creates .mcp.json for Claude Code MCP server integration
 * Handles cross-platform compatibility (Windows requires cmd /c wrapper)
 */

import type { InitOptions, MCPConfig } from './types.js';

/**
 * Check if running on Windows
 */
function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * Generate platform-specific MCP server entry
 * - Windows: uses 'cmd /c npx' directly
 * - Unix: uses 'npx' directly (simple, reliable)
 */
function createMCPServerEntry(
  npxArgs: string[],
  env: Record<string, string>,
  additionalProps: Record<string, unknown> = {}
): object {
  if (isWindows()) {
    return {
      command: 'cmd',
      args: ['/c', 'npx', '-y', ...npxArgs],
      env,
      ...additionalProps,
    };
  }

  // Unix: direct npx invocation — simple and reliable
  return {
    command: 'npx',
    args: ['-y', ...npxArgs],
    env,
    ...additionalProps,
  };
}

/**
 * Generate MCP configuration
 */
export function generateMCPConfig(options: InitOptions): object {
  const config = options.mcp;
  const mcpServers: Record<string, object> = {};

  const npmEnv = {
    npm_config_update_notifier: 'false',
  };

  // Ruflo MCP server (core) — uses ruflo wrapper for portable npm-resolved invocation.
  // #2206: key MUST be 'claude-flow' so all plugins resolve as mcp__claude-flow__*.
  // The command args (ruflo@latest mcp start) are the correct wrapper invocation — only the
  // registration KEY changes here.
  if (config.claudeFlow) {
    mcpServers['claude-flow'] = createMCPServerEntry(
      ['ruflo@latest', 'mcp', 'start'],
      {
        ...npmEnv,
        CLAUDE_FLOW_MODE: 'v3',
        CLAUDE_FLOW_HOOKS_ENABLED: 'true',
        CLAUDE_FLOW_TOPOLOGY: options.runtime.topology,
        CLAUDE_FLOW_MAX_AGENTS: String(options.runtime.maxAgents),
        CLAUDE_FLOW_MEMORY_BACKEND: options.runtime.memoryBackend,
      },
      { autoStart: config.autoStart }
    );
  }

  // Ruv-Swarm MCP server (enhanced coordination)
  if (config.ruvSwarm) {
    mcpServers['ruv-swarm'] = createMCPServerEntry(
      ['ruv-swarm', 'mcp', 'start'],
      { ...npmEnv },
      { optional: true }
    );
  }

  // Flow Nexus MCP server (cloud features)
  if (config.flowNexus) {
    mcpServers['flow-nexus'] = createMCPServerEntry(
      ['flow-nexus@latest', 'mcp', 'start'],
      { ...npmEnv },
      { optional: true, requiresAuth: true }
    );
  }

  return { mcpServers };
}

/**
 * Generate .mcp.json as formatted string
 */
export function generateMCPJson(options: InitOptions): string {
  const config = generateMCPConfig(options);
  return JSON.stringify(config, null, 2);
}

/**
 * Generate MCP server setup instructions for the Cursor-native path.
 *
 * Cursor does not use a `claude mcp add` CLI — MCP servers are registered via
 * `.cursor/mcp.json` (written by cursor-executor.ts using generateCursorMcpJson).
 * This function returns plain-English instructions for users who need to
 * register ruflo manually in Cursor Settings → Tools & MCP.
 */
export function generateMCPCommands(options: InitOptions): string[] {
  const commands: string[] = [];
  const config = options.mcp;

  if (config.claudeFlow) {
    if (isWindows()) {
      commands.push('Cursor: add ruflo to .cursor/mcp.json with command "cmd" args ["/c","npx","-y","ruflo@latest","mcp","start"]  (or use Cursor Settings → Tools & MCP → New MCP Server)');
    } else {
      commands.push('Cursor: add ruflo to .cursor/mcp.json with command "npx" args ["-y","ruflo@latest","mcp","start"]  (or use Cursor Settings → Tools & MCP → New MCP Server)');
    }
  }
  if (config.ruvSwarm) {
    commands.push('Cursor: add ruv-swarm to .cursor/mcp.json (npx -y ruv-swarm mcp start)');
  }
  if (config.flowNexus) {
    commands.push('Cursor: add flow-nexus to .cursor/mcp.json (npx -y flow-nexus@latest mcp start)');
  }

  return commands;
}

/**
 * Get platform-specific setup instructions
 */
export function getPlatformInstructions(): { platform: string; note: string } {
  if (isWindows()) {
    return {
      platform: 'Windows',
      note: 'MCP configuration uses cmd /c wrapper for npx compatibility.',
    };
  }
  return {
    platform: process.platform === 'darwin' ? 'macOS' : 'Linux',
    note: 'MCP configuration uses npx directly.',
  };
}
