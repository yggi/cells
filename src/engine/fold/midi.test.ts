// The ratchet over the MIDI library (midi/<set>: Bach's Well-Tempered Clavier, Inventions and Sinfonias, the Anna
// Magdalena Notebook; #333, docs/notes/ratchet.md): the files as they come, each folded (`cellsFromMidi`, `shorten`), whether its fold was taken (it plays the file's notes) and its
// score's size (fold/score.ts `bare`) in ratchet.midi.json. No file whose fold was taken loses it; the score doesn't
// grow by more than 1 %. A change that makes it better records the new numbers.
// Record: UPDATE_RATCHET=1 npx vitest run src/engine/fold/midi.test.ts
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readMidi } from '../midifile';
import { cellsFromMidi } from '../midiimport';
import { bare } from './score';

const PATH = 'src/engine/fold/ratchet.midi.json';
type Row = { taken: boolean; score: number };

describe('the ratchet: the MIDI library, folded', () => {
  it('is no worse than the baseline', () => {
    const now: Record<string, Row> = {};
    // (every collection's files, as its index lists them)
    const files = readdirSync('midi').flatMap((set) =>
      (JSON.parse(readFileSync(`midi/${set}/index.json`, 'utf8')) as { key: string; title: string }[]).map((m) => ({ set, ...m })),
    );
    for (const m of files) {
      const made = cellsFromMidi(readMidi(new Uint8Array(readFileSync(`midi/${m.set}/${m.key}.mid`))), m.title, { shorten: true });
      now[m.key] = { taken: made.folded, score: bare(made.source) };
    }
    if (process.env.UPDATE_RATCHET)
      writeFileSync(
        PATH,
        `{\n${Object.entries(now)
          .map(([k, r]) => `  ${JSON.stringify(k)}: ${JSON.stringify(r)}`)
          .join(',\n')}\n}\n`,
      );
    const base = JSON.parse(readFileSync(PATH, 'utf8')) as Record<string, Row>;
    expect(Object.keys(now).sort(), 'files added or removed: record the baseline').toEqual(Object.keys(base).sort());
    expect(
      Object.keys(now).filter((k) => base[k].taken && !now[k].taken),
      'files whose fold no longer plays their notes',
    ).toEqual([]);
    const sum = (rows: Record<string, Row>) => Object.values(rows).reduce((a, r) => a + r.score, 0);
    expect(sum(now), "the score's size: record it (UPDATE_RATCHET=1) if the trade is worth it").toBeLessThanOrEqual(1.01 * sum(base));
  }, 180_000);
});
