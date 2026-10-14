import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cutLines, keyAreas } from './sections';
import { keyName } from './degrees';
import type { Line } from './ir';
import { readMidi } from '../midifile';
import { cellsFromMidi } from '../midiimport';

/** A line from pitches, a note a step. */
const line = (name: string, pitches: number[], dur = 1): Line => ({
  name,
  length: pitches.length * dur,
  chords: pitches.map((p, i) => ({ at: i * dur, dur, values: [String(p)] })),
});
const scaleRun = (notes: number[], bars: number) => Array.from({ length: bars * 8 }, (_, i) => notes[i % notes.length]!);

describe('sections by key (#346)', () => {
  it('finds where the key changes and stays, not where one chord strays', () => {
    // (a key a note apart, C to G major for a while, isn't worth a change: SWITCH)
    // (eight bars of C major, an F♯ passing in one of them; then eight of E♭ major, ending on E♭: three notes differ)
    const c = scaleRun([0, 2, 4, 5, 7, 9, 11, 12], 8);
    c[20] = 6;
    const g = [...scaleRun([3, 5, 7, 8, 10, 12, 14, 15], 8)];
    const sections = keyAreas([line('a', [...c, ...g])], 8);
    expect(sections.map((s) => [s.from, s.to, keyName(s.key)])).toEqual([
      [0, 64, 'C major'],
      [64, 128, 'Eb major'],
    ]);
    expect(keyAreas([line('a', [...c, ...scaleRun([7, 9, 11, 12, 14, 16, 18, 19], 8)])], 8)).toHaveLength(1);
  });

  it('cuts a line where no note is held across the cut, each part from 0', () => {
    // (a note held over the key change at step 64: the cut waits for it to end)
    const l: Line = {
      name: 'a',
      length: 80,
      chords: [
        { at: 0, dur: 60, values: ['0'] },
        { at: 60, dur: 8, values: ['4'] },
        { at: 68, dur: 12, values: ['7'] },
      ],
    };
    const parts = cutLines(
      [l],
      [
        { from: 0, to: 64, key: keyAreas([line('x', scaleRun([0, 2, 4, 5, 7, 9, 11, 12], 1))], 8)[0]!.key },
        { from: 64, to: 80, key: keyAreas([line('x', scaleRun([0, 2, 4, 5, 7, 9, 11, 12], 1))], 8)[0]!.key },
      ],
      8,
    );
    expect(parts.map((p) => [p.section, p.part.length, p.part.chords.map((c) => c.at)])).toEqual([
      [0, 68, [0, 60]],
      [1, 12, [0]],
    ]);
  });

  it('writes a fugue that modulates in sections, each part read through its key, playing the file’s notes', () => {
    const smf = readMidi(new Uint8Array(readFileSync('midi/wtc/wtc1-15-fugue.mid')));
    const made = cellsFromMidi(smf, 'I/15 Fugue in G major', { shorten: true, pitches: 'sections' });
    expect(made.folded).toBe(true);
    expect(made.inKey).toMatch(/^\d sections by key \(G major, .*G major\)$/);
    expect(made.source).toMatch(/^&key2 scale\(/m);
    expect(made.source).toMatch(/^&upB over=&key2 /m);
    expect(made.source).toMatch(/^&up step=&tempo &upA(@\d)? &upB/m);
  }, 60_000);
});
