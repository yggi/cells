import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { planOf } from './host';
import { eventsBetween, type Played } from './realize';
import { BEND_CENTRE, bendValue, channelTable, gmDrumNote, kitNotes, melodicChannel, midiNote, noteOf, Rotation, rotationChannels, router, velocityOf } from './midi';
import { PRESETS } from './presets';

const played = (e: Partial<Played>): Played => ({ at: 0, dur: 1, voice: 'v', freq: 440, bends: [], gains: [1, 1], levels: [{ at: 0, level: 1 }], ...e });

/** The frequency of step k of a division of `period` into n equal steps, from A4. */
const ed = (k: number, n: number, period = 2) => 440 * Math.pow(period, k / n);

describe('noteOf: a frequency as a MIDI note and cents', () => {
  it('reads every 12-EDO note as its key, with no cents', () => {
    for (let n = 0; n <= 127; n++) {
      const { note, cents } = noteOf(440 * Math.pow(2, (n - 69) / 12));
      expect(note).toBe(n);
      expect(Math.abs(cents)).toBeLessThan(1e-9);
    }
  });

  it('reads every step of 19 and 31-EDO as the nearest key and its cents, over two octaves', () => {
    for (const n of [19, 31])
      for (let k = -n; k <= n; k++) {
        const { note, cents } = noteOf(ed(k, n));
        const exact = 69 + (12 * k) / n;
        expect(note).toBe(Math.round(exact));
        expect(cents).toBeCloseTo((exact - note) * 100, 9);
        expect(Math.abs(cents)).toBeLessThanOrEqual(50);
      }
  });

  it('reads just ratios against their tempered keys (a 5/4 is 13.7 cents flat, a 3/2 2 cents sharp, a 7/4 31 flat)', () => {
    const at = (r: number) => noteOf(440 * r);
    expect(at(5 / 4).note).toBe(73);
    expect(at(5 / 4).cents).toBeCloseTo(-13.686, 3);
    expect(at(3 / 2).note).toBe(76);
    expect(at(3 / 2).cents).toBeCloseTo(1.955, 3);
    expect(at(7 / 4).note).toBe(79);
    expect(at(7 / 4).cents).toBeCloseTo(-31.174, 3);
  });

  it('tunes from another A4 where asked', () => {
    expect(noteOf(432, 432)).toEqual({ note: 69, cents: 0 });
    expect(noteOf(432).note).toBe(69);
    expect(noteOf(432).cents).toBeCloseTo(-31.767, 3);
  });
});

describe('bends', () => {
  it('a 14-bit value: the centre for none, the ends at the bend range, clamped past it', () => {
    expect(bendValue(0)).toBe(BEND_CENTRE);
    expect(bendValue(200)).toBe(16383);
    expect(bendValue(-200)).toBe(0);
    expect(bendValue(100)).toBe(12288);
    expect(bendValue(100, 48)).toBe(Math.round(8192 + 8192 / 48));
    expect(bendValue(5000)).toBe(16383);
    expect([bendValue(NaN), bendValue(Infinity)]).toEqual([BEND_CENTRE, BEND_CENTRE]);
  });

  it('a 12-EDO note starts on the centre and sends no bend; a microtonal one starts on its cents', () => {
    const route = { channel: 1, drum: null };
    expect(midiNote(played({ freq: 440 }), route)).toMatchObject({ note: 69, bend: BEND_CENTRE, bends: [] });
    const n = midiNote(played({ freq: ed(1, 19) }), route)!;
    expect(n.note).toBe(70);
    expect(n.bend).toBe(bendValue((69 + 12 / 19 - 70) * 100));
  });

  it("a note's bends become bend messages; a ramp is sampled from the point before, a step jumps", () => {
    const route = { channel: 1, drum: null };
    const n = midiNote(
      played({
        dur: 1,
        bends: [
          { at: 0.2, cents: 100 },
          { at: 0.3, cents: 0, ramp: true },
          { at: 2, cents: 50 },
        ],
      }),
      route,
    )!;
    expect(n.bends[0]).toEqual({ at: 0.2, value: 12288 });
    // (the ramp back to 0 between 0.2 and 0.3, every 20 ms, then 0 at 0.3; the bend after the note's end is dropped)
    expect(n.bends.map((b) => +b.at.toFixed(3))).toEqual([0.2, 0.22, 0.24, 0.26, 0.28, 0.3]);
    expect(n.bends.at(-1)!.value).toBe(BEND_CENTRE);
    for (let i = 2; i < n.bends.length; i++) expect(n.bends[i].value).toBeLessThan(n.bends[i - 1].value);
  });

  it('a note no key reaches is not sent, nor one without a frequency', () => {
    const route = { channel: 1, drum: null };
    expect(midiNote(played({ freq: 5 }), route)).toBeNull();
    expect(midiNote(played({ freq: 20000 }), route)).toBeNull();
    expect(midiNote(played({ freq: 0 }), route)).toBeNull();
  });
});

describe('velocity', () => {
  it('is the square root of the start level times the louder gain, onto 1 … 127', () => {
    expect(velocityOf(played({ gains: [1, 0.5] }))).toBe(127);
    expect(velocityOf(played({ gains: [0.25, 0.25] }))).toBe(64);
    expect(velocityOf(played({ gains: [1, 1], levels: [{ at: 0, level: 0.25 }] }))).toBe(64);
    expect(velocityOf(played({ gains: [0, 0] }))).toBe(1);
    expect(velocityOf(played({ gains: [4, 4] }))).toBe(127);
    expect(velocityOf(played({ levels: [] }))).toBe(127);
  });
});

describe('kits: General MIDI drum notes by name', () => {
  it('knows the usual names, and a trailing number', () => {
    const want: Record<string, number> = {
      bd: 36,
      kick: 36,
      rim: 37,
      sd: 38,
      snare: 38,
      cp: 39,
      clap: 39,
      hh: 42,
      ch: 42,
      ph: 44,
      oh: 46,
      crash: 49,
      ride: 51,
      lt: 41,
      mt: 45,
      ht: 48,
      BD2: 36,
    };
    for (const [name, note] of Object.entries(want)) expect(gmDrumNote(name), name).toBe(note);
    expect(gmDrumNote('down')).toBeNull();
  });

  it('gives a name it does not know the next note from 36 no other member has', () => {
    expect([...kitNotes(['down', 'bd', 'beat', 'rim', 'sub'])]).toEqual([
      ['bd', 36],
      ['rim', 37],
      ['down', 38],
      ['beat', 39],
      ['sub', 40],
    ]);
  });

  it('gives no note past 127: a member beyond it has none, and is not sent', () => {
    const names = Array.from({ length: 100 }, (_, i) => `x${String.fromCharCode(97 + (i % 26))}${Math.floor(i / 26)}y`);
    const notes = kitNotes(names);
    expect(notes.size).toBe(128 - 36);
    expect(Math.max(...notes.values())).toBe(127);
  });
});

describe('channels', () => {
  it('numbers voices 1, 2, 3 … skipping 10, round again past 16', () => {
    expect(Array.from({ length: 17 }, (_, i) => melodicChannel(i))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 1, 2]);
  });

  it('a piece: its voices in the order it declares them, its kit members on 10 with their notes', () => {
    const r = compileSource(PRESETS.drums.source);
    const t = channelTable(r);
    expect(t.voices).toEqual([{ voice: 'rim', channel: 1, port: 1 }]);
    expect(t.kits).toEqual([{ port: 1, channel: 10 }]);
    expect(t.kit).toEqual([
      { member: 'bd', note: 36 },
      { member: 'sd', note: 38 },
      { member: 'hh', note: 42 },
      { member: 'lo', note: 41 },
      { member: 'mid', note: 45 },
      { member: 'hi', note: 48 },
    ]);
    const route = router(r, t);
    const events = eventsBetween(planOf(PRESETS.drums.source), 0, 4, true);
    const kick = events.find((e) => e.voice === 'bd')!;
    expect(route(kick)).toEqual([{ channel: 10, drum: 36, port: 1 }]);
    expect(route(events.find((e) => e.voice === 'rim')!)).toEqual([{ channel: 1, drum: null, port: 1 }]);
  });

  it('a kit put on another channel: its members go there, and voices skip it instead of 10', () => {
    const r = compileSource(PRESETS.drums.source);
    const t = channelTable(r, [{ kit: 1 }]);
    expect(t.kits).toEqual([{ port: 1, channel: 1 }]);
    expect(t.voices).toEqual([{ voice: 'rim', channel: 2, port: 1 }]);
    const route = router(r, t);
    const events = eventsBetween(planOf(PRESETS.drums.source), 0, 4, true);
    expect(route(events.find((e) => e.voice === 'bd')!)).toEqual([{ channel: 1, drum: 36, port: 1 }]);
    expect(Array.from({ length: 5 }, (_, i) => melodicChannel(i, 3))).toEqual([1, 2, 4, 5, 6]);
    expect(rotationChannels(1, 4, true, 3)).toEqual([1, 2, 4]);
    expect(channelTable(r, [{ kit: 99 }]).kits).toEqual([{ port: 1, channel: 10 }]);
  });

  it('a channel chosen by hand wins; one out of range does not', () => {
    const r = compileSource(PRESETS.sailor.source);
    expect(channelTable(r).voices).toEqual([
      { voice: 'fiddle', channel: 1, port: 1 },
      { voice: 'bass', channel: 2, port: 1 },
    ]);
    expect(channelTable(r, [{ voices: { bass: 5, fiddle: 17 } }]).voices).toEqual([
      { voice: 'fiddle', channel: 1, port: 1 },
      { voice: 'bass', channel: 5, port: 1 },
    ]);
  });

  it('a gate is one part: its receivers on its channel, a kit gate on 10', () => {
    const r = compileSource(PRESETS.gate.source);
    const t = channelTable(r);
    // (&leadOut plays &lead and &bell; &bass is played directly; &drumOut plays the kit)
    expect(t.voices).toEqual([
      { voice: 'bass', channel: 1, port: 1 },
      { voice: 'leadOut', channel: 2, port: 1 },
    ]);
    expect(t.kit.map((k) => k.member)).toEqual(['bd', 'sd', 'hh']);
    const route = router(r, channelTable(r, [{ voices: { leadOut: 7 } }]));
    const events = eventsBetween(planOf(PRESETS.gate.source), 0, 4, true);
    for (const v of ['lead', 'bell']) expect(route(events.find((e) => e.voice === v)!)).toEqual([{ channel: 7, drum: null, port: 1 }]);
    expect(route(events.find((e) => e.voice === 'bd')!)).toEqual([{ channel: 10, drum: 36, port: 1 }]);
  });

  it('a matrix of outputs: a voice on any output and channel, 0 not sent; outputs after the first send nothing unless chosen', () => {
    const r = compileSource(PRESETS.drums.source);
    expect(channelTable(r, [{}, {}]).voices).toEqual([{ voice: 'rim', channel: 1, port: 1 }]);
    const t = channelTable(r, [{ voices: { rim: 0 } }, { voices: { rim: 4 }, kit: 10 }, { voices: { rim: 2 } }]);
    expect(t.voices).toEqual([
      { voice: 'rim', channel: 4, port: 2 },
      { voice: 'rim', channel: 2, port: 3 },
    ]);
    expect(t.kits).toEqual([
      { port: 1, channel: 10 },
      { port: 2, channel: 10 },
    ]);
    const route = router(r, t);
    const events = eventsBetween(planOf(PRESETS.drums.source), 0, 4, true);
    expect(route(events.find((e) => e.voice === 'rim')!)).toEqual([
      { channel: 4, drum: null, port: 2 },
      { channel: 2, drum: null, port: 3 },
    ]);
    expect(route(events.find((e) => e.voice === 'bd')!)).toEqual([
      { channel: 10, drum: 36, port: 1 },
      { channel: 10, drum: 36, port: 2 },
    ]);
    // (the kit off the first output: nothing of it goes there)
    expect(channelTable(r, [{ kit: 0 }]).kits).toEqual([]);
  });

  it('rotation takes a free channel, the one free longest, else the first to free', () => {
    const rot = new Rotation([2, 3, 4]);
    expect([rot.take(1), rot.take(1), rot.take(2)]).toEqual([2, 3, 4]);
    // (all busy: 2 frees first; then 3)
    expect(rot.take(3)).toBe(2);
    expect(rot.take(3)).toBe(3);
    expect(rotationChannels(2, 16, true)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16]);
    expect(rotationChannels(9, 11, false)).toEqual([9, 10, 11]);
  });
});
