import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { readMidi } from "../midifile.js";
import { cellsFromMidi } from "../midiimport.js";
import { bare } from "./score.js";
export const midiSets = () => readdirSync('midi').filter((set) => readdirSync(`midi/${set}`).includes('index.json'));
export function midiRatchet(testFile) {
    const set = basename(fileURLToPath(testFile)).split('.')[1];
    const path = `src/engine/fold/ratchet.midi.${set}.json`;
    describe(`the ratchet: the MIDI library's ${set}, folded`, () => {
        it('is no worse than the baseline', () => {
            const now = {};
            for (const m of JSON.parse(readFileSync(`midi/${set}/index.json`, 'utf8'))) {
                const made = cellsFromMidi(readMidi(new Uint8Array(readFileSync(`midi/${set}/${m.key}.mid`))), m.title, { shorten: true });
                now[m.key] = { taken: made.folded, score: bare(made.source) };
            }
            if (process.env.UPDATE_RATCHET)
                writeFileSync(path, `{\n${Object.entries(now)
                    .map(([k, r]) => `  ${JSON.stringify(k)}: ${JSON.stringify(r)}`)
                    .join(',\n')}\n}\n`);
            const base = JSON.parse(readFileSync(path, 'utf8'));
            expect(Object.keys(now).sort(), 'files added or removed: record the baseline').toEqual(Object.keys(base).sort());
            expect(Object.keys(now).filter((k) => base[k]?.taken && !now[k]?.taken), 'files whose fold no longer plays their notes').toEqual([]);
            const sum = (rows) => Object.values(rows).reduce((a, r) => a + r.score, 0);
            expect(sum(now), "the score's size: record it (UPDATE_RATCHET=1) if the trade is worth it").toBeLessThanOrEqual(1.01 * sum(base));
        });
    });
}
