/**
 * The mock transport.
 *
 * Every service call goes through here, so the whole app experiences realistic
 * latency and can be made to fail on demand. Screens built against an instant,
 * never-failing data layer get their loading and error states written last and
 * wrong; this makes those states the default experience during development.
 *
 * When the real backend lands, this file becomes `fetch` and the services above
 * it do not change.
 */

import type { ApiErrorCode } from "./types";

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
  }
}

type ClientConfig = {
  minLatencyMs: number;
  maxLatencyMs: number;
  /**
   * Dev-only. When set, the next calls fail with this code. Driven by the
   * switch in `ui.store.ts` so failure states can be demoed on a device
   * without editing code.
   */
  failureMode: ApiErrorCode | null;
  /** Fail only this fraction of calls (0–1). 1 means every call. */
  failureRate: number;
};

const config: ClientConfig = {
  minLatencyMs: 300,
  maxLatencyMs: 800,
  failureMode: null,
  failureRate: 1,
};

/** Tests set latency to 0; the dev switch sets `failureMode`. */
export function configureClient(next: Partial<ClientConfig>): void {
  Object.assign(config, next);
}

export function getClientConfig(): Readonly<ClientConfig> {
  return { ...config };
}

export function resetClient(): void {
  config.minLatencyMs = 300;
  config.maxLatencyMs = 800;
  config.failureMode = null;
  config.failureRate = 1;
}

function latency(): number {
  const { minLatencyMs, maxLatencyMs } = config;
  if (maxLatencyMs <= minLatencyMs) return minLatencyMs;
  return minLatencyMs + Math.random() * (maxLatencyMs - minLatencyMs);
}

/**
 * Wraps a synchronous mock operation in latency and possible failure.
 *
 * The failure check happens AFTER the delay on purpose: a request that fails
 * instantly does not exercise the loading state it is supposed to be testing.
 */
export async function request<T>(produce: () => T | Promise<T>): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, latency()));

  if (config.failureMode && Math.random() < config.failureRate) {
    throw new ApiError(config.failureMode);
  }

  return produce();
}

/** Stable, readable ids for records created during a session. */
let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
