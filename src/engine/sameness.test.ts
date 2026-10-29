import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSource as compileAlone } from './compile';
import { PRESETS } from './presets';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { playsSameNotes, samePiece, SAMENESS_SECONDS, soundsIdentical, wholeWindow, WHOLE_PIECE_LIMIT } from './sameness';
import { resolveSeed } from '../repository/library';
/** As Cell studio compiles an example: its `use` lines read the seed library (#196); a text with none compiles as it would without. */
const compileSource: typeof compileAlone = (text, env, options) => compileAlone(text, env, { resolve: resolveSeed, ...options });

// A line that ends (laps=1) 80 s in, at 60 bpm: one note a second, the last after the first minute.
const ENDS = (last: string, gain = '.5') => `&bar meter("4/4") step=60bpm
&tune over=scale(major) step=4n laps=1 0!79 ${last}
&lead s=sine loop=C4
&out map=sample [&tune * &lead * ${gain}]`;
const window = (a: string, b: string) => wholeWindow(compileSource(a), compileSource(b));

describe('the equalities a tool promises, over their window (#180)', () => {
  it('S1, sounds identical, sees the whole piece where it ends: a note after the first minute counts', () => {
    expect(window(ENDS('4'), ENDS('4'))).toBeCloseTo(80, 6);
    expect(samePiece(ENDS('4'), ENDS('5'))).toBe(true);
    expect(soundsIdentical(ENDS('4'), ENDS('5'))).toBe(false);
    expect(soundsIdentical(ENDS('4'), ENDS('4'))).toBe(true);
    expect(soundsIdentical(ENDS('4'), ENDS('5'), SAMENESS_SECONDS)).toBe(true);
  });

  it('S2, plays the same notes, leaves gains free; S1 does not', () => {
    expect(playsSameNotes(ENDS('4'), ENDS('4', '.25'))).toBe(true);
    expect(soundsIdentical(ENDS('4'), ENDS('4', '.25'))).toBe(false);
    expect(playsSameNotes(ENDS('4'), ENDS('5', '.25'))).toBe(false);
  });

  it('a negative gain keeps its sign in the events: S1 tells gain=.5 from gain=-.5, S2 does not (#193)', () => {
    expect(ENDS('4', '-.5')).not.toBe(ENDS('4', '.5'));
    expect(soundsIdentical(ENDS('4', '.5'), ENDS('4', '-.5'))).toBe(false);
    expect(soundsIdentical(ENDS('4', '-.5'), ENDS('4', '-.5'))).toBe(true);
    expect(playsSameNotes(ENDS('4', '.5'), ENDS('4', '-.5'))).toBe(true);
    // (two inversions are an upright voice: a sign is a polarity, so -1 * -.5 is .5)
    expect(soundsIdentical(ENDS('4', '-1 * -.5'), ENDS('4', '.5'))).toBe(true);
    const voice = (gain: string) => `&bar step=1\n&t step=&bar 0 2\n&v s=saw gain=${gain}\n&out map=sample [&t * &v]`;
    expect(soundsIdentical(voice('-1'), voice('1'))).toBe(false);
    expect(playsSameNotes(voice('-1'), voice('1'))).toBe(true);
  });

  it('a voice and its inversion mixed at equal gains cancel: the events’ gains sum to 0, and nothing is heard (#193)', () => {
    const G = '&bar step=1\n&t step=&bar 0 2\n&v s=saw\n';
    const events = (text: string) => {
      const r = compileSource(text);
      return eventsBetween(plan(r, codeShifts(r)), 0, 2, true);
    };
    const upright = events(G + '&out map=sample [&t * &v * .5]');
    const inverted = events(G + '&out map=sample [&t * &v * -.5]');
    expect(upright.map((e) => e.gains[0] + inverted[upright.indexOf(e)]!.gains[0])).toEqual([0, 0]);
    expect(inverted.map((e) => e.gains)).toEqual([
      [-0.5, -0.5],
      [-0.5, -0.5],
    ]);
    expect(events(G + '&out map=sample [&t * &v * .5, &t * &v * -.5]')).toEqual([]);
  });

  it('a piece that goes on is compared over its first minute, a day-long one over twenty minutes', () => {
    const loops = ENDS('4').replace(' laps=1', '');
    expect(window(loops, loops)).toBe(SAMENESS_SECONDS);
    expect(window(ENDS('4'), loops)).toBeCloseTo(80, 6);
    expect(window(PRESETS.fiveto12!.source, PRESETS.fiveto12!.source)).toBe(WHOLE_PIECE_LIMIT);
  });

  it('BWV 847 by hand sounds identical to the text the generator wrote, all 189 s of it (#181)', () => {
    const generated = readFileSync('fixtures/bwv847-generated.cells', 'utf8');
    expect(window(PRESETS.bwv847!.source, generated)).toBeGreaterThan(180);
    expect(soundsIdentical(PRESETS.bwv847!.source, generated, undefined, { resolve: resolveSeed })).toBe(true);
  });

  it('S1 reads every number of an event as the snapshot does, to 9 significant digits: one time summed two ways is one time (#196)', () => {
    // (a scan of four beats and meter("4/4") place the same notes, their times summed in another order: 1e-15 s apart)
    const bar = (meter: string, vibrato = '.1') =>
      `&bar ${meter} step=92bpm\n&tune over=scale(major) step=8n 0 2 4 5 7 5 4 2\n&lead s=sine loop=C4 pitch=&(map=lin loop=5 0 ${vibrato} 0 -${vibrato} 0)\n&out map=sample [&tune * &lead * .5]`;
    expect(soundsIdentical(bar('scan(1 1 1 1)'), bar('meter("4/4")'))).toBe(true);
    // (a bend that differs is still heard)
    expect(soundsIdentical(bar('scan(1 1 1 1)'), bar('meter("4/4")', '.11'))).toBe(false);
  });

  it('a text that does not compile is the same as nothing', () => {
    expect(soundsIdentical('&a over=&nowhere 0', '&a over=&nowhere 0')).toBe(false);
  });

  it('S1 and S2 read a voice by what it sounds like, not its name (#186) nor its place (#192, decision 057)', () => {
    const TWO = (first: string, second: string) => `&bar meter("4/4") step=120bpm
&t over=scale(major) step=8n 0 2 4 2
&u over=scale(major) step=4n 7 4
&a s=saw loop=C4
&b s=sine loop=C3
&out map=sample [&t * &${first}, &u * &${second}]`;
    const renamed = TWO('a', 'b').replaceAll('&a', '&lead').replaceAll('&b', '&bass');
    expect(soundsIdentical(TWO('a', 'b'), renamed)).toBe(true);
    expect(playsSameNotes(TWO('a', 'b'), renamed)).toBe(true);
    // (the lines swap voices: each note on the other voice)
    expect(soundsIdentical(TWO('a', 'b'), TWO('b', 'a'))).toBe(false);
    expect(playsSameNotes(TWO('a', 'b'), TWO('b', 'a'))).toBe(false);
    // (a cell that isn't a voice, added before the voices, changes nothing)
    expect(soundsIdentical(TWO('a', 'b'), TWO('a', 'b').replace('&a s=saw', '&m 0 2\n&a s=saw'))).toBe(true);
    // (the voices' definitions swapped with their names, so each voice's place moves: a renaming still)
    expect(soundsIdentical(TWO('a', 'b'), TWO('b', 'a').replace('&a s=saw loop=C4\n&b s=sine loop=C3', '&a s=sine loop=C3\n&b s=saw loop=C4'))).toBe(true);
  });

  it('two voices alike, merged into one, sound as the two did, the voices after them too (#192); unlike, they do not', () => {
    const THREE = (b: string, second: string) => `&bar step=2 0
&t step=&bar 0 4 7
&u step=&bar 2 5
&w step=&bar 9
&a s=saw loop=C3 lpf=900
&b ${b}
&c s=sine loop=C5
&out map=sample [&t * &a * .2, &u * &${second} * .2, &w * &c * .1]`;
    const alike = THREE('s=saw loop=C3 lpf=900', 'b');
    const merged = THREE('s=saw loop=C3 lpf=900', 'a').replace(/^&b .*\n/m, '');
    expect(soundsIdentical(alike, merged)).toBe(true);
    expect(playsSameNotes(alike, merged)).toBe(true);
    // (a voice it names read by its sound in its turn: an envelope alike, under two names)
    const enveloped = (env: string) =>
      alike.replace('&b s=saw loop=C3 lpf=900', `&b s=saw loop=C3 lpf=900 env=&${env}`).replace('&a s=saw loop=C3 lpf=900', '&a s=saw loop=C3 lpf=900 env=&e1');
    const envs = '\n&e1 map=adsr .01 .2 .5 .3\n&e2 map=adsr .01 .2 .5 .3';
    expect(soundsIdentical(enveloped('e2') + envs, enveloped('e1').replace('&u * &b', '&u * &a') + envs)).toBe(true);
    const unlike = THREE('s=saw loop=C3 lpf=1200', 'b');
    expect(soundsIdentical(unlike, unlike.replace('&u * &b', '&u * &a'))).toBe(false);
    expect(playsSameNotes(unlike, unlike.replace('&u * &b', '&u * &a'))).toBe(false);
    expect(playsSameNotes(THREE('s=sine loop=C3 lpf=900', 'b'), THREE('s=sine loop=C3 lpf=900', 'a'))).toBe(false);
    // (a voice's own sound, which no event carries: its waveform, a filter changed or dropped)
    for (const b of ['s=sine loop=C3 lpf=900', 's=saw loop=C3 lpf=300', 's=saw loop=C3']) expect(soundsIdentical(alike, THREE(b, 'b')), b).toBe(false);
  });

  it('on a MIDI card, what MIDI out sends counts: a kit member by its name sends its drum note (#192)', () => {
    // (two stand-ins alike, white noise, but a kit sends &bd as 36 and &hh as 42)
    const kit = (second: string) => `&bar meter("4/4") step=120bpm
&kit &bd &${second}
&t over=&kit step=8n 0 1 0 1
&drums map=midi(10) [&t]
&bd s=white
&hh s=white`;
    expect(soundsIdentical(kit('hh'), kit('bd'))).toBe(false);
    expect(playsSameNotes(kit('hh'), kit('bd'))).toBe(false);
    expect(soundsIdentical(kit('hh'), kit('hh'))).toBe(true);
  });
});
