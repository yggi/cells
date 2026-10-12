// The ratchet (#307, docs/notes/ratchet.md): every example the way a MIDI file comes into the app (saved as MIDI, opened
// again), folded by the folder (engine/fold), and scored against the example as written: its notes kept, its score's
// size (fold/score.ts: `bare`), its phrases back. Recorded in ratchet.baseline.json, piece by piece, so each PR's diff of
// it shows what it did; the library may not get worse: no piece that kept its notes loses them, the phrases back don't
// fall, the score doesn't grow by more than 1 %. A change that makes it better records the new numbers.
// The MIDI library's ratchet is wtc.test.ts.
// Record: UPDATE_RATCHET=1 npx vitest run src/engine/fold/ratchet.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { plan } from '../realize';
import { PRESETS } from '../presets';
import { pieceMidi } from '../midiexport';
import { readMidi, writeMidi } from '../midifile';
import { cellsFromMidi } from '../midiimport';
import { bare, heard, phrases, same } from './score';

interface Row {
  readonly kept: boolean;
  readonly score: number;
  readonly back: number;
  readonly of: number;
}
const PATH = 'src/engine/fold/ratchet.baseline.json';

describe('the ratchet: every example through MIDI, folded', () => {
  it('is no worse than the baseline, over the library', () => {
    const now: Record<string, Row> = {};
    for (const [key, p] of Object.entries(PRESETS)) {
      const r = compileSource(p.source);
      // (a law's notes are computed, not written: nothing to fold)
      if (!r.ok || [...r.cells.values()].some((c) => c.params.law !== undefined)) continue;
      const midi = readMidi(writeMidi(pieceMidi(r, codeShifts(r)).smf));
      const flat = cellsFromMidi(midi, key);
      if (!flat.notes) continue;
      const fr = compileSource(flat.source);
      const seconds = plan(fr, codeShifts(fr), fr.off).end;
      const folded = cellsFromMidi(midi, key, { shorten: true }).source;
      const mine = phrases(p.source);
      const theirs = new Set(phrases(folded).values());
      now[key] = {
        kept: same(heard(p.source, seconds), heard(folded, seconds)),
        score: bare(folded),
        back: [...mine.values()].filter((s) => theirs.has(s)).length,
        of: mine.size,
      };
    }
    if (process.env.UPDATE_RATCHET)
      writeFileSync(
        PATH,
        `{\n${Object.entries(now)
          .map(([k, r]) => `  ${JSON.stringify(k)}: ${JSON.stringify(r)}`)
          .join(',\n')}\n}\n`,
      );
    const base = JSON.parse(readFileSync(PATH, 'utf8')) as Record<string, Row>;
    const record = 'record it (UPDATE_RATCHET=1) if the trade is worth it';
    expect(Object.keys(now).sort(), 'examples added or removed: record the baseline').toEqual(Object.keys(base).sort());
    expect(
      Object.keys(now).filter((k) => base[k].kept && !now[k].kept),
      'pieces that no longer play their notes once folded',
    ).toEqual([]);
    const sum = (rows: Record<string, Row>, f: (r: Row) => number) => Object.values(rows).reduce((a, r) => a + f(r), 0);
    expect(
      sum(now, (r) => r.back),
      `phrases back: ${record}`,
    ).toBeGreaterThanOrEqual(sum(base, (r) => r.back));
    expect(
      sum(now, (r) => r.score),
      `the score's size: ${record}`,
    ).toBeLessThanOrEqual(1.01 * sum(base, (r) => r.score));
  }, 180_000);
});
