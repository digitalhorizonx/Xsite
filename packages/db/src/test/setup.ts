import { beforeAll } from 'vitest';

beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes('xsite_test')) {
    throw new Error(
      'Integration tests must run against the xsite_test database. ' +
        'Set DATABASE_URL to the test database before running `pnpm test`.',
    );
  }
});
