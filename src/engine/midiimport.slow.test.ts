// The folder on whole pieces (engine/fold, #307): BWV 847 folded, and a fugue folded watched step by step. Slow (a
// fold of a whole piece takes seconds; ~15 s for BWV 847 alone): in the slow project, run when a change reaches them
// (docs/testing.md).
import { describe, expect, it } from 'vitest';
import { cellsFromMidi } from './midiimport';
import { readMidi, writeMidi } from './midifile';
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
    // (three folds, in semitones, in degrees of its key and in sections by key, each to its end; then the one taken)
    expect(new Set(steps.map((s) => s.tool.replace(/, in .*$/, '')))).toEqual(
      new Set(['start', 'clocks', 'passages at another speed', 'phrases and their variants', 'pairs', 'taking back what doesn’t pay', 'folded', 'done']),
    );
    expect(steps.some((s) => s.tool.endsWith('in degrees of C minor'))).toBe(true);
    expect(steps.some((s) => / sections by key$/.test(s.tool))).toBe(true);
    // every step a piece that plays the same notes (a dozen of them, spread over the fold)
    const flat = JSON.stringify(notesOf(steps[0].source));
    for (let i = 0; i < steps.length; i += Math.ceil(steps.length / 12)) expect(JSON.stringify(notesOf(steps[i].source)), `${i}: ${steps[i].tool}`).toBe(flat);
  });
});
