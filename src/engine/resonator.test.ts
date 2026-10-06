import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { PRESETS } from './presets';

describe('resonators: persistent bodies — notes strike them, their value is where', () => {
  const src = (PRESETS as Record<string, { source: string }>).forks.source;
  it('Two Tuning Forks: one struck (an output), one heard ringing (a resonance)', () => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.outputs.map((o) => o.voice)).toEqual(['forkA']);
    expect(r.resonances.map((x) => x.cell)).toEqual(['forkB']);
    expect(r.cells.get('forkB')!.voice).toBe(true);
  });
  it('a strike carries its value — where it’s struck', () => {
    const r = compileSource(src);
    const ev = eventsBetween(plan(r, codeShifts(r)), 0, 1);
    expect(ev[0].voice).toBe('forkA');
    expect(ev[0].value).toBe(4);
  });
  it('says what’s wrong', () => {
    const msgs = (code: string) => compileSource(code).diagnostics.map((d) => d.message).join(' | ');
    expect(msgs(src.replace('body=fork loop=A4', 'body=gong loop=A4'))).toMatch(/body=gong: one of fork, bell, bar, plate, box/);
    expect(msgs(src.replace('couple=&forkB', 'couple=&hits'))).toMatch(/couples to another resonator/);
    expect(msgs(src.replace('couple=&forkB', 'excite=&hits'))).toMatch(/driven by sound — a mix/);
  });
});

describe('bodies driven by sound: sends, springs, pipes, wires', () => {
  it('Resonanz: struck bodies heard; pipes driven by tape heads (a send of heads isn’t played as notes)', () => {
    const r = compileSource((PRESETS as Record<string, { source: string }>).resonanz.source);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.outputs.map((o) => o.voice).sort()).toEqual(['girder', 'plate', 'spring', 'wire']);
    expect(r.resonances.map((x) => x.cell).sort()).toEqual(['pipeA', 'pipeB']);
    expect(r.returns.map((x) => x.head).sort()).toEqual(['h1', 'h2']);
  });
  it('a mix only a resonator hears (excite=) still plays — as a silent send', () => {
    const r = compileSource('&bar scan(1 1 1 1) step=60bpm\n&n step=&bar*4 0\n&hiss s=pink\n&noise [&n * &hiss * .3]\n&pl body=plate loop=D3 excite=&noise\n&out loop=SAMPLE_RATE map=sample [&pl * .5]');
    expect(r.outputs.map((o) => [o.voice, o.silent])).toEqual([['hiss', true]]);
    expect(eventsBetween(plan(r, codeShifts(r)), 0, 1).map((e) => e.voice)).toEqual(['hiss']);
  });
});

describe('a resonator’s braid is its exciters — semitones from its fundamental, on a shared board', () => {
  it('none written: the twelve semitones (every body plays chromatically)', () => {
    const r = compileSource('&f body=fork loop=A4\n&out loop=SAMPLE_RATE map=sample [&f * .5]');
    expect(r.cells.get('f')!.exciters!.map((x) => x.shift)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it('written: its braid — and a cell it refers to brings its own settings (a harder mallet)', () => {
    const r = compileSource('&bright hard=.9 7 9\n&k body=tine loop=C4 hard=.3 0 2 4 &bright\n&out loop=SAMPLE_RATE map=sample [&k * .5]');
    const xs = r.cells.get('k')!.exciters!;
    expect(xs.map((x) => x.shift)).toEqual([0, 2, 4, 7, 9]);
    expect(xs.map((x) => x.params.hard ?? null)).toEqual([null, null, null, 0.9, 0.9]);
  });
  it('the Kalimba: one resonator, eight tines', () => {
    const r = compileSource((PRESETS as Record<string, { source: string }>).kalimba.source);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.cells.get('kalimba')!.exciters!.map((x) => x.shift)).toEqual([0, 2, 4, 7, 9, 12, 14, 16]);
  });
  it('board= none, or a body', () => {
    expect(compileSource('&f body=fork loop=A4 board=gong 0').diagnostics.map((d) => d.message).join()).toMatch(/board=gong: none, or one of/);
  });
});

describe('a scope reads notes exactly: which sound now, and how long ago each began', () => {
  it('notesAt: a note a second — at 0.25 s the first, begun 0.25 s ago', async () => {
    const { notesAt } = await import('./values');
    const r = compileSource('&bar scan(1 1 1 1) step=60bpm\n&tune step=&bar 0 4 7\n&v s=sine\n&out loop=SAMPLE_RATE map=sample [&tune * &v * .5]');
    const n = notesAt(r, codeShifts(r), 'tune', 0.25);
    expect(n.map((x) => x.value)).toEqual([0]);
    expect(n[0].since).toBeCloseTo(0.25, 5);
    expect(notesAt(r, codeShifts(r), 'tune', 1.5).map((x) => x.value)).toEqual([4]);
  });
});
