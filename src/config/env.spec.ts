import { describe, expect, test } from 'vitest';
import { validateEnv } from './env.js';

describe('validateEnv', () => {
  test('accepts a valid env and applies the default port', () => {
    expect(validateEnv({ DATABASE_URL: 'file:./dev.db' }).PORT).toBe(3000);
  });

  test.each([
    [{}],
    [{ DATABASE_URL: '' }],
    [{ DATABASE_URL: 'file:./dev.db', PORT: 'abc' }],
    [{ DATABASE_URL: 'file:./dev.db', PORT: '70000' }],
  ])('rejects %j', (env) => {
    expect(() => validateEnv(env)).toThrow('Invalid environment');
  });
});