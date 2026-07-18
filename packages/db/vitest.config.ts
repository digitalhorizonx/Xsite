import { defineConfig } from 'vitest/config';

// Local-dev convenience default so `pnpm test` works without manually
// exporting DATABASE_URL. CI sets a real DATABASE_URL at the job level,
// which wins here since `??=` only assigns when the variable is unset.
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/xsite_test';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Integration tests share one Postgres connection pool and must not run
    // concurrently against the same tables.
    fileParallelism: false,
  },
});
