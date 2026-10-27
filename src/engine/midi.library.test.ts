// The MIDI library (`midi/<set>/`): each set's index lists exactly the files it holds, each with where it came from and
// its licence, credited in the set's README, and every file reads and plays as cells, every note kept. The folder's
// ratchets (`fold/midi.<set>.slow.test.ts`) measure how well each folds; this is what the library promises before that.
// Lifted from yggi/cell-studio src/corpus.test.ts @ 23a5972 (#326), where it was the only test of the library's index.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { midiSets } from './fold/midiRatchet';
import { readMidi } from './midifile';
import { cellsFromMidi } from './midiimport';

interface Entry {
  readonly key: string;
  readonly title: string;
  readonly opus: string;
  readonly maintainer: string;
  readonly licence: string;
  readonly source: string;
}
const library = midiSets().map((set) => ({
  set,
  files: readdirSync(`midi/${set}`).filter((f) => f.endsWith('.mid')),
  entries: JSON.parse(readFileSync(`midi/${set}/index.json`, 'utf8')) as Entry[],
  readme: readFileSync(`midi/${set}/README.md`, 'utf8'),
}));
const every = library.flatMap(({ set, entries }) => entries.map((m) => ({ set, ...m })));

describe('the MIDI library (midi/<set>)', () => {
  it('has four sets, and each index lists every file its set holds and only those', () => {
    expect(library.map((l) => l.set).sort()).toEqual(['anna', 'inventions', 'offering', 'wtc']);
    for (const { set, files, entries } of library) expect(entries.map((m) => `${m.key}.mid`).sort(), set).toEqual([...files].sort());
    // (a key is a card's id: one file a key over the whole library)
    expect(new Set(every.map((m) => m.key)).size).toBe(every.length);
  });

  it('says where each file came from, under which licence, and credits it in its set’s README', () => {
    for (const m of every) {
      expect(m.source, m.key).toMatch(/^https:\/\/www\.mutopiaproject\.org\/ftp\/BachJS\/BWV[\w]+\//);
      expect(m.licence, m.key).toMatch(/^(Public Domain|Creative Commons Attribution-ShareAlike (2\.5|3\.0|4\.0))$/);
      expect(m.opus, m.key).toMatch(/^BWV (Anh\. )?\d+\w?$/);
      expect(m.maintainer, m.key).not.toBe('');
      expect(library.find((l) => l.set === m.set)!.readme, m.key).toContain(`${m.key}.mid`);
    }
  });

  it('reads every file, and each plays as cells with every note kept', () => {
    for (const m of every) {
      const smf = readMidi(new Uint8Array(readFileSync(`midi/${m.set}/${m.key}.mid`)));
      const notes = smf.tracks.reduce((n, t) => n + t.notes.length, 0);
      expect(notes, m.key).toBeGreaterThan(90);
      expect(cellsFromMidi(smf, m.title, { free: false }).notes, m.key).toBe(notes);
    }
  });
});
