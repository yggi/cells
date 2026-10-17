import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { channelTable, midiNote, router, routesOf } from './midi';
import { withHeld } from './held';
import { pieceMidi } from './midiexport';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import e33 from '../../fixtures/jambot-legato.json';

// legato= (#94): a line's articulation, Strudel's `legato` (its `clip`): each note sounds its held length (@n, _) times the
// share in force at its onset, a number, free() or a cell of shares on its own tap. Nothing cuts a note at the bar line.

// (a bar of 4 s: a quarter a second, a sixteenth a quarter of one)
const BAR = '&bar meter("4/4") step=60bpm\n';
const VOICE = '\n&v s=sine loop=C4\n&out map=sample [&x * &v]';
const compiled = (src: string) => {
  const r = compileSource(src);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join('; '));
  return r;
};
const messages = (src: string) => compileSource(src).diagnostics.map((d) => d.message);
/** Each note of the first `seconds` as [start, length], in seconds. */
const notes = (src: string, seconds = 4) => {
  const r = compiled(src);
  return eventsBetween(plan(r, codeShifts(r)), 0, seconds - 1e-6).map((e) => [e.at, e.dur] as const);
};
/** Each note of the piece's MIDI file as [start, length], in ticks (480 a quarter). */
const midiNotes = (src: string) => {
  const r = compiled(src);
  return pieceMidi(r, codeShifts(r)).smf.tracks.flatMap((t) => t.notes.map((n) => [n.tick, n.end - n.tick] as const));
};

/** Every share Jambot writes (E33, yggi/jambot#359: bass and stab per preset, the pad's 1) and its floor and ceiling (the lead's .25, the stab's 2.5). */
const JAMBOT_SHARES = [0.25, 0.32, 0.425, 0.45, 0.565, 0.635, 0.705, 0.7575, 0.775, 0.81, 1, 1.1675, 1.3725, 1.5775, 1.7825, 1.885, 2.5];

describe('legato=: each note sounds its held length times a share', () => {
  it('absent is 1, as written: legato=1 plays the same notes', () => {
    const src = (attr: string) => `${BAR}&x step=16n ${attr}0 2@3 ~ 4 _ 5${VOICE}`;
    expect(notes(src(''), 2)).toEqual([
      [0, 0.25],
      [0.25, 0.75],
      [1.25, 0.5],
      [1.75, 0.25],
    ]);
    expect(notes(src('legato=1 '), 2)).toEqual(notes(src(''), 2));
  });

  it.each(JAMBOT_SHARES)('every share Jambot writes: legato=%s, a note held 8 sixteenths sounds 2 s times it, in the events and MIDI out', (share) => {
    const src = `${BAR}&x step=16n legato=${share} 0@8 2@8${VOICE}`;
    const played = notes(src);
    expect(played.map(([at]) => at)).toEqual([0, 2]);
    for (const [, dur] of played) expect(dur).toBeCloseTo(2 * share, 9);
    // (MIDI out: 8 sixteenths are 960 ticks, the file's ticks rounded)
    for (const [, length] of midiNotes(src)) expect(Math.abs(length - 960 * share)).toBeLessThanOrEqual(1);
  });

  it('a note sounds past the bar line, whole, in the events and in MIDI out', () => {
    const src = `${BAR}&x step=4n legato=1.885 ~ ~ ~ 0${VOICE}`;
    const [[at, dur]] = notes(src);
    expect(at).toBe(3);
    expect(dur).toBeCloseTo(1.885, 9);
    expect(at + dur).toBeGreaterThan(4);
    const [[tick, length]] = midiNotes(src).filter(([t]) => t === 1440);
    expect(tick).toBe(1440);
    expect(Math.abs(length - 480 * 1.885)).toBeLessThanOrEqual(1);
  });

  it('a note sounds into its line’s next onset: nothing cuts it', () => {
    expect(notes(`${BAR}&x step=4n legato=1.5 0 2 4 5${VOICE}`).map(([, d]) => d)).toEqual([1.5, 1.5, 1.5, 1.5]);
  });

  it('a held note under a swing: its share of the time it lasts as written', () => {
    // (the long eighth of a beat swung to .67 lasts .67 s; at .5 it sounds .335 s)
    const [[, dur]] = notes(`&bar meter("4/4") step=60bpm swing=8n:.67\n&x step=8n legato=.5 0${VOICE}`, 0.5);
    expect(dur).toBeCloseTo(0.335, 9);
  });

  it('a cell of shares, stepped on its own tap: the share in force at each onset', () => {
    // (&artic changes each eighth; the line steps sixteenths: two notes under each share)
    const durs = notes(`${BAR}&artic step=8n .5 1\n&x step=16n legato=&artic 0!8${VOICE}`, 2).map(([, d]) => d);
    expect(durs).toEqual([0.125, 0.125, 0.25, 0.25, 0.125, 0.125, 0.25, 0.25]);
    // (a share held: one a bar, the second bar's on the second)
    const bars = notes(`${BAR}&artic step=1m .25 2\n&x step=1n legato=&artic 0${VOICE}`, 8).map(([, d]) => d);
    expect(bars).toEqual([1, 8]);
  });

  it('a range scaled by a cell, as a moving parameter is: lo + (hi − lo) × its value', () => {
    const durs = notes(`${BAR}&k step=4n 0 1\n&x step=4n legato=.5..1.5 * &k 0 0${VOICE}`, 2).map(([, d]) => d);
    expect(durs).toEqual([0.5, 1.5]);
  });

  it('free(): at its default, and moved', () => {
    const src = `${BAR}&x step=4n legato=free(.32, .25..2.5) 0${VOICE}`;
    expect(notes(src, 1)[0][1]).toBeCloseTo(0.32, 9);
    const moved = withHeld(src, compiled(src), new Map([[0, 1.5]]));
    expect(moved).toContain('legato=free(1.5,');
    expect(notes(moved, 1)[0][1]).toBeCloseTo(1.5, 9);
  });

  it('Strudel’s clip= is its legato=, read as ours', () => {
    expect(notes(`${BAR}&x step=4n clip=.5 0 2${VOICE}`)).toEqual(notes(`${BAR}&x step=4n legato=.5 0 2${VOICE}`));
  });

  it('a share of 0 or less is an error: as written, left free, in a range, or in the cell it reads', () => {
    for (const attr of ['legato=0', 'legato=-.5', 'legato=free(.5, 0..2)', 'legato=0..1 * &k', 'legato=&k'])
      expect(messages(`${BAR}&k step=4n 0 1\n&x step=4n ${attr} 0${VOICE}`).join('; ')).toMatch(/legato=.*above 0/);
    expect(messages(`${BAR}&x step=4n legato=staccato 0${VOICE}`).join('; ')).toMatch(/legato=staccato: a share/);
    // (above 2.5 plays, with no warning)
    expect(messages(`${BAR}&x step=4n legato=3 0${VOICE}`)).toEqual([]);
  });

  it('it acts on a line that steps: on a voice it does nothing, with a warning', () => {
    expect(messages(`${BAR}&x step=16n legato=.5 0${VOICE}`)).toEqual([]);
    expect(messages(`${BAR}&x step=&bar legato=.5 0${VOICE}`).some((m) => m.includes('legato='))).toBe(false);
    expect(messages(`${BAR}&x step=4n 0\n&v s=sine loop=C4 legato=.5\n&out map=sample [&x * &v]`).join('; ')).toMatch(/legato= acts on .*: on &v it does nothing/);
  });

  it('with glide=: notes tie where they meet as sounded, so a share under 1 leaves each note its own', () => {
    const src = (attr: string) => `${BAR}&x step=4n ${attr}0 2 4\n&v s=sine loop=C4 glide=.1\n&out map=sample [&x * &v]`;
    expect(notes(src(''), 3)).toHaveLength(1);
    expect(notes(src('legato=.5 '), 3)).toEqual([
      [0, 0.5],
      [1, 0.5],
      [2, 0.5],
    ]);
  });
});

describe('E33’s 384 bars, stated with legato= (fixtures/jambot-legato.json)', () => {
  // (each bar played through MIDI out, as E33 reads it back: its lap on a channel of its own gives the bar's length)
  const LAP = '\n&lap step=1m 0\n&lapV loop=C4\n&read map=midi ~!14 [&lap * &lapV]';
  it('every bass, pad and stab note plays at its articulated length, within 1e-6 steps, past the bar line too', () => {
    let notes = 0;
    let past = 0;
    expect(e33.bars).toHaveLength(384);
    for (const b of e33.bars) {
      const r = compiled(b.text + LAP);
      const route = router(r, channelTable(r));
      const sent = eventsBetween(plan(r, codeShifts(r)), 0, 30).flatMap((e) => routesOf(route(e)).flatMap((x) => midiNote(e, x) ?? []));
      const barSeconds = sent.filter((n) => n.channel === 15).find((n) => n.at > 0)!.at;
      const step = barSeconds / b.steps;
      const played = sent
        .filter((n) => n.channel !== 15 && n.at < barSeconds - 1e-9)
        .map((n) => [n.channel, n.at / step, n.note, (n.end - n.at) / step])
        .sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
      expect(played.length, `${b.run} bar ${b.bar}`).toBe(b.notes.length);
      for (const [i, [channel, at, key, length]] of b.notes.entries()) {
        const [c, a, k, l] = played[i];
        expect([c, k], `${b.run} bar ${b.bar}`).toEqual([channel, key]);
        expect(Math.abs(a - at), `${b.run} bar ${b.bar}`).toBeLessThan(1e-6);
        expect(Math.abs(l - length), `${b.run} bar ${b.bar} step ${at}`).toBeLessThan(1e-6);
        notes++;
        if (at + length > b.steps + 1e-9) past++;
      }
    }
    expect({ notes, past }).toEqual({ notes: 2979, past: 46 });
  });
});

describe('a meter’s articulation: legato= by level, the default of the lines that tap it', () => {
  /** The length of the first note of a line on `step` under a 4/4 meter (60 bpm) carrying `meter`, in its own step's lengths. */
  const share = (meter: string, step: string, line = '', sig = '4/4') => {
    const r = compiled(`&bar meter("${sig}") step=60bpm ${meter}\n&x step=${step} ${line}0${VOICE}`);
    const [first, second] = eventsBetween(plan(r, codeShifts(r)), 0, 8);
    return +(first.dur / (second.at - first.at)).toFixed(9);
  };

  it('a line on the level’s tap sounds the meter’s share; one coarser than every level, as written', () => {
    expect(share('legato=16n:.5', '16n')).toBe(0.5);
    expect(share('legato=16n:.5', '8n')).toBe(1);
    expect(share('legato=16n:.5', '1m')).toBe(1);
  });

  it('several levels: the finest at or above the tap’s step, by note value, pulse, beat or a chain', () => {
    const m = 'legato=16n:.5,4n:.8';
    expect([share(m, '32n'), share(m, '16n'), share(m, '8n'), share(m, '8t'), share(m, '4n'), share(m, '2n')]).toEqual([0.5, 0.5, 0.8, 0.8, 0.8, 1]);
    expect([share(m, 'pulse'), share(m, 'beat'), share(m, 'pulse*4'), share(m, '16n*2'), share(m, '4n/2')]).toEqual([0.8, 0.8, 0.5, 0.5, 1]);
    // (7/8: its pulse an eighth, its beat 3+2+2 eighths, read by its longest)
    expect([share('legato=8n:.6,4n.:.9', 'pulse', '', '7/8'), share('legato=8n:.6,4n.:.9', 'beat', '', '7/8')]).toEqual([0.6, 0.9]);
  });

  it('a line’s own legato= wins; a line not tapping the meter keeps 1', () => {
    expect(share('legato=16n:.5', '16n', 'legato=1 ')).toBe(1);
    expect(share('legato=16n:.5', '16n', 'legato=1.5 ')).toBe(1.5);
    expect(notes(`&bar meter("4/4") step=60bpm legato=4n:.5\n&x step=1 0${VOICE}`, 1)[0][1]).toBe(1);
  });

  it('the meter’s own steps, its swing and its taps are as without it', () => {
    const base = '&bar meter("4/4") step=60bpm swing=8n:.67';
    const at = (meter: string) => notes(`${meter}\n&x step=16n 0${VOICE}`).map(([a]) => a);
    expect(at(`${base} legato=16n:.5`)).toEqual(at(base));
    expect(share('swing=8n:.67 legato=8n:.5', '8n')).toBeCloseTo(0.5, 9);
  });

  it('left free in one level; a share of 0 or less is an error, on a cell that is not a meter a warning', () => {
    const src = `${BAR.trim()} legato=16n:free(.5, .25..1)\n&x step=16n 0${VOICE}`;
    expect(notes(src, 0.5)[0][1]).toBeCloseTo(0.125, 9);
    expect(notes(withHeld(src, compiled(src), new Map([[0, 0.75]])), 0.5)[0][1]).toBeCloseTo(0.1875, 9);
    expect(messages(`${BAR.trim()} legato=16n:0\n&x step=16n 0${VOICE}`).join('; ')).toMatch(/legato=16n:0: .*above 0/);
    expect(messages(`${BAR}&x step=16n legato=16n:.5 0${VOICE}`).join('; ')).toMatch(/&x is not a meter, so it does nothing/);
  });
});
