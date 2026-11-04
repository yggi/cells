import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { migrate } from './index';
import { compileSource } from '../compile';
import { soundsIdentical } from '../sameness';
import { ATTRIBUTES } from '../attributes';
import { PRESETS } from '../presets';
import { movedCard } from '../shorten/card';
import { LIBRARY, resolveSeed } from '../../repository/library';

// The witnesses (#156): a text written the old way and what Migrate makes of it, kept as files, so a migration stays
// honest after the parser stops reading the form it rewrites. A text's `use` and `from` lines read the seed library.
const DIR = 'fixtures/migrations';
const SEED = { resolve: resolveSeed };
const PAIRS = readdirSync(DIR).flatMap((rule) =>
  readdirSync(`${DIR}/${rule}`)
    .filter((f) => f.endsWith('.before.cells'))
    .map((f) => {
      const at = `${DIR}/${rule}/${f}`;
      return { rule, name: `${rule}/${f.replace('.before.cells', '')}`, before: readFileSync(at, 'utf8'), after: readFileSync(at.replace('.before.', '.after.'), 'utf8') };
    }),
);
/** The code, its comments left out. */
const code = (src: string) => src.replace(/#.*$/gm, '');
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

  it('a retired form warns, and its warning names Migrate; &parts, a name and not a retired form, does not', () => {
    for (const p of PAIRS) {
      const said = told(p.before).some((m) => m.includes('Migrate'));
      expect([p.name, said]).toEqual([p.name, p.rule !== 'section']);
    }
  });

  it('every rule has a witness of its own', () => {
    expect(new Set(PAIRS.map((p) => p.rule))).toEqual(new Set(['all', 'gate', 'tap', 'section', 'swing', 'use', 'main-key', 'forwarded', 'from']));
  });

  it('every attribute marked old has a witness that rewrites it, or is the card’s, which movedCard moves', () => {
    const card = movedCard('&piece title="A" tags="tutorial" tier=1\n&x 0');
    for (const [key, a] of Object.entries(ATTRIBUTES)) {
      if (!a.old) continue;
      const written = new RegExp(`(^|\\s)${key}=`, 'm');
      const pair = PAIRS.find((p) => written.test(code(p.before)));
      if (pair) expect([key, written.test(code(pair.after))]).toEqual([key, false]);
      else expect([key, card?.text.includes(`${key}=`)]).toEqual([key, false]);
    }
  });

  it('changes no example and no fragment of the seed library, and leaves a card that says what the piece is (a file’s, not a text’s)', () => {
    for (const [key, p] of Object.entries(PRESETS)) expect([key, migrate(p.source, SEED).steps]).toEqual([key, []]);
    for (const f of LIBRARY) expect([f.id, migrate(f.text, SEED).steps]).toEqual([f.id, []]);
    const src = '&piece title="A"\n&x 0';
    expect(migrate(src).source).toBe(src);
  });
});
