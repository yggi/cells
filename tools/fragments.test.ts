import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { GENERATED, seedModule } from './fragments';

it(`${GENERATED} is what tools/fragments.ts writes from fragments/ (npm run fragments)`, () => {
  expect(readFileSync(GENERATED, 'utf8')).toBe(seedModule());
});

it('a stale module is caught', () => {
  expect(seedModule().replace('swing=8n:2/3', 'swing=8n:3/5')).not.toBe(readFileSync(GENERATED, 'utf8'));
});
