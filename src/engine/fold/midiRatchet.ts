// The ratchet over the MIDI library (midi/<set>: Bach's Well-Tempered Clavier, Inventions and Sinfonias, the Anna
// Magdalena Notebook, the Musical Offering's ricercars; #333, #367, docs/notes/ratchet.md): the files as they come, each folded (`cellsFromMidi`, `shorten`),
// whether its fold was taken (it plays the file's notes) and its score's size (fold/score.ts `bare`), in
// ratchet.midi.<set>.json. No file whose fold was taken loses it; the set's score doesn't grow by more than 1 %. A change
// that makes it better records the new numbers. One test file per set, `midi.<set>.slow.test.ts` (the sets fold side by
// side, each in a worker of its own; each records only its own baseline): a set without one fails `midi.sets.test.ts`.
// Record: UPDATE_RATCHET=1 npx vitest run src/engine/fold/midi.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMidi } from '../midifile';
import { cellsFromMidi } from '../midiimport';
import { bare } from './score';

type Row = { taken: boolean; score: number };

/** The MIDI library's collections (midi/<set>/index.json). */
export const midiSets = (): string[] => readdirSync('midi').filter((set) => readdirSync(`midi/${set}`).includes('index.json'));

/** The ratchet of the set a test file names (`midi.<set>.slow.test.ts`: pass its `import.meta.url`). */
export function midiRatchet(testFile: string): void {
  const set = basename(fileURLToPath(testFile)).split('.')[1];
  const path = `src/engine/fold/ratchet.midi.${set}.json`;
  describe(`the ratchet: the MIDI library's ${set}, folded`, () => {
    it('is no worse than the baseline', () => {
      const now: Record<string, Row> = {};
      for (const m of JSON.parse(readFileSync(`midi/${set}/index.json`, 'utf8')) as { key: string; title: string }[]) {
        const made = cellsFromMidi(readMidi(new Uint8Array(readFileSync(`midi/${set}/${m.key}.mid`))), m.title, { shorten: true });
        now[m.key] = { taken: made.folded, score: bare(made.source) };
      }
      if (process.env.UPDATE_RATCHET)
        writeFileSync(
          path,
          `{\n${Object.entries(now)
            .map(([k, r]) => `  ${JSON.stringify(k)}: ${JSON.stringify(r)}`)
            .join(',\n')}\n}\n`,
        );
      const base = JSON.parse(readFileSync(path, 'utf8')) as Record<string, Row>;
      expect(Object.keys(now).sort(), 'files added or removed: record the baseline').toEqual(Object.keys(base).sort());
      expect(
        Object.keys(now).filter((k) => base[k]?.taken && !now[k]?.taken),
        'files whose fold no longer plays their notes',
      ).toEqual([]);
      const sum = (rows: Record<string, Row>) => Object.values(rows).reduce((a, r) => a + r.score, 0);
      expect(sum(now), "the score's size: record it (UPDATE_RATCHET=1) if the trade is worth it").toBeLessThanOrEqual(1.01 * sum(base));
    });
  });
}
