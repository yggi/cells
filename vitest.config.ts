import { defineConfig } from 'vitest/config';

// Two projects: `quick`, every test but the heavy sweeps, in every `npm test`; `slow` (`*.slow.test.ts`: the folder over
// whole pieces and libraries, a minute or two), in `npm run test:all` and before a release.
export default defineConfig({
  test: {
    environment: 'node',
    isolate: false,
    slowTestThreshold: 5_000,
    projects: [
      {
        extends: true,
        test: { name: 'quick', include: ['src/**/*.test.ts', 'tools/**/*.test.ts'], exclude: ['**/*.slow.test.ts', '**/node_modules/**'], testTimeout: 20_000 },
      },
      { extends: true, test: { name: 'slow', include: ['src/**/*.slow.test.ts', 'tools/**/*.slow.test.ts'], testTimeout: 600_000 } },
    ],
  },
});
