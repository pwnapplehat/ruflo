/**
 * Cursor SDK Executor
 *
 * Replaces the `spawn('claude', ['--print'])` headless worker path in
 * headless-worker-executor.ts:1202 with @cursor/sdk's Agent.prompt() /
 * Agent.create() + agent.send() API.
 *
 * Why: ruflo's Cursor-native fork has no `claude` CLI binary to spawn. The
 * Cursor SDK (npm: @cursor/sdk, verified v1.0.22) provides the equivalent
 * programmatic agent runtime — Agent.prompt for one-shot, Agent.create +
 * agent.send for multi-turn, Agent.resume for cross-process continuation.
 *
 * Contract: same return shape as executeClaudeCode():
 *   { success: boolean; output: string; tokensUsed?: number; error?: string }
 *
 * Failure modes (verified from @cursor/sdk SKILL.md):
 *   - Thrown CursorAgentError → run never executed (auth/config/network).
 *     Maps to { success:false, error }.
 *   - result.status === "error" → run executed and failed mid-flight.
 *     Maps to { success:false, error: result.result }.
 *   - result.status === "finished" → success.
 *     Maps to { success:true, output: result.result }.
 *
 * Requires CURSOR_API_KEY env var. Degrades gracefully if @cursor/sdk is not
 * installed (returns a clear error so the caller can fall back to local-only
 * worker logic).
 */

import type { SandboxMode } from './headless-worker-executor.js';

export interface CursorSdkExecOptions {
  prompt: string;
  sandbox: SandboxMode;
  model: string;
  timeoutMs: number;
  executionId: string;
  cwd: string;
}

export interface CursorSdkExecResult {
  success: boolean;
  output: string;
  tokensUsed?: number;
  error?: string;
}

export interface CursorSdkAvailability {
  available: boolean;
  reason?: string;
}

// Minimal typed surface for @cursor/sdk (verified against @cursor/sdk@1.0.22).
// We define these locally so the file typechecks without @cursor/sdk installed
// at build time; the runtime uses a dynamic import() and degrades gracefully
// if the package is absent.
interface CursorRunResult {
  status: 'finished' | 'error' | 'cancelled';
  result?: string;
  id: string;
}
interface CursorAgentPromptOptions {
  apiKey: string;
  model: { id: string };
  local?: { cwd: string };
  cloud?: unknown;
}
interface CursorAgent {
  send(prompt: string): Promise<{ wait(): Promise<CursorRunResult>; stream(): AsyncIterable<unknown>; cancel?(): Promise<void>; supports(op: string): boolean }>;
  [Symbol.asyncDispose](): Promise<void>;
}
interface CursorAgentStatic {
  prompt(text: string, options: CursorAgentPromptOptions): Promise<CursorRunResult>;
  create(options: CursorAgentPromptOptions): Promise<CursorAgent>;
}
interface CursorAgentErrorCtor {
  new (message: string): Error & { isRetryable: boolean };
}
interface CursorSdkModule {
  Agent: CursorAgentStatic;
  CursorAgentError: CursorAgentErrorCtor;
}

/**
 * Check whether @cursor/sdk is installed and CURSOR_API_KEY is set.
 * Used by the daemon to decide whether headless agent work can run.
 */
export async function checkCursorSdkAvailability(): Promise<CursorSdkAvailability> {
  if (!process.env.CURSOR_API_KEY) {
    return {
      available: false,
      reason: 'CURSOR_API_KEY not set. Get one from Cursor Dashboard → Integrations.',
    };
  }
  try {
    await import('@cursor/sdk');
    return { available: true };
  } catch {
    return {
      available: false,
      reason: '@cursor/sdk not installed. Run: npm install @cursor/sdk',
    };
  }
}

/**
 * Resolve a ruflo ModelType to a Cursor SDK model id.
 * Ruflo's MODEL_IDS map targets Anthropic models; Cursor uses composer-* / auto.
 */
function resolveCursorModel(model: string): string {
  // Explicit override wins
  if (process.env.RUFLO_HEADLESS_MODEL) return process.env.RUFLO_HEADLESS_MODEL;
  const m = String(model || '').toLowerCase();
  // Map common ruflo model aliases to Cursor equivalents
  if (m.includes('haiku') || m.includes('fast') || m.includes('small')) return 'auto';
  if (m.includes('opus') || m.includes('sonnet') || m.includes('claude')) return 'auto';
  if (m.includes('composer')) return m;
  // Default: let Cursor pick
  return 'auto';
}

/**
 * Execute a prompt via @cursor/sdk's one-shot Agent.prompt() API.
 * This is the drop-in replacement for executeClaudeCode()'s spawn('claude',['--print']).
 */
export async function executeCursorSdk(options: CursorSdkExecOptions): Promise<CursorSdkExecResult> {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      output: '',
      error: 'CURSOR_API_KEY not set. Headless agent work requires a Cursor API key.',
    };
  }

  let sdk: CursorSdkModule;
  try {
    sdk = (await import('@cursor/sdk')) as CursorSdkModule;
  } catch (e) {
    return {
      success: false,
      output: '',
      error: `@cursor/sdk not installed: ${(e as Error).message}. Run: npm install @cursor/sdk`,
    };
  }

  const { Agent, CursorAgentError } = sdk;
  const modelId = resolveCursorModel(options.model);

  // Timeout guard: race the agent run against a timer. @cursor/sdk runs are
  // not cancellable via process signals (no subprocess); we use Promise.race
  // and let the SDK run settle in the background. For durable runs, prefer
  // Agent.create() + run.cancel() (guarded by run.supports('cancel')).
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<CursorSdkExecResult>((resolve) => {
    timeoutHandle = setTimeout(() => {
      resolve({
        success: false,
        output: '',
        error: `Cursor SDK run timed out after ${options.timeoutMs}ms (executionId=${options.executionId}).`,
      });
    }, options.timeoutMs);
  });

  try {
    const runPromise = (async () => {
      try {
        const result = await Agent.prompt(options.prompt, {
          apiKey,
          model: { id: modelId },
          local: { cwd: options.cwd },
        });
        if (result.status === 'error') {
          return {
            success: false,
            output: '',
            error: `Cursor SDK run failed (id=${result.id}): ${result.result}`,
          };
        }
        // status === 'finished'
        return {
          success: true,
          output: String(result.result || ''),
          tokensUsed: undefined,
        };
      } catch (err) {
        if (err instanceof (CursorAgentError as unknown as CursorAgentErrorCtor)) {
          return {
            success: false,
            output: '',
            error: `Cursor SDK startup failed: ${(err as Error & { isRetryable: boolean }).message} (retryable=${(err as Error & { isRetryable: boolean }).isRetryable})`,
          };
        }
        return {
          success: false,
          output: '',
          error: `Cursor SDK unexpected error: ${(err as Error).message}`,
        };
      }
    })();

    const result = await Promise.race([runPromise, timeout]);
    return result;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

/**
 * Execute a multi-turn prompt sequence via Agent.create() + agent.send().
 * Use this for workers that need follow-up turns with preserved context.
 * Each prompt in the array becomes a separate send() on the same agent.
 */
export async function executeCursorSdkMultiTurn(
  prompts: string[],
  options: CursorSdkExecOptions
): Promise<CursorSdkExecResult> {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      output: '',
      error: 'CURSOR_API_KEY not set. Headless agent work requires a Cursor API key.',
    };
  }

  let sdk: CursorSdkModule;
  try {
    sdk = (await import('@cursor/sdk')) as CursorSdkModule;
  } catch (e) {
    return {
      success: false,
      output: '',
      error: `@cursor/sdk not installed: ${(e as Error).message}.`,
    };
  }

  const { Agent, CursorAgentError } = sdk;
  const modelId = resolveCursorModel(options.model);

  try {
    const agent = await Agent.create({
      apiKey,
      model: { id: modelId },
      local: { cwd: options.cwd },
    });
    try {
      let lastOutput = '';
      for (const prompt of prompts) {
        const run = await agent.send(prompt);
        const result = await run.wait();
        if (result.status === 'error') {
          return {
            success: false,
            output: lastOutput,
            error: `Cursor SDK run failed (id=${result.id}): ${result.result}`,
          };
        }
        lastOutput = String(result.result || '');
      }
      return { success: true, output: lastOutput };
    } finally {
      await agent[Symbol.asyncDispose]();
    }
  } catch (err) {
    if (err instanceof (CursorAgentError as unknown as CursorAgentErrorCtor)) {
      return {
        success: false,
        output: '',
        error: `Cursor SDK startup failed: ${(err as Error & { isRetryable: boolean }).message} (retryable=${(err as Error & { isRetryable: boolean }).isRetryable})`,
      };
    }
    return {
      success: false,
      output: '',
      error: `Cursor SDK unexpected error: ${(err as Error).message}`,
    };
  }
}

export default executeCursorSdk;
