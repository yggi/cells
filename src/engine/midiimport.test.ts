import { describe, expect, it } from 'vitest';
import { cellsFromMidi } from './midiimport';
import { readMidi, writeMidi, type Smf } from './midifile';
import { pieceMidi } from './midiexport';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { noteOf } from './midi';
import { PRESETS } from './presets';
import { readFileSync } from 'node:fs';

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

describe('a MIDI file folded (engine/fold)', () => {
  it('BWV 847: the prelude as one figure over its chords, both hands, every note as before', () => {
    const result = compileSource(PRESETS.bwv847.source);
    const smf = readMidi(writeMidi(pieceMidi(result, codeShifts(result)).smf));
    const flat = cellsFromMidi(smf, 'BWV 847');
    const folded = cellsFromMidi(smf, 'BWV 847', { shorten: true });
    expect(folded.folded).toBe(true);
    expect(folded.source.length).toBeLessThan(0.75 * flat.source.length);
    expect(folded.source).toContain('&figure1 0 1 2 1 3 1 2 1\n');
    expect(folded.source).toMatch(/&chords1 step=&tempo\/16 \[12,3,2,0\] \[8,5,4,0\] \[11,5,3,2\]/);
    expect(folded.source).toMatch(/over=&chords\d &figure1!48[\s\S]*over=&chords\d &figure1!48/);
    const [a, b] = [notesOf(flat.source), notesOf(folded.source)];
    expect(b.map((n) => `${n.key} ${n.at.toFixed(4)} ${n.dur.toFixed(4)}`)).toEqual(a.map((n) => `${n.key} ${n.at.toFixed(4)} ${n.dur.toFixed(4)}`));
  });
});

describe('the fold watched as it runs (Convert to cells, live)', () => {
  it('shows the piece at each move, each one playing the file’s notes, from the flat piece to the fold taken', () => {
    const smf = readMidi(new Uint8Array(readFileSync('midi/wtc/wtc1-02-fugue.mid')));
    const steps: { source: string; tool: string; round: number }[] = [];
    const made = cellsFromMidi(smf, 'I/2 Fugue in C minor', { shorten: true, watch: (source, { tool, round }) => steps.push({ source: source(), tool, round }) });
    expect(made.folded).toBe(true);
    expect(steps.length).toBeGreaterThan(20);
    expect(steps[0].tool).toBe('start');
    expect(steps.at(-1)).toMatchObject({ tool: 'done', source: made.source });
    // (the first: every note written out, nothing folded yet; the last shorter)
    expect(steps[0].source).not.toMatch(/^&m\d/m);
    expect(steps.at(-1)!.source.length).toBeLessThan(steps[0].source.length);
    // (two folds, in semitones and in degrees of its key, each to its end; then the one taken)
    expect(new Set(steps.map((s) => s.tool.replace(/, in .*$/, '')))).toEqual(
      new Set(['start', 'phrases and their variants', 'pairs', 'taking back what doesn’t pay', 'folded', 'done']),
    );
    expect(steps.some((s) => s.tool.endsWith('in degrees of C minor'))).toBe(true);
    // every step a piece that plays the same notes (a dozen of them, spread over the fold)
    const flat = JSON.stringify(notesOf(steps[0].source));
    for (let i = 0; i < steps.length; i += Math.ceil(steps.length / 12)) expect(JSON.stringify(notesOf(steps[i].source)), `${i}: ${steps[i].tool}`).toBe(flat);
  });
});
