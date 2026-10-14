import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { examplesModule, GENERATED } from './examples';

it(`${GENERATED} is what tools/examples.ts writes from examples/ (npm run examples)`, () => {
  expect(readFileSync(GENERATED, 'utf8')).toBe(examplesModule());
});

it('a stale index is caught', () => {
  expect(examplesModule().replace('"acid"', '"acid2"')).not.toBe(readFileSync(GENERATED, 'utf8'));
});
