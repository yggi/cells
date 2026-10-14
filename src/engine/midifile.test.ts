import { describe, expect, it } from 'vitest';
import { readMidi, secondsAt, SmfError, writeMidi, type Smf } from './midifile';
import { pieceMidi } from './midiexport';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { noteOf } from './midi';
import { PRESETS } from './presets';

/** A format 0 file by hand: 96 ticks a quarter, a tempo, a name, two notes in running status, one ended by velocity 0. */
const HAND = Uint8Array.from([
  ...[0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96],
  ...[0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 31],
  ...[0x00, 0xff, 0x03, 0x02, 0x41, 0x42], // name "AB"
  ...[0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20], // 500 000 µs a quarter
  ...[0x00, 0x91, 60, 100], // channel 2, C4 on
  ...[0x00, 64, 90], // (running status) E4 on
  ...[0x60, 60, 0], // a quarter later: C4 off (velocity 0)
  ...[0x30, 0x81, 64, 0x40], // an eighth later: E4 off
  ...[0x00, 0xff, 0x2f, 0x00],
]);

describe('reading a MIDI file', () => {
  it('reads notes in running status, a note-on at velocity 0 as an end, the name and the tempo', () => {
    const f = readMidi(HAND);
    expect(f.ppq).toBe(96);
    expect(f.name).toBe('AB');
    expect(f.tempos).toEqual([{ tick: 0, micros: 500_000 }]);
    expect(f.tracks[0].notes).toEqual([
      { channel: 2, key: 60, velocity: 100, tick: 0, end: 96 },
      { channel: 2, key: 64, velocity: 90, tick: 0, end: 144 },
    ]);
    expect(secondsAt(f, 144)).toBeCloseTo(0.75, 9);
  });

  it('says why bytes are not a MIDI file', () => {
    expect(() => readMidi(new TextEncoder().encode('&tune 0 2 4 5 7'))).toThrow(SmfError);
    expect(() => readMidi(HAND.subarray(0, 30))).toThrow(SmfError);
  });

  it('lays ticks through a tempo map', () => {
    const f = {
      ppq: 100,
      tempos: [
        { tick: 0, micros: 1_000_000 },
        { tick: 200, micros: 250_000 },
      ],
    };
    expect(secondsAt(f, 100)).toBeCloseTo(1, 9);
    expect(secondsAt(f, 300)).toBeCloseTo(2.25, 9);
  });
});

describe('writing a MIDI file', () => {
  it('keeps a copyright notice in its field, and text as UTF-8 (a Latin-1 one, as older files write it, read too)', () => {
    const smf: Smf = {
      format: 1,
      ppq: 96,
      name: 'I/3 Prelude in C♯ major',
      copyright: 'Typeset by Ü. Ńame (CC BY-SA 4.0)',
      tracks: [{ name: 'Füße', notes: [], bends: [], programs: [] }],
      tempos: [],
      meters: [],
    };
    const back = readMidi(writeMidi(smf));
    expect([back.name, back.copyright, back.tracks[0].name]).toEqual([smf.name, smf.copyright, 'Füße']);
    // (0xa9 alone is no UTF-8: ©, as Latin-1)
    const latin = Uint8Array.from([...HAND.subarray(0, 18), 0, 0, 0, 40, 0x00, 0xff, 0x02, 0x05, 0xa9, 0x20, 0x31, 0x37, 0x32, ...HAND.subarray(22)]);
    expect(readMidi(latin).copyright).toBe('© 172');
  });
  it('reads back what it wrote: notes, bends, programs, names, tempos, meters', () => {
    const smf: Smf = {
      format: 1,
      ppq: 480,
      name: 'piece',
      tempos: [
        { tick: 0, micros: 600_000 },
        { tick: 1920, micros: 400_000 },
      ],
      meters: [{ tick: 0, num: 3, den: 4 }],
      tracks: [
        {
          name: 'lead',
          notes: [
            { channel: 1, key: 72, velocity: 80, tick: 0, end: 240 },
            { channel: 1, key: 72, velocity: 81, tick: 240, end: 100_000 },
          ],
          bends: [{ tick: 240, channel: 1, value: 9000 }],
          programs: [{ tick: 0, channel: 1, program: 81 }],
        },
        { name: 'drums', notes: [{ channel: 10, key: 36, velocity: 127, tick: 480, end: 481 }], bends: [], programs: [] },
      ],
    };
    const back = readMidi(writeMidi(smf));
    expect(back.format).toBe(1);
    expect(back.name).toBe('piece');
    expect(back.tempos).toEqual(smf.tempos);
    expect(back.meters).toEqual(smf.meters);
    // (the conductor track is the header: the tracks are those written)
    expect(back.tracks).toEqual(smf.tracks);
  });
});

describe('a piece as a MIDI file', () => {
  /** Each note of a piece as (key, seconds), and the same read back from its file, in the same order: the same notes,
   * the times within rounding (a tick, a tempo rounded to the microsecond). */
  const roundTrip = (key: keyof typeof PRESETS) => {
    const result = compileSource(PRESETS[key].source);
    const shifts = codeShifts(result);
    const { smf, dropped } = pieceMidi(result, shifts);
    const file = readMidi(writeMidi(smf));
    const p = plan(result, shifts, result.off);
    const played = eventsBetween(p, 0, p.end)
      .filter((e) => e.freq > 0)
      .map((e) => ({ key: noteOf(e.freq).note, at: e.at }));
    const read = file.tracks.flatMap((t) => t.notes.map((n) => ({ key: n.key, at: secondsAt(file, n.tick) })));
    const order = (a: { key: number; at: number }, b: { key: number; at: number }) => a.at - b.at || a.key - b.key;
    played.sort(order);
    read.sort(order);
    const worst = read.reduce((m, n, i) => Math.max(m, Math.abs(n.at - (played[i]?.at ?? Infinity))), 0);
    return { smf, file, dropped, played: played.map((n) => n.key), read: read.map((n) => n.key), worst };
  };

  it('BWV 847: every note at its time and key, the tempo map as tempos, a track a line', () => {
    const { file, dropped, played, read, worst } = roundTrip('bwv847');
    expect(dropped).toBe(0);
    expect(read.length).toBe(1765);
    expect(read).toEqual(played);
    expect(worst).toBeLessThan(0.002);
    // (a sixteenth a step, four a beat: the prelude, Presto, Adagio, Allegro and the fugue as a handful of tempos)
    expect(file.tempos.length).toBeGreaterThan(3);
    expect(file.tempos.length).toBeLessThan(12);
    expect(file.tracks.map((t) => t.name)).toEqual(['saw', 'pulse', 'reed', 'brass', 'moog']);
    // (every note on a sixteenth's grid: 120 ticks)
    expect(file.tracks.every((t) => t.notes.every((n) => n.tick % 120 === 0))).toBe(true);
  });

  it('a kit goes out on channel 10 with its drum notes', () => {
    const { file } = roundTrip('drums');
    const drums = file.tracks.find((t) => t.notes.some((n) => n.channel === 10));
    expect(drums?.notes.length).toBeGreaterThan(0);
  });
});
