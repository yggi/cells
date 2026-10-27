import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { holesOf } from '../repository/holes';
import { METER_FRAGMENTS } from '../repository/meters';
import { MODE_FRAGMENTS } from '../repository/modes';
import { resolveSeed } from '../repository/library';

// #290: a value a fragment leaves open is a hole like a name: a meter's rate read from a tempo cell (`step=&tempo`,
// `&tempo step=104bpm`), a key's tonic from a cell holding a note (`scale(dorian, &tonic)`, `&tonic D`).

const lines = (...xs: string[]) => xs.join('\n');
const compiled = (src: string) => compileSource(src, undefined, { resolve: resolveSeed });
const messages = (src: string) => compiled(src).diagnostics.map((d) => d.message);
/** Every event of a text's first `seconds`: time, length, pitch, voice. */
const events = (src: string, seconds: number) => {
  const r = compiled(src);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join('; '));
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, seconds).map((e) => [+e.at.toFixed(9), +e.dur.toFixed(9), +e.freq.toFixed(6), e.voice]);
};
/** A bass and a kick over the main meter and the main key. */
const BODY = lines('&kick step=16n 0 ~ 2 ~ 4 ~ 0 ~', '&bass over=&key step=8n 0 2 4 6', '&v loop=C2', '&out map=sample [&bass * &v, &kick * &v]');

describe('a meter’s tempo read from a cell', () => {
  for (const [meter, bpm, swing] of [
    ['4/4', 104, ' swing=16n:.6'],
    ['6/8', 60, ''],
    ['7/8', 90, ''],
  ] as const)
    it(`${meter} at ${bpm} bpm${swing}: plays what the rate written on the meter plays, and is the main meter`, () => {
      const read = lines(`&bar meter("${meter}") step=&tempo${swing}`, `&tempo step=${bpm}bpm`, '&key scale(dorian, D)', BODY);
      const written = lines(`&bar meter("${meter}") step=${bpm}bpm${swing}`, '&key scale(dorian, D)', BODY);
      expect(messages(read)).toEqual([]);
      expect(compiled(read).mainMeter).toBe('bar');
      expect(events(read, 8)).toEqual(events(written, 8));
      expect(events(read, 8).length).toBeGreaterThan(0);
    });

  it('a chain on it moves the rate: step=&tempo*2 is twice the tempo', () => {
    expect(events(lines('&bar meter("4/4") step=&tempo*2', '&tempo step=60bpm', '&key scale(dorian, D)', BODY), 4)).toEqual(
      events(lines('&bar meter("4/4") step=120bpm', '&key scale(dorian, D)', BODY), 4),
    );
  });

  it('a tempo the text doesn’t write is a hole: the fragment uses &tempo', () => {
    expect(holesOf('&bar meter("4/4") step=&tempo', compiled).uses).toEqual(['&tempo']);
  });

  it('a meter stepped by a cell with a braid steps by its steps, as before: no main meter', () => {
    expect(compiled(lines('&bar meter("4/4") step=&clock', '&clock step=104bpm 0 1', '&kick step=16n 0')).mainMeter).toBeUndefined();
  });
});

describe('a key’s tonic read from a cell', () => {
  for (const [tonic, written] of [
    ['D', 'D'],
    ['F#', 'F#'],
    ['Bb3', 'Bb'],
    ['2', 'D'],
  ] as const)
    it(`&tonic ${tonic} plays what scale(dorian, ${written}) plays`, () => {
      const read = lines('&bar meter("4/4") step=104bpm', '&key scale(dorian, &tonic)', `&tonic ${tonic}`, BODY);
      expect(messages(read)).toEqual([]);
      expect(events(read, 8)).toEqual(events(lines('&bar meter("4/4") step=104bpm', `&key scale(dorian, ${written})`, BODY), 8));
    });

  it('the tonic is a hole the text fills; with none, the compile says the cell is unknown', () => {
    expect(holesOf('&key scale(dorian, &tonic)', compiled).uses).toEqual(['&tonic']);
    expect(messages(lines('&bar meter("4/4") step=104bpm', '&key scale(dorian, &tonic)', BODY))).toEqual(['Unknown cell &tonic']);
  });

  it('a tonic cell holds one note: anything else is an error at it', () => {
    for (const held of ['D E', '~', '[0,4]'])
      expect(messages(lines('&bar meter("4/4") step=104bpm', '&key scale(dorian, &tonic)', `&tonic ${held}`, BODY))).toEqual([
        "&tonic holds a key's tonic (scale(…, &tonic)): write one note, a name or a pitch class (&tonic D, &tonic 2), or step it (&tonic step=1m/8 D F)",
      ]);
  });
});

describe('a stepped tonic, and one left free (#301, decision 060)', () => {
  const head = '&bar meter("4/4") step=60bpm';
  const body = lines(
    '&bass over=&key step=8n 0 2 4 6 7 6 4 2',
    '&harm over=&key step=2n [0,2,4] [3,5,7]',
    '&pad over=&harm step=4n 0 1 2 0',
    '&v loop=C3',
    '&out map=sample [&bass * &v, &pad * &v]',
  );
  /** The events of bar `n` (from 0; a bar is 4 s at 60 bpm). */
  const bar = (src: string, n: number) => events(src, 4 * (n + 1) - 1e-6).filter(([at]) => (at as number) >= 4 * n - 1e-9);
  const written = (tonic: string) => lines(head, `&key scale(dorian, ${tonic})`, body);
  const over = (tonic: string) => lines(head, '&key scale(dorian, &tonic)', `&tonic ${tonic}`, body);

  it('a tonic a bar: each bar plays what the key written out for it plays, and it comes round', () => {
    const src = over('step=1m D F');
    expect(messages(src)).toEqual([]);
    for (const [n, tonic] of [
      [0, 'D'],
      [1, 'F'],
      [2, 'D'],
      [3, 'F'],
    ] as const)
      expect(bar(src, n), `bar ${n + 1}`).toEqual(bar(written(tonic), n));
    // (the comparison can fail)
    expect(bar(written('D'), 1)).not.toEqual(bar(written('F'), 1));
  });

  it('a tonic held (@n) or repeated (!n) stays in force as many steps; a rate of its own, 1m/2, two bars a step', () => {
    const held = over('step=1m D@2 F');
    expect([0, 1, 2].map((n) => bar(held, n))).toEqual([bar(written('D'), 0), bar(written('D'), 1), bar(written('F'), 2)]);
    expect(bar(over('step=1m D!2 Bb'), 2)).toEqual(bar(written('Bb'), 2));
    expect(bar(over('step=1m/2 D F'), 1)).toEqual(bar(written('D'), 1));
    expect(bar(over('step=1m/2 D F'), 2)).toEqual(bar(written('F'), 2));
  });

  it('a stepped tonic holds a note a step: a rest or a chord is an error at it', () => {
    for (const held of ['step=1m D ~', 'step=1m D [0,4]'])
      expect(messages(over(held))).toEqual(["&tonic holds a key's tonic (scale(…, &tonic)), stepped: write a note a step, a name or a pitch class (&tonic step=1m/8 D F)"]);
  });

  it('left free, free(D), is a braid left to the performer (decision 018): it plays as written, and a take held in its place is the tonic', () => {
    const src = over('free(F)');
    expect(messages(src)).toEqual([]);
    expect(
      compiled(src)
        .cells.get('tonic')!
        .frees.map((f) => [f.key, f.braid]),
    ).toEqual([['braid', 'F']]);
    expect(events(src, 8)).toEqual(events(written('F'), 8));
    expect(events(over('free(A)'), 8)).toEqual(events(written('A'), 8));
    // (stepped, free(D F): the performer's room over the sections)
    expect(bar(over('step=1m free(D F)'), 1)).toEqual(bar(written('F'), 1));
  });
});

describe('the seeds', () => {
  const uses = ['4/4 leaning on 16n', 'dorian', 'vamp to the seventh', 'Funk drums', 'gm_kit', 'funk bass', 'bass'].map((id) => `use * from "${id}"`);
  const seconds = (8 * 4 * 60) / 104;

  it('a text of uses alone, with &tempo and &tonic, compiles clean and plays what it plays with &bar and &key written out', () => {
    // (the seeds carry no card since #299: the text's own sends the drums and the bass)
    const card = '&out map=midi ~ [&bassline * &bassV] ~!7 &groove';
    const holes = lines(...uses, '&tempo step=104bpm', '&tonic D', card);
    const written = lines('&bar meter("4/4") step=104bpm swing=16n:.65', '&key scale(dorian, D)', ...uses.slice(2), card);
    expect(messages(holes)).toEqual([]);
    expect(messages(written)).toEqual([]);
    const played = events(holes, seconds);
    expect(played.length).toBeGreaterThan(100);
    expect(played).toEqual(events(written, seconds));
  });

  it('the 13 meters read &tempo, and the 6 modes &tonic, with no default', () => {
    expect(METER_FRAGMENTS).toHaveLength(13);
    for (const f of METER_FRAGMENTS) expect(f.text, f.id).toMatch(/^&bar meter\("[0-9]+\/[0-9]+"\) step=&tempo(\s|$)/);
    expect(MODE_FRAGMENTS).toHaveLength(6);
    for (const f of MODE_FRAGMENTS) expect(f.text, f.id).toMatch(/^&key scale\([a-z]+, &tonic\)/);
  });

  it('each compiles over a workbench that defines the two, with no diagnostic', () => {
    const bench = lines('&tempo step=104bpm', '&tonic D');
    const tune = (over: string) => lines(`&tune ${over}step=4n 0 2 4`, '&tuneV loop=C4', '&tuneOut map=sample [&tune * &tuneV]');
    for (const f of METER_FRAGMENTS) expect(messages(lines(bench, f.text, tune(''))), f.id).toEqual([]);
    const meter = '&bar meter("4/4") step=&tempo';
    // (the bell and scale strikes the General MIDI kit's agogô, a hole its instrument fills)
    for (const f of MODE_FRAGMENTS) expect(messages(lines(bench, meter, f.text, 'use &highagogo from gm_kit', tune('over=&key '))), f.id).toEqual([]);
  });
});

// #308: a meter's swing read from a cell that is a swing alone (`swing=&swing`, `&swing swing=8n:2/3`), as its tempo is
// read from a rate alone; the swung seed meters give theirs as a helper, a text that swings otherwise names it.
describe('a meter’s swing read from a cell', () => {
  const at = (swing: string) => lines(`&bar meter("4/4") step=104bpm swing=${swing}`, '&key scale(dorian, D)', BODY);
  for (const swing of ['8n:2/3', '16n:.6', '8n:.6,16n:.55', '8n:2/3:pairs', '8n:free(.64, .5..0.75)'])
    it(`swing=&swing with &swing swing=${swing}: plays what swing=${swing} on the meter plays`, () => {
      const read = lines(at('&swing'), `&swing swing=${swing}`);
      expect(messages(read)).toEqual([]);
      expect(events(read, 8)).toEqual(events(at(swing), 8));
    });

  it('reads one cell, a swing alone; anything else is an error, said once', () => {
    expect(messages(at('&nope'))).toEqual(['Unknown cell &nope']);
    expect(messages(lines(at('&swing'), '&swing step=4n 0 1'))).toEqual(["&swing holds a meter's swing (swing=&swing): write a swing alone, &swing swing=8n:2/3"]);
  });

  it('the four swung seed meters swing by a helper of their own, and compile to the swing they wrote (as Jambot reads them)', () => {
    const swung = METER_FRAGMENTS.filter((f) => f.text.includes('swing='));
    expect(swung.map((f) => f.id)).toEqual(['4/4 swung on 8n', '4/4 leaning on 16n', '4/4 leaning lightly on 16n', '4/4 leaning faintly on 16n']);
    const shares = [2 / 3, 0.65, 0.6, 31 / 60];
    swung.forEach((f, k) => {
      expect(f.text, f.id).toMatch(/^&bar meter\("4\/4"\) step=&tempo swing=&swing\n&swing swing=\d+n:[\d./]+$/);
      expect(compileSource(f.text.replace('step=&tempo', 'step=120bpm')).cells.get('bar')!.meter!.swing![0]!.share, f.id).toBeCloseTo(shares[k]!, 12);
    });
  });

  it('a use takes the seed’s swing with its meter; a text names it to swing its own, and the piece’s own &bar takes none', () => {
    const tempo = '&tempo step=104bpm\n&key scale(dorian, D)';
    const own = lines('use &bar, &swing from "4/4 swung on 8n"', '&swing swing=8n:.64', tempo, BODY);
    expect(messages(own)).toEqual([]);
    expect(events(own, 8)).toEqual(events(at('8n:.64'), 8));
    expect(events(lines('use &bar from "4/4 swung on 8n"', tempo, BODY), 8)).toEqual(events(at('8n:2/3'), 8));
    // (an &swing of the piece's own, the use not naming it, is the helper's collision: decision 059's ruling 1)
    expect(messages(lines('use &bar from "4/4 swung on 8n"', '&swing swing=8n:.64', tempo, BODY))).toEqual([
      "&swing is \"4/4 swung on 8n\"'s, read by its &bar, and the piece's too: rename the piece's, or name &swing in the use to override it",
    ]);
    // (use * under the piece's own &bar: the helper goes with the line it helps, so the use adds nothing, and says so)
    expect(messages(lines('use * from "4/4 swung on 8n"', '&bar meter("4/4") step=104bpm', '&key scale(dorian, D)', BODY))).toEqual([
      'The piece defines all "4/4 swung on 8n" gives (&bar): this use adds nothing',
    ]);
  });
});
