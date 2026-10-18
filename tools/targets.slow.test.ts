// The analysis tools against an analyst's answer (#177, rung 2; tools/targets.ts): each target's notes, the way a MIDI
// file brings them (the example saved as MIDI, opened again), through each pipeline, scored against the target written
// by hand. Recorded in tools/targets.ratchet.json, pipeline by pipeline, so each PR's diff of it shows what it did, and
// the target's own row is the ceiling. No score may fall: neither section's precision or recall, nor the entries found;
// the structure (a share of the target's) may not grow by more than 1 %; every pipeline keeps the notes.
// Record: UPDATE_RATCHET=1 npx vitest run tools/targets.slow.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { compileSource } from '../src/engine/compile';
import { pieceMidi } from '../src/engine/midiexport';
import { readMidi, writeMidi } from '../src/engine/midifile';
import { cellsFromMidi } from '../src/engine/midiimport';
import { codeShifts } from '../src/engine/program';
import { shortenAll } from '../src/engine/shorten';
import { scoreOf, targetOf, type Score } from './targets';

/** The targets: examples written by hand as their structure, each with fixtures/targets/<key>.json. */
const TARGETS = ['bwv847'];

interface Row {
  readonly plays: boolean;
  readonly precision: number;
  readonly recall: number;
  readonly entries: number;
  readonly of: number;
  readonly structure: number;
}
const PATH = 'tools/targets.ratchet.json';
const row = (s: Score): Row => ({ plays: s.plays, precision: s.sections.precision, recall: s.sections.recall, entries: s.entries.found, of: s.entries.of, structure: s.structure });

describe('the target ratchet: the analysis tools against pieces written by hand as their structure (#177)', () => {
  it('no pipeline does worse than the baseline, on any target', () => {
    const now: Record<string, Row> = {};
    for (const key of TARGETS) {
      const target = targetOf(key);
      const r = compileSource(target.text);
      const midi = readMidi(writeMidi(pieceMidi(r, codeShifts(r)).smf));
      // the pipelines: the notes written out (what any text shows), the folder, Shorten on the notes, Shorten after the folder
      const flat = cellsFromMidi(midi, key).source;
      const folded = cellsFromMidi(midi, key, { shorten: true }).source;
      const texts: Record<string, string> = {
        target: target.text,
        flat,
        fold: folded,
        shorten: shortenAll(flat).source,
        'fold+shorten': shortenAll(folded).source,
      };
      for (const [pipeline, text] of Object.entries(texts)) now[`${key} ${pipeline}`] = row(scoreOf(target, text));
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
    expect(Object.keys(now).sort(), 'targets or pipelines added or removed: record the baseline').toEqual(Object.keys(base).sort());
    const keys = Object.keys(now);
    expect(
      keys.filter((k) => !now[k]!.plays),
      'every pipeline plays the target’s notes',
    ).toEqual([]);
    expect(
      keys.filter((k) => now[k]!.recall < base[k]!.recall || now[k]!.precision < base[k]!.precision),
      `sections found less well: ${record}`,
    ).toEqual([]);
    expect(
      keys.filter((k) => now[k]!.entries < base[k]!.entries),
      `fewer entries found: ${record}`,
    ).toEqual([]);
    expect(
      keys.filter((k) => now[k]!.structure > base[k]!.structure * 1.01),
      `structure grown more than 1 %: ${record}`,
    ).toEqual([]);
    // (the ceiling: the target scores every section and every entry it marks)
    for (const key of TARGETS) expect(now[`${key} target`]).toMatchObject({ recall: 1, structure: 1 });
  });
});
