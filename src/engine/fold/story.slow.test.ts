import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { readMidi } from '../midifile';
import { cellsFromMidi } from '../midiimport';
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';

/** A piece's notes, as the judge compares them (midiimport.ts: sameNotes). */
const notes = (s: string) => {
  const r = compileSource(s);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const p = plan(r, codeShifts(r), r.off);
  return eventsBetween(p, 0, p.end)
    .map((e) => `${e.at.toFixed(3)} ${e.dur.toFixed(3)} ${e.voice} ${e.freq.toFixed(2)}`)
    .sort();
};
const cells = (s: string) => new Set([...s.matchAll(/^&(\w+)/gm)].map((m) => m[1]!));

// (a minuet folded in degrees, an invention, a prelude whose hands are figures read over chords)
describe.each(['midi/anna/anh113-minuet.mid', 'midi/inventions/invention-01.mid', 'midi/wtc/wtc1-01-prelude.mid'])('the story of %s', (file) => {
  const smf = readMidi(new Uint8Array(readFileSync(file)));
  const made = cellsFromMidi(smf, 'story', { shorten: true, story: true });
  const story = made.story!;

  it('ends at the piece converted, and tells each frame', () => {
    expect(made.folded).toBe(true);
    expect(story.length).toBeGreaterThan(2);
    expect(story[story.length - 1]!.source).toBe(made.source);
    for (const f of story) expect(f.says).not.toBe('');
  });

  it('plays the same notes at every frame', () => {
    const want = notes(story[0]!.source);
    for (const f of story.slice(1)) expect(notes(f.source)).toEqual(want);
  });

  it('only adds cells, one a frame once the lines are in place, each keeping its name', () => {
    for (let i = 1; i < story.length; i++) {
      const [was, is] = [cells(story[i - 1]!.source), cells(story[i]!.source)];
      expect([...was].filter((c) => !is.has(c))).toEqual([]);
      if (/^&m\d+ · /.test(story[i]!.says)) expect(is.size - was.size).toBe(1);
    }
  });
});
