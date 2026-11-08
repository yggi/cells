import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { migrate } from './index';
import { compileSource } from '../compile';
import { soundsIdentical } from '../sameness';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { ATTRIBUTES } from '../attributes';
import { EXAMPLES } from '../examples';
import { movedCard } from '../shorten/card';
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
      // (a form whose meaning changed, #75: what the before played, recorded under the version it was written for)
      const old = at.replace('.before.cells', '.v0.15.notes');
      return {
        rule,
        name: `${rule}/${f.replace('.before.cells', '')}`,
        before: readFileSync(at, 'utf8'),
        after: readFileSync(at.replace('.before.', '.after.'), 'utf8'),
        played: existsSync(old) ? readFileSync(old, 'utf8') : null,
      };
    }),
);
/** A text's notes over its first minute (voice, onset, length, pitch), as `fixtures/migrations/*.v0.15.notes` hold them. */
const notesOf = (src: string) => {
  const r = compileSource(src, undefined, SEED);
  return (
    eventsBetween(plan(r, codeShifts(r)), 0, 60)
      .map((e) => `${e.voice} ${e.at.toFixed(4)} ${e.dur.toFixed(4)} ${e.freq.toFixed(2)}`)
      .sort()
      .join('\n') + '\n'
  );
};
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
    // (the same notes: as the compiler reads both, or, where the before's meaning changed, as it played when written)
    if (p.played) expect(notesOf(p.after)).toBe(p.played);
    else expect(soundsIdentical(p.before, p.after, undefined, SEED)).toBe(true);
    expect(migrate(p.after, SEED)).toEqual({ source: p.after, steps: [] });
  });

  it('a retired form warns, and its warning names Migrate', () => {
    // (:pairs too, since #15's rung 6: Jambot's section texts stopped writing it at yggi/jambot#591)
    for (const p of PAIRS) expect([p.name, told(p.before).some((m) => m.includes('Migrate'))]).toEqual([p.name, true]);
  });

  it('every rule has a witness of its own', () => {
    expect(new Set(PAIRS.map((p) => p.rule))).toEqual(new Set(['all', 'gate', 'tap', 'swing', 'main-key', 'forwarded', 'grid', 'laps', 'renamed', 'oneshot', 'pairs', 'beats']));
    // (and a migration exact only against the old meaning has a record of what it played, which the before no longer plays)
    for (const p of PAIRS.filter((x) => x.rule === 'laps')) {
      expect(p.played, p.name).not.toBeNull();
      if (p.name.endsWith('per-tonos')) expect(notesOf(p.before), p.name).not.toBe(p.played);
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

  it('changes no example and no fragment of the seed library, and leaves a card that says what the piece is (a file’s, not a text’s)', () => {
    for (const [key, p] of Object.entries(EXAMPLES)) expect([key, migrate(p.source, SEED).steps]).toEqual([key, []]);
    for (const f of LIBRARY) expect([f.id, migrate(f.text, SEED).steps]).toEqual([f.id, []]);
    const src = '&piece title="A"\n&x 0';
    expect(migrate(src).source).toBe(src);
  });
});
