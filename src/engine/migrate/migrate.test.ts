import { describe, expect, it } from 'vitest';
import { migrate } from './index';
import { EXAMPLES } from '../examples';
import { LIBRARY, resolveSeed } from '../../repository/library';

// Migrate holds no rule before 1.0.0 (the owner on #643): a retired form is an error, and nothing rewrites it. What stays is
// its law (L4): a text of the language today is left as it is, and a card that says what the piece is stays.
const SEED = { resolve: resolveSeed };

describe('Migrate: no rule before 1.0.0 (decision 049, #643)', () => {
  // law L4
  it('changes no example and no fragment of the seed library, and leaves a card that says what the piece is (a file’s, not a text’s)', () => {
    for (const [key, p] of Object.entries(EXAMPLES)) expect([key, migrate(p.source, SEED).steps]).toEqual([key, []]);
    for (const f of LIBRARY) expect([f.id, migrate(f.text, SEED).steps]).toEqual([f.id, []]);
    const src = '&piece label="A"\n&x 0';
    expect(migrate(src).source).toBe(src);
  });
});
