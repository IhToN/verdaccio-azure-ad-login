import { randomUUID } from 'crypto';

const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 1000;

interface StateEntry {
  codeVerifier: string;
  expiresAt: number;
}

// Single-instance only: state lives in process memory.
// Multi-instance deployments must use sticky sessions or a shared store (e.g. Redis).
const store = new Map<string, StateEntry>();

export function createState(codeVerifier: string): string {
  purgeExpired();
  if (store.size >= MAX_ENTRIES) {
    throw new Error('OAuth state store capacity exceeded');
  }
  const state = randomUUID();
  store.set(state, { codeVerifier, expiresAt: Date.now() + STATE_TTL_MS });
  return state;
}

export function validateAndConsumeState(state: string): string | null {
  const entry = store.get(state);
  if (!entry) return null;
  store.delete(state);
  if (entry.expiresAt < Date.now()) return null;
  return entry.codeVerifier;
}

export function purgeExpired(): void {
  const now = Date.now();
  for (const [key, val] of store) {
    if (val.expiresAt < now) store.delete(key);
  }
}

export function _resetForTest(): void {
  store.clear();
}
