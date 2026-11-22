import { describe, expect, test } from 'vitest';
import { validateEnv } from './env.js';

describe('validateEnv', () => {
  test('accepts a valid env and applies the default port', () => {
    const env = validateEnv({
      DATABASE_URL: 'file:./dev.db',
      JWT_SECRET: 'x'.repeat(32),
    });
    expect(env.PORT).toBe(3000);
  });

  const secret = 'x'.repeat(32);

  test.each([
    [{}],
    [{ DATABASE_URL: '', JWT_SECRET: secret }],
    [{ DATABASE_URL: 'file:./dev.db', JWT_SECRET: secret, PORT: 'abc' }],
    [{ DATABASE_URL: 'file:./dev.db', JWT_SECRET: secret, PORT: '70000' }],
    [{ DATABASE_URL: 'file:./dev.db', JWT_SECRET: 'short' }],
  ])('rejects %j', (env) => {
    expect(() => validateEnv(env)).toThrow('Invalid environment');
  });
});
