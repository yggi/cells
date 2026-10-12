import { describe, expect, it } from 'vitest';
import { cellsFromMidi } from './midiimport';
import { readMidi, writeMidi, type Smf } from './midifile';
import { pieceMidi } from './midiexport';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { noteOf } from './midi';
import { PRESETS } from './presets';

/** A piece's notes as (key, start, length), in order: what a file must give back. */
function notesOf(source: string) {
  const result = compileSource(source);
  if (!result.ok) throw new Error(`doesn’t compile: ${JSON.stringify(result.diagnostics).slice(0, 300)}`);
  const p = plan(result, codeShifts(result), result.off);
  return eventsBetween(p, 0, Number.isFinite(p.end) ? p.end : 600)
    .map((e) => ({ key: e.freq > 0 ? noteOf(e.freq).note : -1, voice: e.voice, at: e.at, dur: e.dur }))
    .sort((a, b) => a.at - b.at || a.key - b.key);
}

const file = (tracks: Smf['tracks'], tempos: Smf['tempos'] = [{ tick: 0, micros: 500_000 }]): Smf => ({ format: 1, ppq: 96, tracks, tempos, meters: [] });
const notes = (channel: number, list: [number, number, number][]) => list.map(([key, tick, end]) => ({ channel, key, velocity: 100, tick, end }));

describe('a MIDI file as a piece', () => {
  it('lays notes on the coarsest grid they fall on, a chord where they start and end together', () => {
    const smf = file([
      {
        name: 'Lead Synth',
        notes: notes(1, [
          [60, 0, 48],
          [64, 48, 96],
          [67, 48, 96],
          [72, 144, 192],
        ]),
        bends: [],
        programs: [],
      },
    ]);
    const { source, perQuarter, lines } = cellsFromMidi(smf, 'test');
    expect(perQuarter).toBe(2);
    expect(lines).toBe(1);
    expect(source).toContain('&leadSynth step=&tempo 0 [4,7] ~ 12');
    const heard = notesOf(source);
    expect(heard.map((n) => `${n.key}@${n.at.toFixed(3)}`)).toEqual(['60@0.000', '64@0.250', '67@0.250', '72@0.750']);
  });

  it('puts a note that overlaps another in a line of its own, and keeps both', () => {
    const smf = file([
      {
        name: 'piano',
        notes: notes(1, [
          [48, 0, 384],
          [60, 0, 96],
          [62, 96, 192],
          [64, 192, 288],
        ]),
        bends: [],
        programs: [],
      },
    ]);
    const { source, lines } = cellsFromMidi(smf, 'test');
    expect(lines).toBe(2);
    const heard = notesOf(source);
    expect(heard.map((n) => `${n.key}@${n.at.toFixed(2)}+${n.dur.toFixed(2)}`)).toEqual(['48@0.00+2.00', '60@0.00+0.50', '62@0.50+0.50', '64@1.00+0.50']);
  });

  it('follows the tempo map: a change of tempo is a change of weight in the meter', () => {
    const smf = file(
      [
        {
          notes: notes(1, [
            [60, 0, 96],
            [62, 96, 192],
            [64, 192, 288],
            [65, 288, 384],
          ]),
          bends: [],
          programs: [],
        },
      ],
      [
        { tick: 0, micros: 500_000 },
        { tick: 192, micros: 1_000_000 },
      ],
    );
    const heard = notesOf(cellsFromMidi(smf, 'test').source);
    expect(heard.map((n) => n.at.toFixed(3))).toEqual(['0.000', '0.500', '1.000', '2.000']);
  });

  it('writes channel 10 as drum voices by their General MIDI names', () => {
    const smf = file([
      {
        name: 'drums',
        notes: notes(10, [
          [36, 0, 24],
          [42, 0, 24],
          [38, 48, 72],
          [99, 96, 120],
        ]),
        bends: [],
        programs: [],
      },
    ]);
    const { source, dropped } = cellsFromMidi(smf, 'test');
    expect(dropped).toBe(1);
    expect(source).toContain('[&bd,&hh]');
    expect(notesOf(source).map((n) => `${n.voice}@${n.at.toFixed(2)}`)).toEqual(['bd@0.00', 'hh@0.00', 'sd@0.25']);
  });

  it('moves the notes of a file played in onto sixteenths, and says how many', () => {
    const smf = file([
      {
        notes: notes(1, [
          [60, 0, 20],
          [62, 29, 45],
          [64, 53, 70],
          [65, 77, 90],
        ]),
        bends: [],
        programs: [],
      },
    ]);
    const { perQuarter, moved } = cellsFromMidi(smf, 'test');
    expect(perQuarter).toBe(4);
    expect(moved).toBe(3);
  });

  it('BWV 847, saved as MIDI and opened again: every note, at its time and key', () => {
    const original = notesOf(PRESETS.bwv847.source);
    const result = compileSource(PRESETS.bwv847.source);
    const smf = readMidi(writeMidi(pieceMidi(result, codeShifts(result)).smf));
    const { source, notes: count, perQuarter } = cellsFromMidi(smf, 'BWV 847');
    expect(count).toBe(1765);
    expect(perQuarter).toBe(4);
    const back = notesOf(source);
    expect(back.map((n) => n.key)).toEqual(original.map((n) => n.key));
    const worst = (k: 'at' | 'dur') => back.reduce((m, n, i) => Math.max(m, Math.abs(n[k] - original[i][k])), 0);
    expect(worst('at')).toBeLessThan(0.01);
    expect(worst('dur')).toBeLessThan(0.01);
  });
});
