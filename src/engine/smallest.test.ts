import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts, type CompileResult } from './program';
import { eventsBetween, HELD, plan, type Played } from './realize';
import { windowAt } from './schedule';
import { pieceTime } from './duration';
import { pieceMidi } from './midiexport';
import { liveAt } from './live';
import { routing } from './routing';
import { writtenGraph } from './graph';
import { setAttr } from './edit';
import { cellId } from './ids';

/** Decision 028: the smallest piece that sounds is `&a loop=A4` — a voice alone, held at its own pitch, heard through a built-in card. */
const notes = (r: CompileResult, from = 0, to = 4, muted: ReadonlySet<string> = new Set()) => eventsBetween(plan(r, codeShifts(r), muted), from, to, true);
const messages = (r: CompileResult) => r.diagnostics.map((d) => d.message);
const brief = (e: Played) => ({ at: e.at, dur: e.dur, voice: e.voice, freq: +e.freq.toFixed(3), gains: e.gains, held: e.held });

describe('the smallest piece: &a loop=A4', () => {
  it('compiles clean and holds one note at 440 Hz, through the built-in card: a fader at 1 on both sides, its master postgain .8', () => {
    const r = compileSource('&a loop=A4');
    expect(r.ok).toBe(true);
    expect(r.diagnostics).toEqual([]);
    expect(r.builtinCard).toBeDefined();
    // (the master is the card's, applied after the mix as a written card's postgain= is: not in the notes' gains)
    expect(r.cells.get(r.builtinCard!)?.params.postgain).toBe(0.8);
    const all = notes(r);
    expect(all.map(brief)).toEqual([{ at: 0, dur: HELD, voice: 'a', freq: 440, gains: [1, 1], held: true }]);
    // (its own pitch, held: no bends, no levels that move, no envelope but the voice's own)
    expect(all[0].bends).toEqual([]);
    expect(all[0].levels).toEqual([{ at: 0, level: 1 }]);
    expect(all[0].env).toBeUndefined();
  });
  it('with a card written, the card is what it is heard through: at the card’s level', () => {
    for (const [card, gains] of [
      ['&out map=sample [&a]', [1, 1]],
      ['&out loop=SAMPLE_RATE map=sample [&a * .5]', [0.5, 0.5]],
      ['&out map=sample [&a * .3] [&a * .6]', [0.3, 0.6]],
    ] as const) {
      const r = compileSource(`&a loop=A4\n${card}`);
      expect(messages(r)).toEqual([]);
      expect(r.builtinCard).toBeUndefined();
      expect(notes(r).map(brief)).toEqual([{ at: 0, dur: HELD, voice: 'a', freq: 440, gains, held: true }]);
    }
  });
  it('a drone carries its own env= (attack, then held at sustain) and pitch= (a vibrato)', () => {
    const r = compileSource('&a s=saw loop=C4 env=&(map=adsr .01 .3 .4 .4) pitch=&(map=lin loop=5 0 .15 0 -.15 0)');
    expect(messages(r)).toEqual([]);
    const [e, ...rest] = notes(r, 0, 1);
    expect(rest).toEqual([]);
    expect(e.held).toBe(true);
    expect(e.freq).toBeCloseTo(261.626, 2);
    expect(e.env).toEqual({ attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.4 });
    // the vibrato bends it, five times a second, ±15 cents, the whole time it is held
    expect(e.bends.length).toBeGreaterThan(5 * 5 * HELD - 10);
    expect(Math.max(...e.bends.map((b) => b.cents))).toBeCloseTo(15, 6);
    expect(Math.min(...e.bends.map((b) => b.cents))).toBeCloseTo(-15, 6);
    expect(e.bends.at(-1)!.at).toBeCloseTo(HELD, 6);
  });
  it('the levels in its product that don’t start notes move its volume; a number scales it', () => {
    const r = compileSource('&swell map=lin loop=.5 0 1\n&a loop=A4\n&m [&a * &swell * .5]');
    expect(messages(r)).toEqual([]);
    const [e] = notes(r, 0, 1);
    expect(e.gains).toEqual([0.5, 0.5]);
    expect(e.levels.length).toBeGreaterThan(2);
    expect(e.levels[0]).toEqual({ at: 0, level: 0 });
  });
  it('two sounds nothing reads are both heard', () => {
    const r = compileSource('&a loop=A4\n&b s=sine loop=E5');
    expect(messages(r)).toEqual([]);
    expect(notes(r).map((e) => [e.voice, +e.freq.toFixed(2), e.gains])).toEqual([
      ['a', 440, [1, 1]],
      ['b', 659.26, [1, 1]],
    ]);
  });
  it('a voice a mix reads is heard through the mix, once: on the built-in card, or on a card written', () => {
    for (const src of ['&a loop=A4\n&m [&a * .5]', '&a loop=A4\n&m [&a * .5]\n&out map=sample &m']) {
      const r = compileSource(src);
      expect(messages(r)).toEqual([]);
      expect(r.outputs).toHaveLength(1);
      expect(notes(r).map((e) => e.voice)).toEqual(['a']);
    }
    // (the built-in card hears the mix, not the voice in it)
    const r = compileSource('&a loop=A4\n&m [&a * .5]');
    expect(notes(r)[0].gains).toEqual([0.5, 0.5]);
    expect(r.outputs[0].through).toEqual(['m']);
  });
  it('a melody on a voice plays as before; a voice beside it, alone, holds', () => {
    const r = compileSource('&t step=1 0 4\n&lead s=tri loop=C4\n&m [&t * &lead]\n&pad s=sine loop=C3');
    expect(messages(r)).toEqual([]);
    expect(notes(r, 0, 2).map((e) => [e.voice, e.at, e.held ?? false])).toEqual([
      ['lead', 0, false],
      ['pad', 0, true],
      ['lead', 1, false],
    ]);
  });
  it('whatever reads a sound keeps it off the built-in card: fm=, a splice; a note’s about= doesn’t', () => {
    expect(notes(compileSource('&op s=sine loop=A5\n&c s=sine loop=A4 fm=&op')).map((e) => e.voice)).toEqual(['c']);
    // (a groove reads its voices; it is heard, they aren't on their own)
    const groove = compileSource('&bd s=sine loop=A1 env=&(map=adsr 0 .2 0 .1)\n&hh s=white env=&(map=adsr 0 .04 0 .02)\n&g step=2 &bd &hh');
    expect(messages(groove)).toEqual([]);
    expect(notes(groove, 0, 1).map((e) => [e.voice, e.at, e.held ?? false])).toEqual([
      ['bd', 0, false],
      ['hh', 0.5, false],
    ]);
    // (but not about=: a note's links are annotation only, so the oscillator a note explains is heard)
    const noted = compileSource('&a loop=A4\n&why label="the oscillator" about=&a');
    expect(messages(noted)).toEqual([]);
    expect(notes(noted).map((e) => e.voice)).toEqual(['a']);
  });
  it('"Nothing plays yet" only when nothing sounds', () => {
    expect(messages(compileSource('&t step=1 0 2 4')).join()).toMatch(/Nothing plays yet/);
    expect(messages(compileSource('&a loop=A4'))).toEqual([]);
  });
  it('a piece that writes a MIDI card sends what its cards name, and nothing goes to a built-in card (decision 019)', () => {
    const r = compileSource('&t step=1 0 2\n&a s=saw\n&pad s=sine loop=C3\n&synth map=midi [&t * &a]');
    expect(r.builtinCard).toBeUndefined();
    // (&pad, on no card, plays nowhere; &a is sent, not heard)
    expect(notes(r, 0, 2).map((e) => [e.voice, e.unheard ?? false])).toEqual([
      ['a', true],
      ['a', true],
    ]);
  });
  it('is in no line: the text is the source of truth, and no edit writes it', () => {
    const src = '&a loop=A4';
    const r = compileSource(src);
    const card = r.builtinCard!;
    expect(r.cells.get(card)?.implicit).toBe(true);
    expect(r.cells.get(card)?.sink).toBe(true);
    expect(setAttr(src, card, 'postgain', '.5')).toBe(src);
    // (drawn without a card node: the voice, and nothing else)
    const g = writtenGraph(r);
    expect(g.nodes.map((n) => n.id)).toEqual([cellId('a')]);
    expect(g.edges).toEqual([]);
  });
  it('switched off, it is silent; its card switched off, too', () => {
    const r = compileSource('&a loop=A4');
    expect(notes(r, 0, 1, new Set([cellId('a')]))).toEqual([]);
    expect(notes(r, 0, 1, new Set([cellId(r.builtinCard!)]))).toEqual([]);
  });
});

describe('a drone in time', () => {
  const r = compileSource('&a loop=A4\n&t step=4 0 2 4 7\n&lead s=tri loop=C4\n&m [&t * &lead]');
  const p = plan(r, codeShifts(r));
  const key = (es: readonly Played[]) => es.map((e) => `${e.voice} ${e.at.toFixed(6)} ${e.dur.toFixed(6)} ${e.freq.toFixed(3)} ${e.bends.length}`).sort();

  it('windows played separately are the same notes as at once', () => {
    const once = eventsBetween(p, 0, 3, true);
    const windows = [0, 0.25, 0.5, 1, 1.75, 2, 2.5].map((from, i, all) => eventsBetween(p, from, all[i + 1] ?? 3, true)).flat();
    expect(key(windows)).toEqual(key(once));
    expect(once.filter((e) => e.held)).toHaveLength(1);
  });
  it('starts where play starts: the first window of a run that began there holds it, the next ones don’t strike it again', () => {
    const first = windowAt(p, 5, 0.25, { begins: 5 });
    expect(first.events.filter((e) => e.held).map((e) => [e.at, e.dur])).toEqual([[5, HELD]]);
    expect(windowAt(p, 5.25, 0.25, { begins: 5 }).events.filter((e) => e.held)).toEqual([]);
    // (a run from the start: only its first window)
    expect(windowAt(p, 5, 0.25).events.filter((e) => e.held)).toEqual([]);
  });
  it('is struck again after HELD seconds, held without a gap', () => {
    const later = eventsBetween(p, HELD - 1, HELD + 1).filter((e) => e.held);
    expect(later.map((e) => [e.at, e.dur])).toEqual([[HELD, HELD]]);
  });
  it('held to where the listener stops (a render, a file), and ends with the piece', () => {
    expect(eventsBetween(p, 0, 1, false, { until: 30 }).filter((e) => e.held)[0].dur).toBe(30);
    const ends = compileSource('&a loop=A4\n&t step=1 laps=2 0 2\n&lead s=tri loop=C4\n&m [&t * &lead]');
    const pe = plan(ends, codeShifts(ends));
    expect(pe.end).toBe(4);
    expect(eventsBetween(pe, 0, 1).filter((e) => e.held)[0].dur).toBe(4);
    expect(eventsBetween(pe, 4, 100, false, { begins: 4 }).filter((e) => e.held)).toEqual([]);
  });
  it('a drone alone doesn’t end the piece or give it a length of its own', () => {
    const alone = compileSource('&a s=saw loop=A3 pitch=&(map=lin loop=5 0 .2 0)');
    expect(plan(alone, codeShifts(alone)).end).toBe(Infinity);
    expect(pieceTime(alone)).toMatchObject({ ends: null, cycle: null, longest: null });
    // (beside a melody: the melody's cycle)
    expect(pieceTime(r).cycle).toBe(1);
  });
  it('as a MIDI file: one note, on from the start, off at the file’s end', () => {
    const alone = compileSource('&a loop=A4');
    const { smf } = pieceMidi(alone, codeShifts(alone));
    const all = smf.tracks.flatMap((t) => t.notes);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ key: 69, tick: 0 });
    // (60 s at 120 bpm, 480 ticks a quarter)
    expect(all[0].end).toBe(60 * 2 * 480);
  });
  it('lights its voice and the way out while it plays', () => {
    const alone = compileSource('&a loop=A4');
    const live = liveAt(alone, codeShifts(alone), new Set(), 12.3);
    expect([...live.voices]).toEqual([cellId('a')]);
    expect([...live.edges]).toEqual([...routing(alone, new Set()).edges]);
    expect(live.nodes.has(cellId('a'))).toBe(true);
  });
});
