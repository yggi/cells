import { describe, expect, it } from 'vitest';
import type { Smf, SmfNote } from '../../src/engine/midifile';
import { compileSource } from '../../src/engine/compile';
import { codeShifts } from '../../src/engine/program';
import { PRESETS } from '../../src/engine/presets';
import { pieceMidi } from '../../src/engine/midiexport';
import { readMidi, writeMidi } from '../../src/engine/midifile';
import { pathsIn, saving } from './paths';

/** A track from notes [tick, length, key]. */
const track = (name: string, notes: [number, number, number][]) => ({
  name,
  notes: notes.map(([tick, len, key]): SmfNote => ({ channel: 1, key, velocity: 90, tick, end: tick + len })),
  bends: [],
  programs: [],
});

/** A canon per tonos' plan in three lines: a theme, the same a bar later a fifth lower, a bass; each pass a tone up. */
function perTonos(passes: number): Smf {
  const theme = [60, 62, 63, 65, 67, 68, 67, 65, 63, 62, 60, 59, 60, 63, 67, 72];
  const bass = [48, 43, 44, 41];
  const T = theme.length;
  const lines: [number, number, number][][] = [[], [], []];
  for (let k = 0; k < passes; k++) {
    const at = k * T;
    theme.forEach((p, i) => lines[0]!.push([at + i, 1, p + 2 * k]));
    theme.slice(0, T - 4).forEach((p, i) => lines[1]!.push([at + 4 + i, 1, p - 7 + 2 * k]));
    bass.forEach((p, i) => lines[2]!.push([at + 4 * i, 4, p + 2 * k]));
  }
  return { format: 1, ppq: 4, tracks: [track('theme', lines[0]!), track('canon', lines[1]!), track('bass', lines[2]!)], tempos: [], meters: [] };
}

describe('paths shared by lines (paths.ts, #381)', () => {
  it('finds a canon per tonos’ plan over all its lines: the passes a tone apart, every line in the pattern', () => {
    const paths = pathsIn(perTonos(6));
    expect(paths[0]).toMatchObject({ start: 0, step: 16, by: 2, passes: 6, lines: 3 });
    // (one pass, all three lines: 16 + 12 + 4 notes)
    expect(paths[0]!.notes).toBe(32);
  });
  it('says what the path is worth as a key cell, the fold judging both', () => {
    const smf = perTonos(6);
    const s = saving(smf, pathsIn(smf)[0]!);
    // (the passes written alike fold to one, and the key cell costs less than the transpositions it replaces)
    expect(s.withKey).toBeLessThan(s.folded);
  });
  it('finds the example’s canon per tonos through MIDI', () => {
    const r = compileSource(PRESETS.pertonos!.source);
    const smf = readMidi(writeMidi(pieceMidi(r, codeShifts(r)).smf));
    const path = pathsIn(smf)[0]!;
    // (its plan: every note of a pass, in all three lines, twelve passes a whole tone apart)
    expect(path).toMatchObject({ by: 2, passes: 12, lines: 3, notes: 51 });
    // (and as a key cell the notes' part is shorter: 332 characters → 262, the tempo map aside, #404)
    const s = saving(smf, path);
    expect(s.withKey).toBeLessThan(s.folded);
  });
  it('finds none in a piece that repeats without moving', () => {
    const r = compileSource(PRESETS.pop!.source);
    const smf = readMidi(writeMidi(pieceMidi(r, codeShifts(r)).smf));
    expect(pathsIn(smf).filter((p) => p.lines > 1 && p.passes >= 4)).toEqual([]);
  });
});
