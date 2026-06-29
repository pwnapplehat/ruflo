/**
 * Ambient module declarations for ALL optional/workspace dependencies that
 * are not installed or not built at typecheck time. These use `any` types to
 * avoid surface mismatches — the real types ship with each package and are
 * preferred at runtime via dynamic import.
 */

declare module '@ruvector/learning-wasm' {
  const _any: any;
  export = _any;
}

declare module '@metaharness/router' {
  const _any: any;
  export = _any;
}

declare module '@ruvector/attention' {
  const _any: any;
  export = _any;
}

declare module '@ruvector/attention-darwin-arm64' {
  const _any: any;
  export = _any;
}

declare module '@ruvector/router-linux-x64-gnu' {
  const _any: any;
  export = _any;
}

declare module '@cognitum-one/sdk/seed' {
  const _any: any;
  export = _any;
}

declare module 'helmet' {
  import type { RequestHandler } from 'express';
  const helmet: RequestHandler & Record<string, RequestHandler>;
  export default helmet;
}

declare module '@claude-flow/aidefence' {
  export function createAIDefence(config?: any): any;
  export function scanInput(input: any): any;
  export function analyzeText(text: any): any;
  export function isSafe(input: any): boolean;
  export function hasPII(input: any): boolean;
  export const AIDefence: any;
}

declare module '@ruvector/learning-wasm' {
  export class WasmMicroLoRA { [k: string]: any; adapt_array(...args: any[]): any; free(): void; }
  export class WasmScopedLoRA { [k: string]: any; }
  export class WasmTrajectoryBuffer { [k: string]: any; }
  export class WasmFlashAttention { [k: string]: any; }
  export class WasmMoE { [k: string]: any; }
  export class WasmSONA { [k: string]: any; }
  export function initSync(opts?: any): void;
}

declare module '@claude-flow/embeddings' {
  const _any: any;
  export = _any;
}

declare module '@claude-flow/guidance/compiler' {
  const _any: any;
  export = _any;
}

declare module '@claude-flow/guidance/retriever' {
  const _any: any;
  export = _any;
}

declare module '@claude-flow/guidance/gates' {
  const _any: any;
  export = _any;
}

declare module '@claude-flow/guidance/analyzer' {
  const _any: any;
  export = _any;
}

declare module '@claude-flow/codex' {
  const _any: any;
  export = _any;
}

declare module '@claude-flow/plugin-gastown-bridge' {
  const _any: any;
  export = _any;
}

declare module '@claude-flow/deployment' {
  const _any: any;
  export = _any;
}

declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    query(text: string, params?: any[]): Promise<any>;
    end(): Promise<void>;
  }
  export class Client {
    constructor(config?: any);
    connect(): Promise<void>;
    query(text: string, params?: any[]): Promise<any>;
    end(): Promise<void>;
  }
}

declare module '@ruvector/ruvllm-wasm' {
  const _any: any;
  export = _any;
}

declare module '@ruvector/rvagent-wasm' {
  const _any: any;
  export = _any;
}
