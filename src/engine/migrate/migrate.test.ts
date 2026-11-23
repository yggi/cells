import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { migrate } from './index';
import { compileSource } from '../compile';
import { soundsIdentical } from '../sameness';
import { EXAMPLES } from '../examples';
import { LIBRARY, resolveSeed } from '../../repository/library';

// The witnesses (#156): a text written the old way and what Migrate makes of it, kept as files, so a migration stays
// honest after the parser stops reading the form it rewrites. A text's `use` and `from` lines read the seed library.
const DIR = 'fixtures/migrations';
const SEED = { resolve: resolveSeed, old: true };
const PAIRS = readdirSync(DIR).flatMap((rule) =>
  readdirSync(`${DIR}/${rule}`)
    .filter((f) => f.endsWith('.before.cells'))
    .map((f) => {
      const at = `${DIR}/${rule}/${f}`;
      return {
        rule,
        name: `${rule}/${f.replace('.before.cells', '')}`,
        before: readFileSync(at, 'utf8'),
        after: readFileSync(at.replace('.before.', '.after.'), 'utf8'),
      };
    }),
);
/** What a text is told, infos left out (a line nothing plays is said, and is no retired form). */
const told = (src: string) =>
  compileSource(src, undefined, SEED)
    .diagnostics.filter((d) => d.severity !== 'info')
    .map((d) => d.message);

describe('Migrate: retired forms written as they are now (decision 049, #156)', () => {
  it.each(PAIRS.map((p) => [p.name, p]))('%s: the after, compiled clean, the same notes, and nothing more to do', (_, p) => {
    const { source, steps } = migrate(p.before, SEED);
    expect(source).toBe(p.after);
    expect(steps.length).toBeGreaterThan(0);
    expect(told(p.after)).toEqual([]);
    expect(soundsIdentical(p.before, p.after, undefined, SEED)).toBe(true);
    expect(migrate(p.after, SEED)).toEqual({ source: p.after, steps: [] });
  });

  it('a retired form warns, and its warning names Migrate', () => {
    // (:pairs too, since #15's rung 6: Jambot's section texts stopped writing it at yggi/jambot#591)
    for (const p of PAIRS) expect([p.name, told(p.before).some((m) => m.includes('Migrate'))]).toEqual([p.name, true]);
  });

  it('every rule has a witness of its own', () => {
    expect(new Set(PAIRS.map((p) => p.rule))).toEqual(new Set(['arguments']));
  });

  // law L4
  it('changes no example and no fragment of the seed library, and leaves a card that says what the piece is (a file’s, not a text’s)', () => {
    for (const [key, p] of Object.entries(EXAMPLES)) expect([key, migrate(p.source, SEED).steps]).toEqual([key, []]);
    for (const f of LIBRARY) expect([f.id, migrate(f.text, SEED).steps]).toEqual([f.id, []]);
    const src = '&piece label="A"\n&x 0';
    expect(migrate(src).source).toBe(src);
  });
});
