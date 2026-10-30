// What fits the workbench (decision 047, points 2 and 3): the union of lines, a line given twice kept once and a colliding
// private name renamed; the fit over every (rhythm, meter) pair of the library; two drum bars on one workbench, each
// playing E31's hits as alone; and what it costs.
import { describe, expect, it, vi } from 'vitest';
import e31 from '../../fixtures/jambot-e31.json';
import { compileSource } from '../engine/compile';
import { bodyOf } from '../engine/use';
import { setTiming } from '../engine/edit';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { cachedCompile, fitOf, unionOf } from './fit';
import { createRepository } from './fragments';
import { heard } from './heard';
import { LIBRARY, resolveSeed } from './library';
import { expand } from '../engine/use';
import { METER_FRAGMENTS } from './meters';
import { BOSSA_NOVA, FUNK } from './presets';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { EXPRESSION_FRAGMENTS } from './expression';
import { MODE_FRAGMENTS } from './modes';
import { RHYTHM_FRAGMENTS } from './rhythms';

// (the compile counted, for what it costs: the real one, called through)
vi.mock('../engine/compile', async (original) => {
  const actual = await original<typeof import('../engine/compile')>();
  return { ...actual, compileSource: vi.fn(actual.compileSource) };
});

/** A meter's lines, as a host puts them on a workbench by hand: its signature aside (decision 065). */
const meterText = (id: string) => bodyOf(METER_FRAGMENTS.find((f) => f.id === id)!.text);
const rhythm = (id: string) => RHYTHM_FRAGMENTS.find((f) => f.id === id)!.text;
/** The host's workbench: a meter at a tempo, as a host sets one (`setTiming`), then the fragments already on it. */
/** 13 of the General MIDI kit's lines, taken by name as the drummer takes them: the voices the rhythms leave as holes (#244). */
const KIT = expand('use &bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit', resolveSeed).trim();
const bench = (meter: string, bpm = 120, ...fragments: string[]) => [setTiming(meterText(meter), 'bar', 'step', `${bpm}bpm`), ...fragments].join('\n');

describe('the union of lines', () => {
  it('keeps a line given twice word for word once, whatever its spacing or comment', () => {
    const u = unionOf('&hh   s=white // the hat\n&x step=16n &hh!16', '&hh s=white\n&bar meter("4/4") step=90bpm');
    expect(u.shared).toEqual(['&hh']);
    expect(u.renamed).toEqual(new Map());
    expect(u.text).toBe('&hh s=white\n&bar meter("4/4") step=90bpm\n&x step=16n &hh!16');
  });

  it('renames a private name both define by different lines, and every use of it in the fragment', () => {
    const u = unionOf('&kick step=16n &bd!4\n&drums map=midi(10) [&kick]\n&bd s=white', '&kick step=16n &bd ~!15\n&drums map=midi(10) [&kick]\n&bd s=white');
    expect(u.renamed).toEqual(
      new Map([
        ['&kick', '&kick2'],
        ['&drums', '&drums2'],
      ]),
    );
    expect(u.shared).toEqual(['&bd']);
    expect(u.text.split('\n').slice(3)).toEqual(['&kick2 step=16n &bd!4', '&drums2 map=midi(10) [&kick2]']);
  });

  it('a rename can make a shared line differ: it is renamed in turn', () => {
    // (`&drums` is word for word the workbench's until `&kick` is renamed in it)
    const u = unionOf('&kick step=16n &bd!4\n&drums map=midi(10) [&kick]', '&kick step=16n &bd ~!15\n&drums map=midi(10) [&kick]');
    expect([...u.renamed.keys()]).toEqual(['&kick', '&drums']);
    expect(u.shared).toEqual([]);
  });

  it('a new name is the first &name<n>, n from 2, that neither text names', () => {
    const u = unionOf('&kick step=16n &bd!4 // not &kick3', '&kick step=16n &bd!2\n&kick2 step=16n &bd!8\n&x [&kick4]');
    expect(u.renamed).toEqual(new Map([['&kick', '&kick3']]));
  });

  it('never renames an interface name: one defined differently is defined twice', () => {
    for (const [fragment, workbench, twice] of [
      ['&bar meter("3/4")', '&bar meter("4/4") step=90bpm', '&bar'],
      ['&key scale(minor, A)', '&key scale(major, C)', '&key'],
      ['&harm step=1m 0 3', '&harm step=1m 0 4', '&harm'],
    ] as const) {
      const u = unionOf(fragment, workbench);
      expect(u.twice).toEqual([twice]);
      expect(u.renamed).toEqual(new Map());
    }
  });

  it('an empty workbench is the fragment’s lines', () => {
    expect(unionOf('&a loop=A4\n\n// a note\n&b loop=A3', '').text).toBe('&a loop=A4\n&b loop=A3');
  });
});

describe('the fit', () => {
  const four = bench('4/4');

  it('a fragment that uses a name the workbench doesn’t define doesn’t fit, nor one that reads a main key it hasn’t', () => {
    const line = '&line step=8n 0 2 4 7 over=&harm\n&out [&line * &lead]\n&lead s=saw loop=C3';
    expect(fitOf(line, four).missing).toEqual(['&harm']);
    expect(fitOf(line, `${four}\n&harm step=1m scale(major, C)`).fits).toBe(true);
    const keyed = '&line step=8n 0 2 4 7 over=&key\n&out [&line * &lead]\n&lead s=saw loop=C3';
    expect(fitOf(keyed, four).missing).toEqual(['&key']);
    expect(fitOf(keyed, `${four}\n&key scale(major, C)`).fits).toBe(true);
    // (the old way, over=key: the main key, whatever its name)
    const old = keyed.replace('over=&key', 'over=key');
    expect(fitOf(old, four).missing).toEqual(['key']);
    expect(fitOf(old, `${four}\n&chords scale(major, C)`).missing).toEqual([]);
  });

  it('a fragment that defines an interface name differently doesn’t fit', () => {
    const f = fitOf(meterText('3/4'), four);
    expect([f.fits, f.union.twice]).toEqual([false, ['&bar']]);
  });

  it('a fragment that taps the main meter doesn’t fit a workbench with none', () => {
    const f = fitOf(rhythm('Funk drums'), '');
    expect(f.fits).toBe(false);
    expect(f.unmet.length).toBeGreaterThan(0);
  });

  it('a fragment whose union says something the workbench alone doesn’t, doesn’t fit; what the workbench says alone doesn’t count', () => {
    const f = fitOf('&x step=16n 0!16 beat=2\n&v s=sine\n&o [&x * &v]', four);
    expect(f.fits).toBe(false);
    expect(f.diagnostics!.map((d) => d.message)).toEqual(['beat= acts on a meter (step= a rate): on &x it does nothing']);
    // (the workbench alone: "Nothing plays yet"; the union of a sounding fragment no longer says it)
    expect(compileSource(four).diagnostics).toHaveLength(1);
    expect(fitOf('&x step=16n 0!16\n&v s=sine\n&o [&x * &v]', four).fits).toBe(true);
    const warned = `${four}\n&tick step=&bar 0`;
    expect(compileSource(warned).diagnostics.some((d) => d.severity === 'warning')).toBe(true);
    expect(fitOf('&x step=16n 0!16\n&v s=sine\n&o [&x * &v]', warned).fits).toBe(true);
  });

  it('a waltz’s line of six eighths fits 3/4, 6/8 and 12/8, not 4/4; five quarters over two bars fit 5/4 and 10/8', () => {
    const fits = (text: string) => METER_FRAGMENTS.filter((m) => fitOf(text, bench(m.id)).fits).map((m) => m.id);
    expect(fits('&x step=8n 0!6\n&v s=sine\n&o [&x * &v]')).toEqual(['3/4', '6/8', '12/8']);
    expect(fits('&x step=4n cycle=2 0!5\n&v s=sine\n&o [&x * &v]')).toEqual(['5/4', '10/8']);
  });
});

// Every (rhythm, meter) pair of the library, the fit as a literal: every drum bar and every clave fits each 4/4, straight,
// swung, leaning and alla breve, and nothing else; no drum bar or two-bar clave fits 7/8, 5/4 or 12/8, the one-bar clave
// 4/4 only. The Spooky beat (#349) cycles on a beat or spans the bar, so it fits every meter but 7/8, whose bar is no
// whole number of quarters. No meter of the library has a bar of 32 sixteenths, so "a multiple of 16" is "16" here.
const FOUR_FOURS = ['4/4', '4/4 swung on 8n', '4/4 leaning on 16n', '4/4 leaning lightly on 16n', '4/4 leaning faintly on 16n', '4/4 alla breve'];
const FITS: Record<string, readonly string[]> = {
  'Synth-pop drums': FOUR_FOURS,
  'Techno drums': FOUR_FOURS,
  'Deep house drums': FOUR_FOURS,
  'Ambient drums': FOUR_FOURS,
  'Lo-fi hip hop drums': FOUR_FOURS,
  'Funk drums': FOUR_FOURS,
  'Bossa nova drums': FOUR_FOURS,
  'Swing jazz drums': FOUR_FOURS,
  'son clave 3-2': FOUR_FOURS,
  'son clave 2-3': FOUR_FOURS,
  'rumba clave 3-2': FOUR_FOURS,
  'bossa nova clave': FOUR_FOURS,
  'bossa nova clave (one bar)': FOUR_FOURS,
  'Electro swing drums': FOUR_FOURS,
  'Spooky drums': [
    '4/4',
    '4/4 swung on 8n',
    '4/4 leaning on 16n',
    '4/4 leaning lightly on 16n',
    '4/4 leaning faintly on 16n',
    '4/4 alla breve',
    '2/4',
    '3/4',
    '6/8',
    '12/8',
    '5/4',
    '10/8',
  ],
};

describe('every rhythm against every meter of the library', () => {
  it('the table covers every rhythm, and its meters are the library’s', () => {
    expect(Object.keys(FITS)).toEqual(RHYTHM_FRAGMENTS.map((f) => f.id));
    for (const meters of Object.values(FITS)) for (const id of meters) expect(METER_FRAGMENTS.map((m) => m.id)).toContain(id);
  });

  it.each(RHYTHM_FRAGMENTS.flatMap((r) => METER_FRAGMENTS.map((m) => [r.id, m.id, FITS[r.id]!.includes(m.id)] as const)))('%s under %s: fits %s', (r, m, fits) => {
    const f = fitOf(rhythm(r), bench(m));
    expect(f.fits).toBe(fits);
    // (what fails is the clock alone: no name missing, none defined twice)
    expect([f.missing, f.union.twice]).toEqual([[], []]);
    expect(f.unmet.length > 0).toBe(!fits);
  });

  it('a two-bar clave compiles under 7/8, and doesn’t fit it: 28 sixteenths in its two bars, 32 in its braid', () => {
    const clave = rhythm('son clave 3-2');
    // (its `&claves` is a hole the General MIDI kit fills: #244)
    expect(compileSource(bench('7/8', 90, clave, KIT)).diagnostics).toEqual([]);
    const f = fitOf(clave, bench('7/8', 90));
    expect(f.fits).toBe(false);
    expect(f.unmet).toEqual([{ cell: '&clave', meter: null, tap: '16n', bars: 2, steps: 32, rate: 1, bar: 16 }]);
  });
});

/** One drum hit as MIDI out sends it: its note, its step and length in sixteenths of the bar, its velocity. */
interface Hit {
  note: number;
  step: number;
  length: number;
  velocity: number;
}

/** What a text sends on channel 10 in its first bar of sixteenths at a tempo, as E31's `cellsDrums` reads it, and what its compiler said. */
function played(text: string, bpm: number): { hits: Hit[]; diagnostics: string[] } {
  const plan = planOf(text);
  const sixteenth = 60 / bpm / 4;
  const route = router(plan.result, channelTable(plan.result));
  const hits = windowAt(plan, 0, 16 * sixteenth - 1e-9).events.flatMap((e) =>
    routesOf(route(e)).flatMap((r) => {
      const note = midiNote(e, r);
      if (!note || note.channel !== 10) return [];
      const step = note.at / sixteenth;
      return [{ note: note.note, step, length: note.end / sixteenth - step, velocity: note.velocity }];
    }),
  );
  return { hits: sorted(hits), diagnostics: plan.result.diagnostics.map((d) => d.message) };
}

const sorted = (hits: readonly Hit[]) => [...hits].sort((a, b) => a.step - b.step || a.note - b.note || a.velocity - b.velocity);
/** E31's check: the same note, step, written length and velocity, a step's time within a millionth of a step. */
const sameHit = (a: Hit, b: Hit) => a.note === b.note && Math.abs(a.step - b.step) < 1e-6 && Math.abs(a.length - b.length) < 1e-6 && a.velocity === b.velocity;

/**
 * The names whose line two texts share, as a reader would find them: a line word for word in both whose every reference
 * to a name the second defines is to a shared line too (written as a recursion, where the union iterates its renames).
 */
function sameLines(first: string, second: string): string[] {
  const lineOf = (text: string) => new Map(text.split('\n').map((l) => [l.split(' ')[0]!, l]));
  const [one, two] = [lineOf(first), lineOf(second)];
  const same = (name: string, seen: readonly string[]): boolean =>
    one.get(name) === two.get(name) &&
    [...two.get(name)!.matchAll(/&\w+/g)].map((m) => m[0]).every((ref) => ref === name || !two.has(ref) || seen.includes(ref) || same(ref, [...seen, name]));
  return [...two.keys()].filter((name) => same(name, [])).sort();
}

describe('two drum bars on one workbench', () => {
  const bars = e31.witnesses.map((w) => ({ preset: w.preset, bpm: w.bpm, hits: w.hits, text: rhythm(`${w.preset} drums`) }));
  const pairs = bars.flatMap((a) => bars.filter((b) => b !== a).map((b) => [a.preset, b.preset, a, b] as const));
  const lines = (text: string) => text.split('\n');

  it('every ordered pair of E31’s eight bars: 56', () => expect(pairs).toHaveLength(56));

  it.each(pairs)('%s on the workbench, %s added: every shared line kept once, every colliding name renamed, both bars’ hits played as alone', (_, __, a, b) => {
    const workbench = bench('4/4', a.bpm, a.text);
    const f = fitOf(b.text, workbench);
    expect(f.fits).toBe(true);
    const u = f.union;
    // (the workbench as written, then the added bar's lines that aren't on it)
    expect(lines(u.text).slice(0, lines(workbench).length)).toEqual(lines(workbench));
    // (the same line: word for word in both, and every name of the bar's own it reads the same line too; at least the
    // two every bar strikes, `&bd` and `&sd`. The union is the workbench and the rest of the added bar)
    const names = (text: string) => lines(text).map((l) => l.split(' ')[0]!);
    expect([...u.shared].sort()).toEqual(sameLines(a.text, b.text));
    expect(lines(u.text)).toHaveLength(lines(workbench).length + lines(b.text).length - u.shared.length);
    expect(new Set(lines(u.text)).size).toBe(lines(u.text).length);
    // (every other name the two both define is renamed, and no name is declared twice)
    const collide = names(b.text).filter((n) => names(a.text).includes(n) && !u.shared.includes(n));
    expect([...u.renamed.keys()].sort()).toEqual(collide.sort());
    expect(new Set(names(u.text)).size).toBe(names(u.text).length);
    // (each bar plays E31's hits, at the workbench's tempo, as it does alone)
    const { hits, diagnostics } = played(`${u.text}\n${KIT}\n${heard(u.text)}`, a.bpm);
    expect(diagnostics).toEqual([]);
    const want = sorted([...a.hits, ...b.hits]);
    expect(hits).toHaveLength(want.length);
    want.forEach((h, i) => expect(sameHit(hits[i]!, h), `${JSON.stringify(h)}, played ${JSON.stringify(hits[i])}`).toBe(true));
  });

  it('E31’s 144 hits, each bar’s checked in every pair it is in: 144 × 14 = 2016 of 2016', () => {
    let matched = 0;
    for (const [, , a, b] of pairs) {
      const union = unionOf(b.text, bench('4/4', a.bpm, a.text)).text;
      const { hits } = played(`${union}\n${KIT}\n${heard(union)}`, a.bpm);
      const left = [...hits];
      for (const h of [...a.hits, ...b.hits]) {
        const i = left.findIndex((p) => sameHit(p, h));
        if (i >= 0) (left.splice(i, 1), matched++);
      }
    }
    expect(matched).toBe(2016);
  });
});

describe('a query given the workbench', () => {
  it('ranks only the fragments that fit, in the order they rank without it', () => {
    const r = createRepository(LIBRARY);
    const all = r.query(BOSSA_NOVA, LIBRARY.length).map((f) => f.fragment.id);
    const fitting = r.query(BOSSA_NOVA, LIBRARY.length, {}, { workbench: bench('4/4') }).map((f) => f.fragment.id);
    // (the rhythms that fit 4/4, and the kits, the vibrato and the envelopes, which fit any workbench: they use no name; the modes read the tonic (#290), a
    // hole the workbench fills, so they fit once it gives one)
    const open = [...INSTRUMENT_FRAGMENTS, ...EXPRESSION_FRAGMENTS].map((f) => f.id);
    const modes = MODE_FRAGMENTS.map((f) => f.id);
    expect(fitting).toEqual(all.filter((id) => RHYTHM_FRAGMENTS.some((f) => f.id === id) || open.includes(id)));
    const toned = r.query(BOSSA_NOVA, LIBRARY.length, {}, { workbench: `${bench('4/4')}\n&tonic D` }).map((f) => f.fragment.id);
    expect(toned).toEqual(all.filter((id) => RHYTHM_FRAGMENTS.some((f) => f.id === id) || open.includes(id) || modes.includes(id)));
    expect(r.query(BOSSA_NOVA, LIBRARY.length, {}, { workbench: bench('7/8') }).map((f) => f.fragment.id)).toEqual(all.filter((id) => open.includes(id)));
    expect(r.query(BOSSA_NOVA, LIBRARY.length, {}, { facet: 'meter', workbench: bench('4/4') })).toEqual([]);
    expect(r.query(BOSSA_NOVA, 2, {}, { facet: 'rhythm', workbench: bench('4/4') }).map((f) => f.fragment.id)).toEqual(fitting.filter((id) => !open.includes(id)).slice(0, 2));
  });

  it('without a workbench, every query is what it was', () => {
    const r = createRepository(LIBRARY);
    for (const facet of [undefined, 'meter', 'rhythm', 'bass'])
      expect(r.query(FUNK, LIBRARY.length, {}, { facet, workbench: undefined })).toEqual(r.query(FUNK, LIBRARY.length, {}, { facet }));
  });
});

describe('what it costs', () => {
  // A workbench of five fragments, built as a composer builds it: the meter, then each rhythm added by the union.
  const workbench = ['Funk drums', 'Techno drums', 'rumba clave 3-2', 'bossa nova clave (one bar)'].reduce((text, id) => unionOf(rhythm(id), text).text, bench('4/4', 104));

  it('the workbench of five compiles clean and every rhythm still fits it, renamed where it collides', () => {
    // (the claves' voice is a hole an instrument fills: the General MIDI kit's line)
    expect(compileSource(`${workbench}\n${KIT}`).diagnostics).toEqual([]);
    for (const f of RHYTHM_FRAGMENTS) expect(fitOf(f.text, workbench).fits, f.id).toBe(true);
  });

  // The bound, as the work it bounds: the compiles a query makes (counted at `compileSource`, which the cache stands in
  // front of), not the milliseconds they take, which a loaded machine changes. A workbench the repository hasn't seen
  // costs its own compile and at most one compile of the union per fragment tried (those that pass the cheaper checks);
  // a query for k stops at the k-th that fits, so k = 1 tries the first that fits; the same workbench again, every fit
  // cached by its two texts (`cachedFit`), compiles nothing. Their milliseconds: `timing.slow.test.ts` (#237).
  it('a fitting query over the library compiles at most one union a fragment for a new workbench, one for k = 1, and none the second time', async () => {
    // (the repository loaded afresh, so it compiles through the counted compile: with isolate off, a file that ran earlier
    // in this worker may have loaded it with the real one)
    vi.resetModules();
    const compiles = vi.mocked((await import('../engine/compile')).compileSource);
    const count = <T>(run: () => T): [T, number] => {
      const before = compiles.mock.calls.length;
      return [run(), compiles.mock.calls.length - before];
    };
    const r = (await import('./fragments')).createRepository(LIBRARY);
    r.query(FUNK, LIBRARY.length, {}, { workbench: bench('4/4') });
    const [first, fresh] = count(() => r.query(FUNK, LIBRARY.length, {}, { workbench }));
    // (the 15 rhythms, the 13 instruments, the vibrato and the envelopes: a performer's part, a mode's tonic (#290) and a stab line's &harm are holes no workbench of drums fills)
    expect(first).toHaveLength(30);
    expect(fresh).toBeGreaterThan(0);
    expect(fresh).toBeLessThanOrEqual(1 + LIBRARY.length);
    expect(count(() => r.query(FUNK, LIBRARY.length, {}, { workbench, chosen: ['Funk drums'] }))[1]).toBe(0);
    const [one, tried] = count(() => r.query(FUNK, 1, {}, { workbench: `${workbench}\n&more loop=A4` }));
    expect(one).toHaveLength(1);
    // (the workbench, the workbench with its own sound holes stood in, and the union of the first fragment that fits: a fragment that fails a cheaper check compiles none)
    expect(tried).toBeLessThanOrEqual(3);
  });

  it('a cached compile is the compile, and keeps the last texts it was asked for', () => {
    const compiled = cachedCompile(2);
    const a = compiled('&a loop=A4');
    expect(compiled('&a loop=A4')).toBe(a);
    expect(a).toEqual(compileSource('&a loop=A4'));
    compiled('&b loop=A4');
    compiled('&c loop=A4');
    expect(compiled('&a loop=A4')).not.toBe(a);
  });
});
