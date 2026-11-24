// The layers a form places by the bar (#718, #720; twins of yggi/jambot#643 and #646): a drum track is lines by their
// roles, and a fill, a count-in and the ending's drums are one more each, a bar long, placed by a level line at the
// bar's rate (`[&fill * &fillAt]`, `&fillAt map=amp step=1m cycle=8 0!7 1`), as a groove places its euclid's hits by
// `&euclidLevel` one level down. The fills and the counts are found by style; Jambot's own fill, its build's and its
// ending's drums are taken by name and hit what its code hits.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { signatureOf } from '../engine/use';
import { createRepository } from './fragments';
import { LIBRARY, resolveSeed } from './library';
import { seedFragments } from './seed';
import { STYLES, stylePoint } from './styles';

const FILL_FRAGMENTS = seedFragments('fills');
const COUNT_FRAGMENTS = seedFragments('counts');
const lines = (...xs: string[]) => xs.join('\n');

/** Every hit of a text's first `seconds`, as [seconds, the voice it strikes], in time order. */
function hits(text: string, seconds: number): [number, string][] {
  const r = compileSource(text, undefined, { resolve: resolveSeed });
  expect(r.diagnostics.map((d) => d.message)).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, seconds)
    .map((e): [number, string] => [+e.at.toFixed(6), e.voice])
    .sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
}
/** A meter at 120 bpm, a quarter half a second. */
const bar = (meter: string) => `&bar meter("${meter}") step=120bpm`;
/** A bar's length in seconds at 120 bpm: its sixteenths, an eighth of a second each. */
const SIXTEENTHS: Record<string, number> = { '4/4': 16, '3/4': 12, '2/4': 8, '5/4': 20, '6/8': 12, '7/8': 14, '12/8': 24, '2/2': 16 };
const barSeconds = (meter: string) => SIXTEENTHS[meter]! / 8;

describe('found by style', () => {
  const repository = createRepository(LIBRARY);
  const ranked = (id: string, facet: string) => repository.query(stylePoint(id), 2, {}, { facet });

  it.each(['fill', 'count'])('every style of styles finds a %s at distance 0, the second never tied with it', (facet) => {
    expect(STYLES).toHaveLength(24);
    for (const s of STYLES) {
      const [a, b] = ranked(s.id, facet);
      expect(a!.distance, s.id).toBe(0);
      expect(b!.distance, s.id).toBeGreaterThan(0.05);
    }
  });

  // (Jambot's prototype's eight presets, `PROTOTYPE_PRESETS`: the E31 bar of each carries a fill, which Jambot's band
  // leaves out and plays its own in its place, #718; found on its own, a text takes it by its head)
  it('each of Jambot’s eight presets finds its own groove’s fill, and the fill alone plays its fill line', () => {
    const EIGHT = ['synthPop', 'techno', 'deepHouse', 'ambient', 'lofi', 'funk', 'bossaNova', 'swingJazz'];
    const grooves = ['synth_pop_drums', 'techno_drums', 'deep_house_drums', 'ambient_drums', 'lo_fi_hip_hop_drums', 'funk_drums', 'bossa_nova_drums', 'swing_jazz_drums'];
    expect(EIGHT.map((id) => ranked(id, 'fill')[0]!.fragment.id)).toEqual(grooves);
    for (const id of grooves) {
      const alone = hits(lines(bar('4/4'), `&fill from ${id}`, '&out map=sample [&fill]'), 2);
      expect(alone.length, id).toBeGreaterThan(0);
      expect(
        alone.every(([, voice]) => voice === 'sd'),
        id,
      ).toBe(true);
    }
  });

  it('every fill is a template whose drums are optional, as a groove’s are; every count takes the meter, its sound optional', () => {
    for (const f of FILL_FRAGMENTS) expect(signatureOf(f.text)!.main, f.id).toBeNull();
    for (const f of COUNT_FRAGMENTS) expect(signatureOf(f.text)!.main, f.id).toBe('&bar');
  });
});

describe('the fills', () => {
  // (Jambot's drums.ts @ b98e69f: a fill from `lateOf(steps)`, 12 of 4/4's 16, and a build's from `halfOf(steps)`, 8, to the bar's end, on the snare)
  it('snare_run is Jambot’s fill, the snare from the sixteenth 12 to the end of a 4/4 bar; build_run its build’s, from the half bar', () => {
    const steps = (id: string) => hits(lines(bar('4/4'), `&fill from ${id}`, '&out map=sample [&fill]'), 2).map(([t, voice]) => [t * 8, voice]);
    expect(steps('snare_run')).toEqual([12, 13, 14, 15].map((s) => [s, 'sd']));
    expect(steps('build_run')).toEqual([8, 9, 10, 11, 12, 13, 14, 15].map((s) => [s, 'sd']));
  });

  // (each fill in the meter of the style it is found at: the run ends on the bar's last sixteenth, and starts in its last beat or later)
  const METERS: Record<string, string> = { snare_run: '4/4', abanico: '4/4', timpani_roll: '4/4', tom_run: '5/4', waltz_fill: '3/4', march_roll: '2/4' };
  it.each(Object.entries(METERS))('%s fills the last beat of a bar of %s, and nothing before it', (id, meter) => {
    const played = hits(lines(bar(meter), `&fill from ${id}`, '&out map=sample [&fill]'), barSeconds(meter) - 1e-9);
    const last = barSeconds(meter) - 0.125;
    expect(played.at(-1)![0], id).toBeCloseTo(last, 6);
    expect(played[0]![0], id).toBeGreaterThanOrEqual(last - 0.375);
  });

  it('a fill placed by a level line at the bar’s rate plays on the last of every eight bars and nowhere else', () => {
    const text = lines(bar('4/4'), '&kick, &groove from funk_drums', '&fill from snare_run', '&fillAt map=amp step=1m cycle=8 0!7 1', '&out map=sample [&kick, &fill * &fillAt]');
    const fills = hits(text, 32).filter(([, voice]) => voice === 'sd');
    expect(fills.map(([t]) => Math.floor(t / 2))).toEqual([7, 7, 7, 7, 15, 15, 15, 15]);
  });
});

describe('the counts', () => {
  // (Jambot's count-in, ending.ts @ b98e69f: one bar of the opening meter's pulses at the opening tempo, the downbeat's
  // marked; its length, `countInSeconds`, a bar. Its pulses are what cells calls the beats: 6/8's two, 7/8's three)
  const BEATS: Record<string, number> = { '4/4': 4, '3/4': 3, '2/4': 2, '5/4': 5, '6/8': 2, '7/8': 3, '12/8': 4, '2/2': 2 };
  /** A bar's length in seconds, read off the click through the piece: its second bell. */
  const barOf = (meter: string) => {
    const r = compileSource(lines(bar(meter), '&count from click &bar', '&out map=sample [&count]'), undefined, { resolve: resolveSeed });
    return +eventsBetween(plan(r, codeShifts(r), r.off), 0, 10)
      .find((e) => e.at > 0 && Math.abs(e.levels[0]!.level - 0.9) < 1e-9)!
      .at.toFixed(6);
  };
  const countIn = (id: string, meter: string) =>
    hits(lines(bar(meter), `&count from ${id} &bar`, '&countIn map=amp step=1m 1 0@1000', '&out map=sample [&count * &countIn]'), 4 * barOf(meter));

  it.each(Object.keys(BEATS))('every count, placed on the first bar of %s, clicks its beats in that bar and nothing after: a bar long, as Jambot’s', (meter) => {
    const length = barOf(meter);
    for (const f of COUNT_FRAGMENTS) {
      const onsets = [...new Set(countIn(f.id, meter).map(([t]) => t))];
      expect(onsets.length, f.id).toBe(BEATS[meter]);
      expect(onsets[0], f.id).toBe(0);
      expect(
        onsets.every((t) => t < length - 1e-6),
        f.id,
      ).toBe(true);
    }
  });

  // (a metronome: a click a beat, each at the meter's accent, its levels read as values: the bar .9, a group's or a half
  // bar's start .6, a beat below it .3)
  const ACCENTS: Record<string, number[]> = {
    '4/4': [0.9, 0.3, 0.6, 0.3],
    '3/4': [0.9, 0.6, 0.6],
    '5/4': [0.9, 0.3, 0.3, 0.6, 0.3],
    '6/8': [0.9, 0.6],
    '7/8': [0.9, 0.6, 0.6],
    '12/8': [0.9, 0.3, 0.6, 0.3],
  };
  it.each(Object.entries(ACCENTS))('the click in %s accents its beats by the meter’s grouping, %j', (meter, accents) => {
    const r = compileSource(lines(bar(meter), '&count from click &bar', '&countIn map=amp step=1m 1 0@1000', '&out map=sample [&count * &countIn]'), undefined, {
      resolve: resolveSeed,
    });
    expect(r.diagnostics).toEqual([]);
    const events = eventsBetween(plan(r, codeShifts(r), r.off), 0, 4 * barOf(meter));
    expect(events.map((e) => +e.levels[0]!.level.toFixed(6))).toEqual(accents);
    // (a player's count is the same click on the player's sound)
    expect(countIn('stick_count', meter).map(([t]) => t)).toEqual(events.map((e) => +e.at.toFixed(6)));
  });

  it('the click’s accents are a head of their own, a level line any line can be played at', () => {
    const r = compileSource(lines(bar('7/8'), '&accent from click &bar', '&hh from gm_kit', '&hat step=pulse &hh', '&out map=sample [&hat * &accent]'), undefined, {
      resolve: resolveSeed,
    });
    // (the eighths are at the accent 0, .9 - 3 × .3 to the float: silent)
    const played = eventsBetween(plan(r, codeShifts(r), r.off), 0, barOf('7/8') - 1e-6)
      .filter((e) => e.levels[0]!.level > 1e-6)
      .map((e) => [e.at]);
    expect(played.map(([t]) => Math.round(t / (barOf('7/8') / 7)))).toEqual([0, 3, 5]);
  });

  it('the click through the piece, unplaced, is a metronome: every bar', () => {
    const length = barOf('7/8');
    const played = hits(lines(bar('7/8'), '&count from click &bar', '&out map=sample [&count]'), 3 * length - 1e-6);
    expect(played).toHaveLength(9);
    expect(played.filter((_, i) => i % 3 === 0).map(([t]) => t)).toEqual([0, length, 2 * length].map((t) => +t.toFixed(6)));
  });
});

describe('the ending’s drums', () => {
  // (Jambot's `finale`, ending.ts @ b98e69f, in 4/4: hats on the eighths before the landing, the kick on the one and the
  // landing, the snare on the pulse before it and an eighth before it, then kick, snare and ride together on the landing)
  it('landing hits what Jambot’s finale hits, step for step and drum for drum', () => {
    const played = hits(lines(bar('4/4'), '&landing from landing', '&out map=sample [&landing]'), 2 - 1e-9).map(([t, voice]) => [t * 8, voice]);
    expect(played).toEqual([
      [0, 'bd'],
      [0, 'hh'],
      [2, 'hh'],
      [4, 'hh'],
      [4, 'sd'],
      [6, 'hh'],
      [6, 'sd'],
      [8, 'bd'],
      [8, 'rd'],
      [8, 'sd'],
    ]);
  });
});
