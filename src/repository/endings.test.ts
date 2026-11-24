// The ending (#720, twin of yggi/jambot#646): a song's last bar and its ring, a fragment found by style, `finale`, which
// plays what Jambot's band plays there (`cadence` and `finale`, ending.ts), part by part, over every mode.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { mod } from '../theory/modes';
import { createRepository } from './fragments';
import { LIBRARY, resolveSeed } from './library';
import { STYLES, stylePoint } from './styles';

const lines = (...xs: string[]) => xs.join('\n');
/** A sixteenth of 4/4 at 120 bpm, in seconds. */
const SIXTEENTH = 0.125;

/** One part's notes, as [onset in sixteenths, length in sixteenths, semitones from the key's tonic], over a key on D. */
function part(head: string, key: string, meter = '4/4', ending = 'finale'): [number, number, number][] {
  const text = lines(
    `&bar meter("${meter}") step=120bpm`,
    `&key ${key}`,
    `&${head} from ${ending} &key`,
    '&v s=sine loop=C4',
    head === 'finaleDrums' ? `&out map=sample [&${head}]` : `&out [&${head} * &v]`,
  );
  const r = compileSource(text, undefined, { resolve: resolveSeed });
  expect(r.diagnostics.map((d) => d.message)).toEqual([]);
  // (one lap of the ending: its two bars at 120 bpm)
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, 4 - 1e-6)
    .map((e): [number, number, number] => [+(e.at / SIXTEENTH).toFixed(6), +(e.dur / SIXTEENTH).toFixed(6), Math.round(12 * Math.log2(e.freq / 261.625565)) - 2])
    .sort((a, b) => a[0] - b[0] || a[2] - b[2]);
}

const MODES: Record<string, readonly number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};

// Lifted from yggi/jambot packages/engine/src/ending.ts @ b98e69f, in 4/4: the cadence's chords (the dominant seventh on
// the tonic's fifth, from step 0; the key's triad from the landing, step 8) and what each part plays over them, as pitch
// classes from the tonic, each note's onset and length in sixteenths; the tonic rings to `stepsOf + RING_STEPS`, 24.
const LANDING = 8;
const HELD = 16 + 8;
const jambot = (scale: readonly number[]) => ({
  dominant: [7, 11, 2, 5],
  tonic: [scale[0]!, scale[2]!, scale[4]!],
  bass: [
    [0, LANDING, 7],
    [LANDING, HELD - LANDING, 0],
  ],
  lead: [
    [0, LANDING, scale[1]!],
    [LANDING, HELD - LANDING, 0],
  ],
});
const classes = (notes: readonly (readonly number[])[]) => notes.map(([at, length, pitch]) => [at, length, mod(pitch!, 12)]);

describe('found by style', () => {
  const repository = createRepository(LIBRARY);
  // (Jambot's ten presets, the prototype's eight and Electro swing and Spooky, find Jambot's ending, finale, as #720 bounds
  // it; the other styles an ending of their idiom's)
  const FOUND: Record<string, string> = {
    synthPop: 'finale',
    techno: 'finale',
    deepHouse: 'finale',
    ambient: 'finale',
    lofi: 'finale',
    funk: 'finale',
    bossaNova: 'finale',
    swingJazz: 'finale',
    electroSwing: 'finale',
    spooky: 'finale',
    kinderlied: 'plagal',
    acid: 'stop',
    happyHardcore: 'stop',
    elektro: 'stop',
    darkAmbient: 'drone_out',
    baroque: 'picardy',
    bluesShuffle: 'blues_ending',
    seaShanty: 'plagal',
    chiptune: 'stop',
    salsa: 'stop',
    waltz: 'finale',
    march: 'finale',
    tripHop: 'drone_out',
    // (#947: Pop's song ends on the same V–I)
    pop: 'finale',
  };
  it('every style of styles finds an ending at distance 0, the second never tied with it: Jambot’s ten presets finale', () => {
    expect(STYLES.map((s) => s.id).sort()).toEqual(Object.keys(FOUND).sort());
    for (const s of STYLES) {
      const [first, second] = repository.query(stylePoint(s.id), 2, {}, { facet: 'ending' });
      expect([first!.fragment.id, first!.distance], s.id).toEqual([FOUND[s.id], 0]);
      expect(second!.distance, s.id).toBeGreaterThan(0.05);
    }
  });
});

describe('what Jambot’s band plays at its end, in 4/4', () => {
  it.each(Object.entries(MODES))('over %s on D: the chords, the bass, the pad and the lead, onset, length and pitch class', (mode, scale) => {
    const key = `scale(${mode}, D)`;
    const want = jambot(scale);
    const chords = part('cadence', key);
    // (the dominant's four tones to the landing, the tonic's three from it to the lap's end: the chord in force for the
    // parts that read it, which sound it to Jambot's 24, the bar's end and the ring)
    expect(chords.filter(([at]) => at === 0).map(([, length]) => length)).toEqual([LANDING, LANDING, LANDING, LANDING]);
    expect(chords.filter(([at]) => at === LANDING).map(([, length]) => length)).toEqual([32 - LANDING, 32 - LANDING, 32 - LANDING]);
    expect(new Set(chords.filter(([at]) => at === 0).map(([, , p]) => mod(p, 12)))).toEqual(new Set(want.dominant));
    expect(new Set(chords.filter(([at]) => at === LANDING).map(([, , p]) => mod(p, 12)))).toEqual(new Set(want.tonic));
    expect(classes(part('finaleBass', key))).toEqual(want.bass);
    expect(classes(part('finaleLead', key))).toEqual(want.lead);
    const pad = part('finalePad', key);
    expect(new Set(pad.filter(([at]) => at === 0).map(([, , p]) => mod(p, 12)))).toEqual(new Set(want.dominant));
    expect(new Set(pad.filter(([at]) => at === LANDING).map(([, , p]) => mod(p, 12)))).toEqual(new Set(want.tonic));
    expect(pad.every(([at, length]) => length === (at === 0 ? LANDING : HELD - LANDING))).toBe(true);
  });

  it('each part moves as Jambot’s does: the bass up a fourth to the tonic (the nearer), the lead down a step, the pad to the voicing that moves least', () => {
    const key = 'scale(aeolian, D)';
    const [dominant, tonic] = part('finaleBass', key);
    expect(tonic![2] - dominant![2]).toBe(5);
    const [second, home] = part('finaleLead', key);
    expect(home![2] - second![2]).toBe(-2);
    const pad = part('finalePad', key);
    const before = pad.filter(([at]) => at === 0).map(([, , p]) => p);
    const after = pad.filter(([at]) => at === LANDING).map(([, , p]) => p);
    // (each voice of the tonic within a fourth of a voice of the dominant: no leap of the whole chord)
    expect(after.every((p) => before.some((q) => Math.abs(p - q) <= 5))).toBe(true);
    expect(Math.max(...after) - Math.min(...after)).toBeLessThan(12);
  });

  it('the drums are finale’s: hats and a backbeat leaning in, then kick, snare and ride on the landing, and nothing in the ring', () => {
    const hits = part('finaleDrums', 'scale(aeolian, D)').map(([at]) => at);
    expect(hits).toEqual([0, 0, 2, 4, 4, 6, 6, 8, 8, 8]);
  });

  // (locrian's fifth degree is diminished: the dominant stands on it, a semitone under Jambot's, which stands on the
  // perfect fifth above the tonic whatever the key; Jambot's composer plays no locrian key at a preset)
  it('over locrian, the one difference: the dominant stands on the key’s fifth degree, a diminished fifth', () => {
    const chords = part('cadence', 'scale(locrian, D)');
    expect(new Set(chords.filter(([at]) => at === 0).map(([, , p]) => mod(p, 12)))).toEqual(new Set([6, 10, 1, 4]));
  });
});

describe('in any meter, and placed by its section', () => {
  // (Jambot lands on the bar's half on an eighth, `slotStepOn`: the same in 3/4, 6/8 and 5/4; in 7/8, an odd number of
  // eighths, it lands on the third eighth, cells on the half bar itself, seven sixteenths in)
  it.each([
    ['3/4', 12, 6],
    ['6/8', 12, 6],
    ['5/4', 20, 10],
    ['7/8', 14, 7],
  ])('in %s, a bar of %i sixteenths, the landing is the half bar, %i in', (meter, sixteenths, half) => {
    const r = compileSource(
      lines(`&bar meter("${meter}") step=120bpm`, '&key scale(aeolian, D)', '&finaleLead from finale &key', '&v s=sine loop=C4', '&out [&finaleLead * &v]'),
      undefined,
      {
        resolve: resolveSeed,
      },
    );
    expect(r.diagnostics).toEqual([]);
    // (the lead's dominant, its tonic on the landing, then the dominant again two bars on: its lap)
    const [start, landing, again] = eventsBetween(plan(r, codeShifts(r), r.off), 0, 20).map((e) => e.at);
    const bar = (again! - start!) / 2;
    expect(+(((landing! - start!) / bar) * sixteenths).toFixed(6)).toBe(half);
  });

  it('a score passes its ending section’s clock: the ending starts with the section, and the tonic rings through its second bar', () => {
    const text = lines(
      '&bar meter("4/4") step=120bpm laps=4',
      '&key scale(aeolian, D)',
      '&parts step=2n &songHalf &endHalf',
      '&plan over=&parts step=1m 0@2 1@2',
      '&tune over=&key step=&songHalf 0 4',
      '&finaleLead from finale(half=&endHalf) &key',
      '&v s=sine loop=C4',
      '&out [&tune * &v, &finaleLead * &v]',
    );
    const r = compileSource(text, undefined, { resolve: resolveSeed });
    expect(r.diagnostics).toEqual([]);
    const notes = eventsBetween(plan(r, codeShifts(r), r.off), 0, 8).map((e) => [e.at, e.dur]);
    expect(notes).toEqual([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 2],
    ]);
  });
});

describe('the endings by style', () => {
  const ENDINGS = ['finale', 'stop', 'picardy', 'plagal', 'blues_ending', 'drone_out'];
  /** The pitch classes sounding at an onset, from the tonic. */
  const at = (notes: readonly [number, number, number][], onset: number) => [...new Set(notes.filter(([o]) => o === onset).map(([, , p]) => mod(p, 12)))].sort((a, b) => a - b);

  it('each takes the key and gives the same heads, so a score changes its ending by its name alone', () => {
    for (const id of ENDINGS) {
      const text = LIBRARY.find((f) => f.id === id)!.text;
      const signature = /^(&[^\n]*?) from \(([^)]*)\) &key/m.exec(text);
      expect(signature?.[1], id).toBe('&cadence, &finaleBass, &finalePad, &finaleLead, &finaleDrums');
      expect(signature?.[2].split(', ')[0], id).toBe('&half');
    }
  });

  it('stop: the tonic chord on the one, an eighth long, a kick and a crash, then nothing', () => {
    const chords = part('cadence', 'scale(aeolian, D)', '4/4', 'stop');
    expect(at(chords, 0)).toEqual([0, 3, 7]);
    expect(part('finalePad', 'scale(aeolian, D)', '4/4', 'stop').map(([o, length]) => [o, length])).toEqual([
      [0, 2],
      [0, 2],
      [0, 2],
    ]);
    expect(part('finaleDrums', 'scale(aeolian, D)', '4/4', 'stop').map(([o]) => o)).toEqual([0, 0]);
  });

  it('picardy: the dominant seventh, then the tonic major over a minor key', () => {
    const chords = part('cadence', 'scale(aeolian, D)', '4/4', 'picardy');
    expect(at(chords, 0)).toEqual([2, 5, 7, 11]);
    expect(at(chords, LANDING)).toEqual([0, 4, 7]);
  });

  it('plagal: the fourth’s chord, then the tonic’s, the tune falling from the sixth to the fifth', () => {
    const chords = part('cadence', 'scale(ionian, D)', '4/4', 'plagal');
    expect(at(chords, 0)).toEqual([0, 5, 9]);
    expect(at(chords, LANDING)).toEqual([0, 4, 7]);
    expect(classes(part('finaleLead', 'scale(ionian, D)', '4/4', 'plagal')).map(([, , p]) => p)).toEqual([9, 7]);
  });

  it('blues_ending: the dominant seventh, then the tonic’s seventh chord, its flat seventh left hanging', () => {
    const chords = part('cadence', 'scale(mixolydian, D)', '4/4', 'blues_ending');
    expect(at(chords, 0)).toEqual([2, 5, 7, 11]);
    expect(at(chords, LANDING)).toEqual([0, 4, 7, 10]);
    const [dominant, tonic] = part('finaleBass', 'scale(mixolydian, D)', '4/4', 'blues_ending');
    expect(tonic![2] - dominant![2]).toBe(5);
  });

  it('drone_out: the tonic held a bar and a half, no dominant, the lead on its fifth', () => {
    expect(at(part('cadence', 'scale(aeolian, D)', '4/4', 'drone_out'), 0)).toEqual([0, 3, 7]);
    expect(part('finaleBass', 'scale(aeolian, D)', '4/4', 'drone_out').map(([o, length]) => [o, length])).toEqual([[0, 24]]);
    expect(classes(part('finaleLead', 'scale(aeolian, D)', '4/4', 'drone_out'))).toEqual([[0, 24, 7]]);
  });
});
