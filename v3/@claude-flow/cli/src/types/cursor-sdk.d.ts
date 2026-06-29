/**
 * Ambient module declaration for @cursor/sdk.
 *
 * The actual package (npm: @cursor/sdk, verified v1.0.22) is an optional
 * runtime dependency for headless worker execution. It is dynamically
 * imported at runtime (cursor-sdk-executor.ts) so the CLI builds and runs
 * without it installed — headless agent work simply degrades gracefully.
 *
 * This ambient declaration lets `tsc --noEmit` resolve the dynamic
 * `import('@cursor/sdk')` calls without the package being in node_modules.
 * The real types ship with the package; when installed, TypeScript prefers
 * the real declarations over this ambient stub.
 */

declare module '@cursor/sdk' {
  export interface RunResult {
    status: 'finished' | 'error' | 'cancelled';
    result?: string;
    id: string;
  }
  export interface AgentPromptOptions {
    apiKey: string;
    model: { id: string };
    local?: { cwd: string };
    cloud?: unknown;
  }
  export interface Run {
    wait(): Promise<RunResult>;
    stream(): AsyncIterable<unknown>;
    cancel(): Promise<void>;
    supports(op: string): boolean;
  }
  export interface Agent {
    send(prompt: string): Promise<Run>;
    [Symbol.asyncDispose](): Promise<void>;
  }
  export const Agent: {
    prompt(text: string, options: AgentPromptOptions): Promise<RunResult>;
    create(options: AgentPromptOptions): Promise<Agent>;
    resume(agentId: string, options: AgentPromptOptions): Promise<Agent>;
    get(agentId: string, options: AgentPromptOptions): Promise<unknown>;
    getRun(runId: string, options: unknown): Promise<Run>;
    list(options: unknown): Promise<unknown[]>;
  };
  export class CursorAgentError extends Error {
    isRetryable: boolean;
  }
  export const Cursor: {
    models: { list(options?: { apiKey?: string }): Promise<Array<{ id: string }>> };
  };
}
