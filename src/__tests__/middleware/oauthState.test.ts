import {
  createState,
  validateAndConsumeState,
  purgeExpired,
  _resetForTest,
} from '../../middleware/oauthState';

beforeEach(() => {
  _resetForTest();
});

describe('createState', () => {
  it('returns a UUID-format string', () => {
    const state = createState('verifier-abc');
    expect(state).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('returns a different state on each call', () => {
    const a = createState('verifier-abc');
    const b = createState('verifier-def');
    expect(a).not.toBe(b);
  });

  it('throws when store is at capacity', () => {
    for (let i = 0; i < 1000; i++) {
      createState(`verifier-${i}`);
    }
    expect(() => createState('one-too-many')).toThrow('OAuth state store capacity exceeded');
  });
});

describe('validateAndConsumeState', () => {
  it('returns the codeVerifier for a valid state', () => {
    const verifier = 'my-code-verifier';
    const state = createState(verifier);
    expect(validateAndConsumeState(state)).toBe(verifier);
  });

  it('returns null for an unknown state', () => {
    expect(validateAndConsumeState('unknown-state')).toBeNull();
  });

  it('returns null on the second call (single-use)', () => {
    const state = createState('verifier-xyz');
    validateAndConsumeState(state);
    expect(validateAndConsumeState(state)).toBeNull();
  });

  it('returns null for an expired state', () => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(0);
    try {
      const state = createState('verifier-expired');
      jest.setSystemTime(11 * 60 * 1000); // 11 minutes later, past 10-min TTL
      expect(validateAndConsumeState(state)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('purgeExpired', () => {
  it('removes expired entries but leaves valid ones', () => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(0);
    try {
      const earlyState = createState('early-verifier'); // expires at t=10min
      jest.setSystemTime(11 * 60 * 1000); // earlyState is now expired
      const lateState = createState('late-verifier'); // expires at t=21min
      purgeExpired();
      expect(validateAndConsumeState(earlyState)).toBeNull();
      expect(validateAndConsumeState(lateState)).toBe('late-verifier');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('_resetForTest', () => {
  it('clears all entries from the store', () => {
    const state = createState('verifier-to-clear');
    _resetForTest();
    expect(validateAndConsumeState(state)).toBeNull();
  });
});
