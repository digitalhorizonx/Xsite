import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Integration tests share one Postgres connection pool and must not run
    // concurrently against the same tables.
    fileParallelism: false,
  },
});
