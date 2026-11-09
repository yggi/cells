// The fit by signature (decision 065, rung 4; #454): a template taken onto a workbench by a `from` line (`useOn`), and
// whether it fits there (`fitsAs`). Nothing is bound by name: a copy's names are its own, its inputs its arguments.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { soundsIdentical } from '../engine/sameness';
import { bodyOf, signatureOf } from '../engine/use';
import { fitsAs, useOn } from './fit';

/** A fragment's lines on a workbench by hand, its signature aside (`bodyOf`): judged as a collection's are, by its lines (`fitsAs`, read as the fragment `x`, #587). */
const unionOf = (text: string, workbench: string) => {
  const body = bodyOf(text);
  const resolve: Resolve = (id) => (id === 'x' ? body : resolveSeed(id));
  return fitsAs('x', workbench, { resolve }).union!;
};
import { holesOf } from './holes';
import { BASS_FRAGMENTS } from './bass';
import { createRepository } from './fragments';
import { LIBRARY, resolveSeed } from './library';
import { FUNK } from './styles';
import type { Resolve } from '../engine/program';

const resolve = resolveSeed;
/** What a compile says but its warning that nothing plays yet (a bench of lines, with no sound). */
const said = (text: string) =>
  compileSource(text, undefined, { resolve })
    .diagnostics.filter((d) => !d.message.startsWith('Nothing plays yet'))
    .map((d) => `${d.severity}: ${d.message}`);
const METER = '&bar meter("4/4") step=120bpm';
/** Jambot's bench for a bass line (`readLine`, yggi/jambot packages/engine/src/bass-lines.ts): a meter, a key, a harmony. */
const HARMONY = [METER, '&key scale(ionian, C)', '&harm over=&key step=1m [0,2,4] [3,5,7]'].join('\n');

/** The bench, offering its harmony to what it takes (decision 075: the heads of its own signature, `&harm from`). */
const OFFERING = `&harm from\n${HARMONY}`;

describe('useOn: a template by a from line', () => {
  it('writes the from line, its head clear of the workbench’s names, its main argument the one cell offered that meets it; the copy’s other names its own', () => {
    const u = useOn(OFFERING, 'walking_bass', { resolve });
    expect(u.line).toBe('&bassline from walking_bass &harm');
    expect(u.text).toBe(`${OFFERING}\n&bassline from walking_bass &harm`);
    expect(u.used?.gave).toEqual(['&bassline', '&bassline_bassNext']);
    expect(said(u.text)).toEqual([]);
    // (a head the workbench has is numbered clear of it)
    expect(useOn(`${OFFERING}\n&bassline step=4n 0`, 'walking_bass', { resolve }).heads).toEqual(['&bassline2']);
    // (told its head and its main argument, it writes them)
    expect(useOn(HARMONY, 'walking_bass', { resolve, head: '&walk', main: '&key' }).line).toBe('&walk from walking_bass &key');
  });

  it('finds the main argument by what a cell is, never its name: one that meets it is it; several, none', () => {
    // (a rate alone is the one cell a meter's &tempo can be: whatever its name)
    expect(useOn('&t step=96bpm', 'meter', { resolve }).main).toBe('&t');
    // (Jambot's bench: the meter, the key and the harmony each read as a table, so a walking bass meets three, and
    //  none is picked, though one is called &harm; the bench offers one, or the host names it)
    expect(useOn(HARMONY, 'walking_bass', { resolve }).main).toBeNull();
    expect(fitsAs('walking_bass', HARMONY, { resolve })).toMatchObject({ fits: false, missing: ['&harm'] });
    const renamed = OFFERING.replace(/&harm\b/g, '&chords');
    expect(useOn(renamed, 'walking_bass', { resolve }).main).toBe('&chords');
    expect(fitsAs('walking_bass', renamed, { resolve })).toMatchObject({ fits: true, diagnostics: [] });
  });

  it('plays as the union did, where the union played it (S1)', () => {
    const bench = `${HARMONY}\n&bassV s=saw loop=C2\n&out map=sample [&bassline * &bassV]`;
    const union = unionOf(bodyOf(resolve('walking_bass')!), bench).text;
    const use = useOn(bench, 'walking_bass', { resolve, head: '&bassline', main: '&harm' }).text;
    expect(soundsIdentical(union, use, undefined, { resolve })).toBe(true);
  });

  it('takes one template twice, where the union added nothing the second time: two walking basses over two harmonies', () => {
    const bench = `${HARMONY}\n&harm2 over=&key step=1m [4,6,8] [0,2,4]`;
    const one = useOn(bench, 'walking_bass', { resolve, main: '&harm' });
    const two = useOn(one.text, 'walking_bass', { resolve, main: '&harm2' });
    expect(two.line).toBe('&bassline2 from walking_bass &harm2');
    expect(two.used?.gave).toEqual(['&bassline2', '&bassline2_bassNext']);
    expect(said(two.text)).toEqual([]);
    expect(fitsAs('walking_bass', one.text, { resolve, main: '&harm2' })).toMatchObject({ fits: true, diagnostics: [] });
    // (the union, by name: the second adds nothing)
    const body = bodyOf(resolve('walking_bass')!);
    expect(unionOf(body, unionOf(body, bench).text).text).toBe(unionOf(body, bench).text);
  });

  it('a collection is taken whole, as * from it', () => {
    expect(useOn(METER, 'gm_kit', { resolve }).line).toBe('* from gm_kit');
  });
});

/** A workbench that gives a main parameter its argument, by what the template reads it as. */
const STYLE = '&style style=&(map=style sync=.5 harm=.5 bite=.5 mood=.5)';
const KEYED = [METER, '&key scale(dorian, D)'];
const benches: Readonly<Record<string, readonly string[]>> = {
  '&tempo': ['&tempo step=120bpm'],
  '&tonic': [METER, '&tonic D'],
  '&key': KEYED,
  '&harm': [...KEYED, '&harm over=&key step=1m [0,2,4] [3,5,7]'],
  // (a phrase short enough that the form it makes comes round at a bar: a form says no cycle=, so its lap is a bar)
  '&call': [...KEYED, '&call over=&key step=16n 0 2'],
  '&a': [...KEYED, '&a over=&key step=16n 0 2'],
  '&in': [METER, '&in s=saw loop=C3'],
  '&drumlines': [METER, STYLE, '&drumlines step=8n 0 ~ 0 ~'],
  '&bassline': [...KEYED, STYLE, '&bassline over=&key step=4n 0 2 4 2'],
  '&padline': [...KEYED, STYLE, '&padline over=&key step=1m [0,2,4]'],
  '&stabline': [...KEYED, STYLE, '&stabline over=&key step=4n [0,2,4] ~'],
  '&leadline': [...KEYED, STYLE, '&leadline over=&key step=8n 0 2 4 2'],
};
const meters = [
  'meter("16/8") step=120bpm',
  ...['meter', 'meter(grouping=meter("3/4"))', 'meter(grouping=meter("6/8"))', 'meter(grouping=meter("5/4"))', 'meter(grouping=meter("7/8"))', 'meter(grouping=meter("12/8"))'].map(
    (m) => `from ${m} 120bpm`,
  ),
];
const TEMPLATES = LIBRARY.filter((f) => signatureOf(f.text));

describe('fitsAs: every seed template', () => {
  it('there are templates of every main parameter the benches give', () => {
    const mains = new Set(TEMPLATES.map((f) => signatureOf(f.text)!.main).filter((m) => m !== null));
    expect([...mains].filter((m) => !benches[m])).toEqual([]);
  });

  it.each(TEMPLATES.map((f) => [f.id]))('%s fits a workbench that gives its main argument, with 0 diagnostics; it is missing on one that doesn’t', (id) => {
    const { main } = signatureOf(resolve(id)!)!;
    // (each bench offers the cell that is the argument, the heads of its own signature: found by what it is, decision 075)
    const lines = main ? [`${main} from`, ...benches[main]!] : [METER];
    // (on one of the library's meters, or a bar of 16 eighths: a waltz's line is three beats, #129; a rounded binary form two bars of 4/4)
    const fits = meters.map((m) => fitsAs(id, lines.join('\n').replace(METER, `&bar ${m}`), { resolve }));
    const fit = fits.find((f) => f.fits) ?? fits[0]!;
    expect({ missing: fit.missing, unmet: fit.unmet, diagnostics: fit.diagnostics?.map((d) => d.message) }).toEqual({ missing: [], unmet: [], diagnostics: [] });
    expect(fit.fits).toBe(true);
    expect(holesOf(resolve(id)!, (t) => compileSource(t, undefined, { resolve }), resolve).signature?.main).toBe(main);
    if (main) expect(fitsAs(id, '', { resolve }).missing).toEqual([main]);
  });
});

describe('a query names each facet’s main argument (#587)', () => {
  const r = createRepository(LIBRARY);
  const bass = (bench: string, options: { facet?: string; arguments?: Readonly<Record<string, string>> }) =>
    r
      .query(FUNK, LIBRARY.length, {}, { workbench: bench, ...options })
      .map((f) => f.fragment.id)
      .filter((id) => BASS_FRAGMENTS.some((b) => b.id === id));
  const BASS_BENCH = `${HARMONY}\n&bassV s=saw loop=C2`;

  it('a template of a facet the query names is taken with that argument; of one it doesn’t, with the one cell that meets it, here none', () => {
    // (a meter, a key and a harmony each read as a table: a bass line meets all three, so none is picked)
    expect(bass(BASS_BENCH, { facet: 'bass' })).toEqual([]);
    expect(bass(BASS_BENCH, { facet: 'bass', arguments: { bass: '&harm' } })).toHaveLength(BASS_FRAGMENTS.length);
    // (with no facet asked for, a fragment's own facet names its argument)
    expect(bass(BASS_BENCH, { arguments: { bass: '&harm' } })).toHaveLength(BASS_FRAGMENTS.length);
    // (named for another facet, it is not this one's)
    expect(bass(BASS_BENCH, { facet: 'bass', arguments: { motif: '&key' } })).toEqual([]);
  });

  it('a workbench that offers its harmony is the fallback: the one cell offered that meets it', () => {
    expect(bass(`&harm from\n${BASS_BENCH}`, { facet: 'bass' })).toHaveLength(BASS_FRAGMENTS.length);
  });

  it('names nothing by convention: the harmony called &chords, named so, fits as &harm did', () => {
    const chords = BASS_BENCH.replace(/&harm\b/g, '&chords');
    expect(bass(chords, { facet: 'bass', arguments: { bass: '&chords' } })).toEqual(bass(BASS_BENCH, { facet: 'bass', arguments: { bass: '&harm' } }));
  });
});
