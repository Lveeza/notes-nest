import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
    },
  },
});
