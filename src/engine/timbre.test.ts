// A voice's wave and its envelope's times move (#411): an envelope's slots by name, each a number or a range scaled by
// cells, read at each note's start (`attack=.3..0.01 * &style[bite]`); and a blend of two waves, `s=tri..square * &x`,
// one voice and one note, the share of the second wave read at each note's start. Jambot's `timbreOf` (yggi/jambot
// packages/engine/src/sound.ts @ 227aa74) is the default instruments' reading of them.
import { describe, expect, it } from 'vitest';
import { pieceAudio } from './audioexport';
import { compileSource } from './compile';
import { planOf } from './host';
import { channelTable, midiNote, router, routesOf } from './midi';
import { parse } from './parser';
import { codeShifts } from './program';
import { windowAt } from './schedule';
import { resolveSeed } from '../repository/library';

const bar = '&bar meter("4/4") step=120bpm';
const messages = (text: string) => compileSource(text, undefined, { resolve: resolveSeed }).diagnostics.map((d) => d.message);
/** The events of a text's first second. */
const events = (text: string) => windowAt(planOf(text, undefined, { resolve: resolveSeed }), 0, 1 - 1e-9).events;

describe('an envelope’s slots by name, each a number or a range scaled by cells (#411)', () => {
  it('by name is by position: attack= decay= sustain= release= write the four in order', () => {
    const named = parse('&env map=adsr attack=.01 decay=.3 sustain=.5 release=.4').cells[0]!;
    const ordered = parse('&env map=adsr .01 .3 .5 .4').cells[0]!;
    expect(named.braid).toEqual({ ...ordered.braid, tokens: named.braid.kind === 'list' ? named.braid.tokens : [] });
    expect(named.braid.kind === 'list' && named.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : null))).toEqual([0.01, 0.3, 0.5, 0.4]);
  });

  it('says what is wrong: a slot missing, given twice, both spellings, a slot on a voice', () => {
    const first = (text: string) => parse(text).diagnostics[0]?.message;
    expect(first('&env map=adsr attack=.01 decay=.3 sustain=.5')).toMatch(/An envelope names every slot: release= is missing/);
    expect(first('&env map=adsr attack=.01 attack=.02 decay=.3 sustain=.5 release=.4')).toMatch(/attack= is given twice/);
    expect(first('&env map=adsr .01 .3 .5 .4 attack=.01')).toMatch(/by name \(attack=\.01\) or in order/);
    // (on any other cell, Strudel's spelling is gone: an envelope is a cell, its slots named on it)
    expect(first('&lead s=saw attack=.3')).toMatch(/attack= is gone: an envelope is a cell.*attack=\.01 decay=\.3/);
  });

  it('a moving slot reads its cells at each note’s start: the chords’ attack and release, as Jambot’s, at articulation 0, .5 and 1', () => {
    const at = (bite: number) => {
      const text = `${bar}\n&style style=&(map=style .5 .5 ${bite} .5)\n&padV from pad\n&line step=4n 0 2\n&out map=sample [&line * &padV]`;
      return events(text).map((e) => [e.env!.attack, e.env!.release]);
    };
    for (const [bite, attack, release] of [
      [0, 0.3, 0.7],
      [0.5, 0.155, 0.41],
      [1, 0.01, 0.12],
    ] as const)
      for (const [a, r] of at(bite)) {
        expect(a).toBeCloseTo(attack, 3);
        expect(r).toBeCloseTo(release, 3);
      }
  });

  it('a slot moved by a cell alone reads its values as the slot’s, at each note’s start (#597)', () => {
    const text = `${bar}\n&a map=lin step=4n .02 .4\n&s step=4n .8 .3\n&env map=adsr attack=&a decay=.1 sustain=&s release=.2\n&v s=tri loop=C3 env=&env\n&line step=4n 0 2 4 5\n&out map=sample [&line * &v]`;
    expect(messages(text)).toEqual([]);
    const envs = events(text).map((e) => [e.env!.attack, e.env!.sustain]);
    expect(envs).toHaveLength(2);
    expect(envs[0]![0]).toBeCloseTo(0.02, 6);
    expect(envs[0]![1]).toBeCloseTo(0.8, 6);
    expect(envs[1]![0]).toBeCloseTo(0.4, 6);
    expect(envs[1]![1]).toBeCloseTo(0.3, 6);
    // (until a note reads it, the slot holds 0 in the braid: what &env[attack] reads)
    const braid = parse('&a step=4n .1\n&env map=adsr attack=&a decay=.3 sustain=.5 release=.4').cells[1]!.braid;
    expect(braid.kind === 'list' && braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : null))).toEqual([0, 0.3, 0.5, 0.4]);
  });

  it('a slot moved by a cell alone says when its values are none of the slot’s (#597)', () => {
    expect(messages('&a step=4n .1 -.2\n&env map=adsr attack=&a decay=.3 sustain=.5 release=.4')).toContainEqual(
      expect.stringMatching(/attack=&a: an attack is seconds, 0 or more, and &a holds -0\.2/),
    );
    expect(messages('&s step=4n .5 1.5\n&env map=adsr attack=.01 decay=.3 sustain=&s release=.4')).toContainEqual(
      expect.stringMatching(/sustain=&s: a sustain is a level, 0 to 1, and &s holds 1\.5/),
    );
    expect(messages('&e map=adsr .01 .1 .5 .1\n&env map=adsr attack=&e decay=.3 sustain=.5 release=.4')).toContainEqual(
      expect.stringMatching(/an envelope runs 0 to 1 — give it a range/),
    );
  });

  it('follows a style that glides: a later note of a section that grows staccato has a shorter attack', () => {
    const text = `${bar}\n&style style=&(map=style .5 .5 0 .5)..&(map=style .5 .5 1 .5)\n&padV from pad\n&line step=1m 0 0 0 0\n&out map=sample [&line * &padV]`;
    const plan = planOf(text, undefined, { resolve: resolveSeed });
    const attacks = windowAt(plan, 0, 8 - 1e-9).events.map((e) => e.env!.attack);
    expect(attacks).toHaveLength(4);
    expect(attacks[0]).toBeCloseTo(0.3, 3);
    for (let i = 1; i < attacks.length; i++) expect(attacks[i]!).toBeLessThan(attacks[i - 1]!);
  });

  it('is the centre’s where no line writes the style, and moves no note MIDI sends', () => {
    const notes = (style: string) => {
      const text = `${bar}\n${style}\n&padV from pad\n&line step=4n 0 2 4 7\n&out map=midi(3) [&line * &padV]\n&hear map=sample [&line * &padV]`;
      const plan = planOf(text, undefined, { resolve: resolveSeed });
      const route = router(plan.result, channelTable(plan.result));
      return windowAt(plan, 0, 2 - 1e-9).events.flatMap((e) => routesOf(route(e)).map((r) => midiNote(e, r)));
    };
    expect(events(`${bar}\n&padV from pad\n&line step=4n 0\n&out map=sample [&line * &padV]`)[0]!.env).toEqual({ attack: 0.155, decay: 0, sustain: 1, release: 0.41 });
    expect(notes('&style style=&(map=style .5 .5 0 .5)')).toEqual(notes('&style style=&(map=style .5 .5 1 .5)'));
  });
});

describe('a blend of two waves, s=tri..square * &x (#411)', () => {
  /** A held C4's harmonics 1 to 15 (their amplitudes, over a second in its middle) on the lead at an articulation. */
  const harmonicsAt = (bite: number, s = 's=tri..square * &style[bite]') => {
    const text = `&bar meter("4/4") step=60bpm\n&style style=&(map=style .5 .5 ${bite} .5)\n&leadV ${s} loop=C4\n&line step=1m 0\n&out map=sample [&line * &leadV]`;
    const r = compileSource(text);
    expect(r.diagnostics).toEqual([]);
    const a = pieceAudio(r, codeShifts(r), { seconds: 2 });
    expect(a.diagnostics).toEqual([]);
    const [x, rate, f] = [a.mix[0], a.sampleRate, 261.6256];
    const [from, n] = [Math.round(0.5 * rate), Math.round(rate)];
    return Array.from({ length: 15 }, (_, i) => {
      let [re, im] = [0, 0];
      for (let j = 0; j < n; j++) {
        const t = (from + j) / rate;
        re += x[from + j]! * Math.cos(2 * Math.PI * (i + 1) * f * t);
        im += x[from + j]! * Math.sin(2 * Math.PI * (i + 1) * f * t);
      }
      return Math.hypot(re, im) / n;
    });
  };
  const db = (h: readonly number[]) => 10 * Math.log10(h.slice(3).reduce((a, v) => a + v * v, 0));

  it('is the first wave at 0 and the second at 1, a crossfade between, each at its own peak', () => {
    const [zero, half, one] = [harmonicsAt(0), harmonicsAt(0.5), harmonicsAt(1)];
    const [tri, square] = [harmonicsAt(0, 's=tri'), harmonicsAt(0, 's=square')];
    zero.forEach((v, i) => expect(v).toBeCloseTo(tri[i]!, 4));
    one.forEach((v, i) => expect(v).toBeCloseTo(square[i]!, 4));
    // (between, its upper harmonics between the two waves')
    expect(db(half)).toBeGreaterThan(db(tri));
    expect(db(half)).toBeLessThan(db(square));
  });

  it('the lead’s upper harmonics (above the 3rd) at articulation 1 are at least 6 dB louder than at 0, on the same note', () => {
    expect(db(harmonicsAt(1)) - db(harmonicsAt(0))).toBeGreaterThan(6);
  });

  it('is one voice: a note sends one MIDI note, whatever the share', () => {
    const text = `${bar}\n&style style=&(map=style .5 .5 .5 .5)\n&leadV from lead\n&line step=4n 0 2 4 7\n&out map=midi(1) [&line * &leadV]\n&hear map=sample [&line * &leadV]`;
    const plan = planOf(text, undefined, { resolve: resolveSeed });
    const route = router(plan.result, channelTable(plan.result));
    expect(windowAt(plan, 0, 2 - 1e-9).events.flatMap((e) => routesOf(route(e)).map((r) => midiNote(e, r)!.note))).toEqual([60, 62, 64, 67]);
  });

  it('says what is wrong: a blend with no cells, or of a noise', () => {
    expect(parse('&v s=tri..square loop=C4').diagnostics[0]?.message).toMatch(/a blend of two waves is moved by cells/);
    expect(messages(`${bar}\n&k step=4n 1\n&v s=tri..white * &k loop=C4\n&out map=sample [&k * &v]`)).toContain(
      's=tri..white: a blend is of two of the waves, sine tri saw square (or their other names)',
    );
  });
});
