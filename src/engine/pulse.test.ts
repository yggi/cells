import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { tapPositions } from './meter';
import { shorten } from './shorten';
import { mainMeter } from './midiclock';

// Decision 040: a meter knows its bar, its pulse (the numerator) and its beat (what is counted); a line taps it by pulse,
// beat or note value, and a tap comes round at the bar.

const VOICE = '\n&v s=sine loop=C4\n&out map=sample [&x * &v]';
const compiled = (src: string) => {
  const r = compileSource(src);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join('; '));
  return r;
};
/** Where a tap's notes fall in the first `bars` bars, in pulses from the downbeat. */
const positions = (meter: string, tap: string, bars = 1, attrs = '') => {
  const r = compiled(`&bar ${meter} step=60bpm\n&x step=${tap}${attrs} 0${VOICE}`);
  const bar = r.cells.get('bar')!;
  const barSeconds = bar.steps / r.clocks.get('bar')!.perSecond;
  return eventsBetween(plan(r, codeShifts(r)), 0, bars * barSeconds - 1e-6).map((e) => +((e.at / barSeconds) * bar.meter!.pulses).toFixed(3));
};

// every row of decision 040's table: where each tap's steps fall in a bar, in pulses (3/4 and 4/4 count quarters; x/8, eighths)
const third = (n: number) => +(n / 3).toFixed(3);
const TABLE: Record<string, Record<string, number[]>> = {
  '3/4': {
    pulse: [0, 1, 2],
    'pulse*2': [0, 0.5, 1, 1.5, 2, 2.5],
    beat: [0, 1, 2],
    'beat*3': [0, 1, 2, 3, 4, 5, 6, 7, 8].map(third),
    '8n': [0, 0.5, 1, 1.5, 2, 2.5],
    '16n': [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75],
    '4n.': [0, 1.5],
    '1n': [0],
    '1m': [0],
  },
  '4/4': {
    pulse: [0, 1, 2, 3],
    'pulse*2': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    beat: [0, 1, 2, 3],
    'beat*3': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(third),
    '8n': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    '16n': [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75],
    '4n.': [0, 1.5, 3],
    '1n': [0],
    '1m': [0],
  },
  '6/8': {
    pulse: [0, 1, 2, 3, 4, 5],
    'pulse*2': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5],
    beat: [0, 3],
    'beat*3': [0, 1, 2, 3, 4, 5],
    '8n': [0, 1, 2, 3, 4, 5],
    '16n': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5],
    '4n.': [0, 3],
    '1n': [0],
    '1m': [0],
  },
  '9/8': {
    pulse: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    'pulse*2': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5],
    beat: [0, 3, 6],
    'beat*3': [0, 1, 2, 3, 4, 5, 6, 7, 8],
    '8n': [0, 1, 2, 3, 4, 5, 6, 7, 8],
    '16n': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5],
    '4n.': [0, 3, 6],
    '1n': [0, 8],
    '1m': [0],
  },
  '12/8': {
    pulse: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    'pulse*2': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5],
    beat: [0, 3, 6, 9],
    'beat*3': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    '8n': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    '16n': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5],
    '4n.': [0, 3, 6, 9],
    '1n': [0, 8],
    '1m': [0],
  },
  '7/8': {
    pulse: [0, 1, 2, 3, 4, 5, 6],
    'pulse*2': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5],
    // (3+2+2: a dotted quarter and two quarters)
    beat: [0, 3, 5],
    // (three eighths, then two triplets of eighths)
    'beat*3': [0, 1, 2, 3, 3 + 2 / 3, 3 + 4 / 3, 5, 5 + 2 / 3, 5 + 4 / 3].map((x) => +x.toFixed(3)),
    '8n': [0, 1, 2, 3, 4, 5, 6],
    '16n': [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5],
    '4n.': [0, 3, 6],
    '1n': [0],
    '1m': [0],
  },
};

describe('taps by pulse, beat and note value (decision 040)', () => {
  for (const [sig, row] of Object.entries(TABLE))
    describe(sig, () => {
      for (const [tap, want] of Object.entries(row))
        it(`step=${tap}: ${want.length} a bar, at ${want.join(' ')}`, () => {
          expect(positions(`meter("${sig}")`, tap)).toEqual(want);
          // (and the next bar the same: it comes round at the bar line)
          const pulses = compiled(`&m meter("${sig}")`).cells.get('m')!.meter!.pulses;
          expect(positions(`meter("${sig}")`, tap, 2).slice(want.length)).toEqual(want.map((p) => +(p + pulses).toFixed(3)));
        });
    });

  it('a meter knows its pulse, its beat and the note value of a pulse', () => {
    const m = (src: string) => {
      const { pulses, unit, beats } = compiled(`&m ${src}`).cells.get('m')!.meter!;
      return { pulses, unit, beats };
    };
    expect(m('meter("3/4")')).toEqual({ pulses: 3, unit: 4, beats: [1, 1, 1] });
    expect(m('meter("6/8")')).toEqual({ pulses: 6, unit: 8, beats: [3, 3] });
    expect(m('meter("9/8")')).toEqual({ pulses: 9, unit: 8, beats: [3, 3, 3] });
    expect(m('meter("12/8")')).toEqual({ pulses: 12, unit: 8, beats: [3, 3, 3, 3] });
    expect(m('meter("7/8")')).toEqual({ pulses: 7, unit: 8, beats: [3, 2, 2] });
    // (a scan: its entries its pulses, each a quarter, and its beats)
    expect(m('scan(27 23 26 24)')).toEqual({ pulses: 4, unit: 4, beats: [1, 1, 1, 1] });
    // (beat= states another feel: alla breve)
    expect(m('meter("4/4") beat=2')).toEqual({ pulses: 4, unit: 4, beats: [2, 2] });
  });

  it('a note value longer than what is left of the bar is cut at the bar line', () => {
    // 1n in 3/4: one step a bar, a bar long
    expect(positions('meter("3/4")', '1n', 3)).toEqual([0, 3, 6]);
    // 4n. in 4/4: 3+3+2 eighths, the tresillo
    const eighths = positions('meter("4/4")', '4n.').map((p) => p * 2);
    expect(eighths).toEqual([0, 3, 6]);
    expect([...eighths.slice(1), 8].map((p, i) => p - eighths[i])).toEqual([3, 3, 2]);
  });

  it('cycle=n on a tap runs it n bars before it comes round: step=1n cycle=4 in 3/4 is three whole notes over four bars', () => {
    expect(positions('meter("3/4")', '1n', 4, ' cycle=4')).toEqual([0, 4, 8]);
    expect(positions('meter("3/4")', '1n', 8, ' cycle=4')).toEqual([0, 4, 8, 12, 16, 20]);
  });

  it('swing written on the meter moves no tap’s count, only its positions', () => {
    for (const tap of ['pulse', 'beat', '8n', '16n', '4n.', '1m']) {
      const straight = positions('meter("4/4", 2)', tap);
      const swung = positions('meter("4/4", 2) swing=8n:.67', tap);
      expect(swung.length, tap).toBe(straight.length);
      expect(swung[0], tap).toBe(0);
    }
    // (the eighths swing: each pair's second comes two thirds through)
    expect(positions('meter("4/4", 2) swing=8n:.67', '8n')).toEqual([0, 0.67, 1, 1.67, 2, 2.67, 3, 3.67]);
    // (the beats don't move)
    expect(positions('meter("4/4", 2) swing=8n:.67', 'beat')).toEqual([0, 1, 2, 3]);
  });

  it('a scan meter: its pulses are its entries, each a quarter, and the taps follow its bend', () => {
    // scan(27 23 26 24): beats at 0 27 50 76 % of the bar
    expect(positions('scan(27 23 26 24)', 'pulse')).toEqual([0, 1.08, 2, 3.04]);
    expect(positions('scan(27 23 26 24)', '8n')).toEqual([0, 0.54, 1.08, 1.54, 2, 2.52, 3.04, 3.52]);
  });

  it('pulse= on a scan says what its entries are: step=pulse each entry, beat each quarter, bpm counting quarters', () => {
    // twelve sixteenths at ♩ = 60: a beat a second, an entry a quarter of one
    const src = (tap: string, scan = 'scan(1!12)') => `&bar ${scan} pulse=16n step=60bpm\n&x step=${tap} 0${VOICE}`;
    const at = (tap: string, scan?: string) => eventsBetween(plan(compiled(src(tap, scan)), codeShifts(compiled(src(tap, scan)))), 0, 3 - 1e-6).map((e) => +e.at.toFixed(4));
    expect(at('pulse')).toEqual([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75]);
    expect(at('16n')).toEqual(at('pulse'));
    expect(at('beat')).toEqual([0, 1, 2]);
    expect(at('4n')).toEqual([0, 1, 2]);
    expect(at('8n')).toEqual([0, 0.5, 1, 1.5, 2, 2.5]);
    const r = compiled(src('pulse'));
    expect(r.cells.get('bar')!.meter).toMatchObject({ pulses: 12, unit: 16, beats: [4, 4, 4] });
    expect(r.cells.get('bar')!.beat).toBe(4); // (its steps a beat: the MIDI clock's 24 ticks a quarter)
    expect(mainMeter(r)).toEqual({ cell: 'bar', beat: 4 });
    // (a scan that ends mid-beat: its bpm still counts quarters, the last beat its share)
    const odd = compiled(src('pulse', 'scan(1!13)'));
    expect(odd.cells.get('bar')!.meter!.beats).toEqual([4, 4, 4, 1]);
    expect(odd.clocks.get('bar')!.perSecond).toBeCloseTo(4, 9);
    // (the default, 4n: each entry a quarter and a beat, as before)
    expect(compiled('&m scan(1 1 1)').cells.get('m')!.meter).toMatchObject({ unit: 4, beats: [1, 1, 1] });
    // (not a scan, or not a note value: it says so)
    expect(
      compileSource('&m 1 1 pulse=16n step=60bpm')
        .diagnostics.map((d) => d.message)
        .filter((m) => !m.startsWith('Nothing plays')),
    ).toEqual([expect.stringMatching(/pulse= says the note value of a scan's entries/)]);
    expect(
      compileSource('&m scan(1 1) pulse=fast step=60bpm')
        .diagnostics.map((d) => d.message)
        .filter((m) => !m.startsWith('Nothing plays')),
    ).toEqual([expect.stringMatching(/fast is not one/)]);
  });

  it('bpm counts beats: with unequal beats the bar lasts beats / bpm and its beats keep their proportions (7/8 at 90: 2 s, 0.86 and two 0.57)', () => {
    const r = compiled(`&bar meter("7/8") step=90bpm\n&x step=beat 0${VOICE}`);
    const at = eventsBetween(plan(r, codeShifts(r)), 0, 4 - 1e-6).map((e) => e.at);
    expect(at.map((t) => +t.toFixed(4))).toEqual([0, 0.8571, 1.4286, 2, 2.8571, 3.4286]);
    expect([at[1] - at[0], at[2] - at[1], at[3] - at[2]].map((d) => +d.toFixed(2))).toEqual([0.86, 0.57, 0.57]);
    // (6/8 at 60: two beats a bar, a bar of 2 s; alla breve 4/4 at 60: two beats, 2 s)
    const bar = (src: string) => {
      const c = compiled(`&bar ${src}${VOICE.replace('&x', '&bar')}`);
      return c.cells.get('bar')!.steps / c.clocks.get('bar')!.perSecond;
    };
    expect(bar('meter("6/8") step=60bpm')).toBeCloseTo(2, 9);
    expect(bar('meter("4/4") step=60bpm beat=2')).toBeCloseTo(2, 9);
    expect(bar('meter("4/4") step=60bpm')).toBeCloseTo(4, 9);
  });

  it('a time parameter reads a tap as a length, as the same length in seconds does (#87)', () => {
    const play = (meter: string, time: string) => {
      const r = compiled(`${meter}\n&x step=pulse 0 2\n&v s=saw delaytime=${time} delayfeedback=.4\n&out map=sample [&x * &v]`);
      return { time: r.cells.get('v')!.params.delaytime as number, events: eventsBetween(plan(r, codeShifts(r)), 0, 4).map((e) => ({ ...e })) };
    };
    const four = '&bar meter("4/4") step=120bpm';
    // (at 120 bpm a beat is half a second)
    for (const [tap, seconds] of [
      ['8n', 0.25],
      ['4n.', 0.75],
      ['16n', 0.125],
      ['8t', 1 / 6],
      ['1m', 2],
      ['pulse', 0.5],
      ['beat*2', 0.25],
    ] as const) {
      const got = play(four, tap);
      expect(got.time, tap).toBeCloseTo(seconds, 6);
      expect(got.events, tap).toEqual(play(four, String(+seconds.toFixed(6))).events);
    }
    // (7/8 as 3+2+2 at 90 bpm: a bar of 2 s, three beats: a parameter is one number, so `beat` is their mean, 2/3 s)
    expect(play('&bar meter("7/8") step=90bpm', 'beat').time).toBeCloseTo(2 / 3, 6);
    // (a named meter, at its own tempo)
    expect(play(`${four}\n&bar2 meter("3/4") step=60bpm`, '&bar2:4n').time).toBeCloseTo(1, 6);
    // (a swing moves the steps and not their mean)
    expect(play('&bar meter("4/4") step=120bpm swing=8n:2/3'.replace('2/3', '.67'), '8n').time).toBeCloseTo(0.25, 6);
  });

  it('a tap as a length needs a meter that keeps time, and says so', () => {
    const d = compileSource('&v s=saw delaytime=8n').diagnostics.filter((x) => x.severity === 'error');
    expect(d.map((x) => x.message)).toEqual([expect.stringContaining('delaytime=8n taps the piece')]);
  });

  it('a tap reads the main meter, or the one it names; chains step it as they step any clock', () => {
    const two = `&bar meter("4/4") step=120bpm\n&bar2 meter("3/4") step=120bpm\n&x step=&bar2:pulse 0${VOICE}`;
    const r = compiled(two);
    expect(r.mainMeter).toBe('bar');
    expect(r.cells.get('x')!.step).toMatchObject({ driver: 'bar2', tap: 'pulse' });
    expect(eventsBetween(plan(r, codeShifts(r)), 0, 3 - 1e-6).map((e) => e.at)).toEqual([0, 0.5, 1, 1.5, 2, 2.5]);
    // 1m/2: a step every two bars; 8n*2 says what 16n says
    expect(positions('meter("4/4")', '1m/2', 4)).toEqual([0, 8]);
    expect(positions('meter("4/4")', '8n*2')).toEqual(positions('meter("4/4")', '16n'));
  });

  it('says what is wrong: no meter, a cell that is not one, a tap of a voice', () => {
    const errs = (src: string) => compileSource(src + VOICE).diagnostics.map((d) => d.message);
    expect(errs('&x step=16n 0')).toEqual([expect.stringMatching(/taps the piece's main meter, and it has none/)]);
    expect(errs('&bar meter("4/4") step=60bpm\n&t 0 1\n&x step=&t:8n 0')).toEqual([expect.stringMatching(/&t is not a meter that keeps time/)]);
    expect(compileSource('&bar meter("4/4") step=60bpm\n&x step=&bar:9n 0').ok).toBe(false);
  });

  it('a raw step=&bar warns with the tap that says the same, and Shorten rewrites it so', () => {
    const src = `&bar scan(1 1 1 1) step=120bpm\n&x step=&bar*2 0 2 4 5${VOICE}`;
    expect(compileSource(src).diagnostics.map((d) => d.message)).toEqual([
      "step=&bar*2 steps by the meter cell's own steps: tap the meter by pulse, beat or a note value (step=8n)",
    ]);
    const tap = shorten(src).find((s) => s.kind === 'tap')!;
    expect(tap.after).toBe('&x step=8n 0 2 4 5');
    expect(compileSource(tap.apply(src)).diagnostics).toEqual([]);
    // (a meter stepped by another, scan(2 1) step=8n, is tapped by its pulse, by name)
    const swing = `&bar scan(1 1 1 1) step=120bpm\n&swing scan(2 1) step=8n\n&x step=&swing 0 1${VOICE}`;
    expect(shorten(swing).find((s) => s.kind === 'tap')!.after).toBe('&x step=&swing:pulse 0 1');
  });

  it('tapPositions: by index, a lap of bars', () => {
    const m = compiled('&m meter("3/4")').cells.get('m')!.meter!;
    expect(tapPositions(m, { written: '8t', kind: 'note', whole: 1 / 12 })).toHaveLength(9);
    expect(tapPositions(m, { written: '1m', kind: 'bar' }, 3)).toEqual([0, 3, 6]);
  });
});
