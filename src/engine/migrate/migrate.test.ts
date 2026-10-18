import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { migrate } from './index';
import { compileSource } from '../compile';
import { samePiece } from '../sameness';
import { ATTRIBUTES } from '../attributes';
import { PRESETS } from '../presets';
import { movedCard } from '../shorten/card';

// The witnesses (#156): a text written the old way and what Migrate makes of it, kept as files, so a migration stays
// honest after the parser stops reading the form it rewrites.
const DIR = 'fixtures/migrations';
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
const messages = (src: string) => compileSource(src).diagnostics.map((d) => d.message);

describe('Migrate: retired forms written as they are now (decision 049, #156)', () => {
  it.each(PAIRS.map((p) => [p.name, p]))('%s: the after, compiled clean, the same notes, and nothing more to do', (_, p) => {
    const { source, steps } = migrate(p.before);
    expect(source).toBe(p.after);
    expect(steps.length).toBeGreaterThan(0);
    expect(messages(p.after)).toEqual([]);
    expect(samePiece(p.before, p.after)).toBe(true);
    expect(migrate(p.after)).toEqual({ source: p.after, steps: [] });
  });

  it('a retired form warns, and its warning says Migrate rewrites it; &parts, a name and not a retired form, does not', () => {
    for (const p of PAIRS) {
      const said = messages(p.before).some((m) => m.includes('Migrate rewrites it'));
      expect([p.name, said]).toEqual([p.name, p.rule !== 'section']);
    }
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

  it('changes no example, and leaves a card that says what the piece is (a file’s, not a text’s)', () => {
    for (const [key, p] of Object.entries(PRESETS)) expect([key, migrate(p.source).steps]).toEqual([key, []]);
    const src = '&piece title="A"\n&x 0';
    expect(migrate(src).source).toBe(src);
  });
});
