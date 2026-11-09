// `* from gm_kit` (decisions 054, 065; #232): a collection taken into a piece by its id, the piece's own lines winning,
// read through a resolver the host hands each compile, with the lockfile a piece file keeps.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { parse, readFrom, USE_RETIRED } from './parser';
import { bodyOf, expand, fragmentHash, signatureOf, USE_DEPTH } from './use';
import { setTiming } from './edit';
import { lockfileOf, readPiece, withLockfile, writePiece, type PieceFile } from './piecefile';
import { eventsBetween, plan } from './realize';
import { codeShifts, type CompileResult, type Resolve } from './program';
import { soundsIdentical } from './sameness';
import { normalise } from './normalise/index';
import { structureOf } from './measure';
import { LIBRARY, resolveSeed } from '../repository/library';
import { EXAMPLES } from './examples';
import { METER_FRAGMENTS } from '../repository/meters';
import { RHYTHM_FRAGMENTS } from '../repository/rhythms';
import { INSTRUMENT_FRAGMENTS } from '../repository/instruments';
import { fitsAs } from '../repository/fit';
import { heard } from '../repository/heard';
import { holesOf } from '../repository/holes';

const seed = { resolve: resolveSeed };
/** A collection's text onto a workbench, read as the fragment `x` (`fitsAs`: a fragment with no signature fits by its lines, #588). */
const fitOf = (text: string, workbench: string, compiled?: (t: string) => CompileResult, resolve: Resolve = resolveSeed) =>
  fitsAs('x', workbench, { resolve: (id) => (id === 'x' ? text : resolve(id)), ...(compiled ? { compiled } : {}) });
const unionOf = (text: string, workbench: string) => ({ text: fitOf(text, workbench).text });
const errors = (text: string, resolve: Resolve = resolveSeed) =>
  compileSource(text, undefined, { resolve })
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);
/** A resolver over a few texts by id. */
const library =
  (texts: Record<string, string>): Resolve =>
  (id) =>
    texts[id] ?? null;
const voices = (text: string) => {
  const r = compileSource(text, undefined, seed);
  return [...new Set(eventsBetween(plan(r, codeShifts(r)), 0, 4).map((e) => e.voice))].sort();
};

const KIT = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'gm_kit')!.text;
const KIT_NAMES = parse(KIT)
  .cells.filter((c) => !c.lambda)
  .map((c) => c.name);
const GROOVE = '* from gm_kit\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]\n';

/** A fragment's lines, its signature and its own `from` lines aside: a groove read as a text with no signature (#637). */
const linesAlone = (text: string) =>
  text
    .split('\n')
    .filter((l) => readFrom(l.trim()) === undefined)
    .join('\n');

describe('the use line, retired (#588)', () => {
  it('is an error, read the old way or not, whatever it says, and takes nothing; a name that starts with use is a name', () => {
    for (const bad of ['use * from gm_kit', 'use &bd, &sd from gm_kit', 'use &aeolian', 'use "core kit"', 'use', 'use bd from kit'])
      for (const old of [false, true]) {
        expect(
          parse(bad, { old }).diagnostics.map((d) => [d.severity, d.message]),
          bad,
        ).toEqual([['error', USE_RETIRED]]);
        expect(parse(bad, { old }).uses, bad).toBeUndefined();
      }
    expect(compileSource(`use * from gm_kit\n${GROOVE.split('\n').slice(1).join('\n')}`, undefined, seed).ok).toBe(false);
    expect(parse('&user s=sine').diagnostics).toEqual([]);
  });

  it('names no from line of its own: whether it is a collection’s or a template’s, with its arguments, is the fragment’s to say (#406)', () => {
    expect(USE_RETIRED).toMatch(/&bd, &sd from gm_kit .*&key from diatonic\(mode=dorian\) D/);
  });
});

describe('the expansion', () => {
  it('reads the piece’s own lines, then the used fragment’s it doesn’t define, the piece’s winning', () => {
    // (with a card of its own: written out, a piece with none would hear the kit's unread voices, below)
    const text = `${GROOVE}&out map=sample [&beat]\n&sd note=38 s=white hpf=900 env=&(map=adsr 0 .12 0 .05)\n`;
    const r = compileSource(text, undefined, seed);
    expect(r.diagnostics).toEqual([]);
    expect(r.uses).toEqual([
      {
        id: 'gm_kit',
        names: null,
        span: { line: 1, col: 1, len: 13 },
        hash: fragmentHash(KIT),
        gave: KIT_NAMES.filter((n) => n !== 'sd').map((n) => `&${n}`),
        overrode: ['&sd'],
      },
    ]);
    expect(r.cells.get('sd')?.params.hpf).toBe(900);
    const out = expand(text, resolveSeed);
    expect(out.startsWith('&bar meter("4/4") step=100bpm\n&beat')).toBe(true);
    expect(out).not.toContain('* from gm_kit');
    expect(out.split('\n').filter((l) => l.startsWith('&sd'))).toEqual(['&sd note=38 s=white hpf=900 env=&(map=adsr 0 .12 0 .05)']);
    expect(soundsIdentical(text, out, undefined, seed)).toBe(true);
  });

  it('a text with no use line compiles as it did, and expands to itself', () => {
    const text = '&a s=sine loop=A4';
    expect(compileSource(text, undefined, seed).uses).toBeUndefined();
    expect(expand(text, resolveSeed)).toBe(text);
  });

  it('a used fragment may use another: its own lines win over what it uses, the piece’s over all', () => {
    const resolve = library({ groove: '* from kit\n&beat step=8n &bd ~ &sd ~\n&sd note=38 s=white hpf=2000', kit: '&bd note=36 s=sine loop=A1\n&sd note=38 s=white' });
    const r = compileSource('* from groove\n&bar meter("4/4") step=100bpm\n&bd note=36 s=sine loop=C2\n&out map=sample [&beat]', undefined, { resolve });
    expect(r.diagnostics).toEqual([]);
    expect(r.uses?.[0]).toMatchObject({ gave: ['&beat', '&sd'], overrode: ['&bd'] });
    expect(r.cells.get('sd')?.params.hpf).toBe(2000);
  });

  it('an id used twice gives its lines once, and the second use says it adds nothing', () => {
    const r = compileSource(`${GROOVE}&out map=sample [&beat]\n* from gm_kit`, undefined, seed);
    expect(r.diagnostics.map((d) => [d.severity, d.message, d.span.line])).toEqual([['warning', '"gm_kit" is used already, on line 1: this use adds nothing', 5]]);
    expect(r.uses?.map((u) => [u.hash, u.gave.length])).toEqual([
      [fragmentHash(KIT), KIT_NAMES.length],
      [fragmentHash(KIT), 0],
    ]);
    const resolve = library({ twice: '* from kit\n* from kit\n&beat step=8n &bd ~', kit: '&bd note=36 s=sine loop=A1' });
    expect(errors('&bar meter("4/4") step=100bpm\n* from twice', resolve)).toEqual([]);
  });

  it('a line two used fragments give word for word is one line', () => {
    const resolve = library({ a: '&bd note=36 s=sine loop=A1\n&x s=saw', b: '&bd  note=36  s=sine   loop=A1 # the same\n&y s=saw' });
    const r = compileSource('* from a\n* from b\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd &x &y', undefined, { resolve });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.uses?.map((u) => u.gave)).toEqual([
      ['&bd', '&x'],
      ['&bd', '&y'],
    ]);
  });
});

describe('a named use of a collection (decision 059)', () => {
  const BENCH = '&bar meter("4/4") step=104bpm\n&key scale(dorian, D)\n&harm over=&key step=1m [0,2,4]';
  // (the seed library with each template read as its lines alone, a collection: what is tested here is how a collection's
  // lines are taken, by name, which a template's copy isn't, decision 065)
  const asCollections: Resolve = (id) => {
    const t = resolveSeed(id);
    return t !== null && signatureOf(t) ? bodyOf(t) : t;
  };
  const read = (text: string, resolve: Resolve = asCollections) => {
    const r = compileSource(text, undefined, { resolve });
    // (a bench with no card of its own: that nothing plays isn't what these say)
    const said = r.diagnostics.filter((d) => !d.message.startsWith('Nothing plays yet'));
    return { uses: r.uses, said: said.map((d) => [d.severity, d.message, d.span.line]) };
  };

  it('takes the named cells and the lines they read within the fragment, its helpers', () => {
    const text = `&bassline from funk_bass\n* from upright_bass\n${BENCH}`;
    const { uses, said } = read(text);
    expect(said.filter(([s]) => s === 'error')).toEqual([]);
    expect(uses?.[0]).toMatchObject({ names: ['&bassline'], gave: ['&bassline', '&bassNext'], overrode: [] });
    expect(compileSource(text, undefined, { resolve: asCollections }).cells.has('bassNext')).toBe(true);
  });

  it('naming every name a collection defines expands as * from it does, for every seed', () => {
    // (but a template taken with arguments that hold a quote, `meter(grouping=meter("7/8"))`: only a from line takes it, unquoted, #507)
    for (const f of LIBRARY.filter((x) => !x.id.includes('"'))) {
      const all = compileSource(`* from ${JSON.stringify(f.id)}`, undefined, seed).uses![0]!.gave;
      const named = `${all.join(', ')} from ${JSON.stringify(f.id)}`;
      expect(expand(named, resolveSeed), f.id).toBe(expand(`* from ${JSON.stringify(f.id)}`, resolveSeed));
    }
  });

  it('a name the fragment doesn’t define is an error, naming those it does', () => {
    expect(read(`&bass from funk_bass\n${BENCH}`).said).toEqual([['error', '&bass is not in "funk_bass": it defines &bassline, &bassNext', 1]]);
    expect(read('&bass from upright_bass\n&bar meter("4/4") step=100bpm').said).toEqual([['error', '&bass is not in "upright_bass": it defines &bassV', 1]]);
  });

  it('no name is the piece’s by convention (decision 075): a collection’s &key the piece defines too clashes, as any helper does', () => {
    const section = ['&key scale(aeolian, A)', '&chords over=&key step=1m [0,2,4] [3,5,7]', '&pad over=&chords step=4n 0 1 2'].join('\n');
    const resolve: Resolve = (id) => (id === 'section' ? section : resolveSeed(id));
    const piece = `&pad from section\n&bar meter("4/4") step=100bpm\n&key scale(dorian, D)\n&v s=sine\n&out map=sample [&pad * &v]`;
    expect(read(piece, resolve).said.map((x) => x[1])).toEqual([expect.stringMatching(/^&key is "section"'s, read by its &chords/)]);
    // (named, it is the piece's: what the section's &chords reads)
    const named = read(piece.replace('&pad from section', '&pad, &key from section'), resolve);
    expect(named.said).toEqual([]);
    expect(named.uses?.[0]).toMatchObject({ names: ['&pad', '&key'], gave: ['&chords', '&pad'] });
  });

  it('a helper the piece also defines is an error (the owner’s ruling 1); naming it makes it the piece’s', () => {
    const helper = `&bassline from funk_bass\n* from upright_bass\n${BENCH}\n&bassNext over=&harm 2`;
    expect(read(helper).said.filter(([s]) => s === 'error')).toEqual([
      ['error', "&bassNext is \"funk_bass\"'s, read by its &bassline, and the piece's too: rename the piece's, or name &bassNext in the use to override it", 1],
    ]);
    const named = read(helper.replace('&bassline from', '&bassline, &bassNext from'));
    // (an override a taken line reads is what the use does, so it says nothing: an instrument's voice given a sound)
    expect(named.said).toEqual([]);
    expect(named.uses?.[0]).toMatchObject({ gave: ['&bassline'], overrode: ['&bassNext'] });
    // (one no taken line reads still adds nothing, and says so)
    expect(read(`${helper.replace('&bassline from', '&bassline, &bassNext from')}\n&bassline over=&harm 0`).said).toEqual([
      ['warning', 'The piece defines &bassline, so taking it from "funk_bass" adds nothing', 1],
      ['warning', 'The piece defines &bassNext, so taking it from "funk_bass" adds nothing', 1],
    ]);
    // (a helper two named cells read is said once)
    const twice = library({ f: '&a [&h * 1]\n&b [&h * 2]\n&h s=sine' });
    expect(errors('&a, &b from f\n&h s=saw', twice)).toHaveLength(1);
    // (a fragment's own helper collision is said through it)
    const resolve = library({ outer: '&a from inner\n&h s=saw', inner: '&a [&h * 1]\n&h s=sine' });
    expect(errors('* from outer', resolve)).toEqual(['&h is "inner"\'s, read by its &a, and "outer"\'s too: rename "outer"\'s, or name &h in the use to override it (in "outer")']);
  });

  it('a line written in place of one `* from` gives keeps its helpers: the band’s &drumsOut, word for word (yggi/cell-studio#610)', () => {
    // (the band's &drumsOut reads its copy's own kit, which nothing else reads: overridden, it went with it. The band is a
    // template since #560: `*` takes the heads the piece doesn't write, and the kit is the copy's, `&band_drums_kit`,
    // as the expansion writes it out)
    const radio = EXAMPLES.radio.source;
    const written = radio.replace(/^\* from band.*$/m, (line) => `${line}\n&drumsOut play=&drumlines &band_drums_kit`);
    expect(errors(written)).toEqual([]);
    expect(soundsIdentical(radio, written, 8, seed)).toBe(true);
  });

  it('a use that adds nothing says so: twice on the issue’s section, on no seed fragment', () => {
    const section = [
      '* from meter',
      '* from harmonic_minor',
      '* from vamp_to_the_seventh',
      '* from funk_drums',
      '* from gm_kit',
      '* from funk_bass',
      '* from upright_bass',
      '&bar meter("4/4") step=104bpm swing=16n:.6',
      '&key scale(harmonic, D)',
    ].join('\n');
    expect(read(section).said).toEqual([
      ['warning', 'The piece defines all "meter" gives (&bar): this use adds nothing', 1],
      ['warning', 'The piece defines all "harmonic_minor" gives (&key): this use adds nothing', 2],
    ]);
    expect(read(`&bar from meter\n${BENCH}`).said).toEqual([['warning', 'The piece defines &bar, so taking it from "meter" adds nothing', 1]]);
    for (const f of LIBRARY)
      expect(
        compileSource(f.text, undefined, seed).diagnostics.filter((d) => /adds nothing|old way/.test(d.message)),
        f.id,
      ).toEqual([]);
  });

  it('two named uses of one id take each its names, a line once', () => {
    const r = read('&bd from gm_kit\n&bd, &sd from gm_kit\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &sd ~\n&out map=sample [&beat]');
    expect(r.said).toEqual([]);
    expect(r.uses?.map((u) => u.gave)).toEqual([['&bd'], ['&sd']]);
  });
});

describe('the errors, each on its use line', () => {
  it('an unresolved id names it, and the piece’s other lines compile', () => {
    const r = compileSource('&bar meter("4/4") step=100bpm\n* from nowhere\n&a step=8n 0 2\n&m [&a * &v]\n&v s=sine', undefined, seed);
    expect(r.diagnostics.map((d) => [d.severity, d.message, d.span.line])).toEqual([['error', 'No fragment "nowhere" to use', 2]]);
    expect(r.uses?.[0]).toMatchObject({ id: 'nowhere', hash: null, gave: [] });
    expect(r.cells.has('a')).toBe(true);
    expect(compileSource('* from "gm_kit"').diagnostics.map((d) => d.message)).toContain('No library to use "gm_kit" from: compileSource(text, env, { resolve })');
  });

  it('a cycle names it', () => {
    const resolve = library({ a: '* from b\n&x s=sine', b: '* from a\n&y s=sine' });
    expect(errors('* from a', resolve)).toEqual(['use "a" is a cycle: "a" → "b" → "a"']);
    expect(errors('* from self', library({ self: '* from "self"' }))).toEqual(['use "self" is a cycle: "self" → "self"']);
  });

  it(`a depth past ${USE_DEPTH} names it: ${USE_DEPTH} passes, ${USE_DEPTH + 1} fails`, () => {
    // (f1 uses f2 … fn uses nothing: the piece's use of f1 is depth 1, fn's line is depth n)
    const chain = (n: number) =>
      library(Object.fromEntries(Array.from({ length: n }, (_, i) => [`f${i + 1}`, i + 1 < n ? `* from "f${i + 2}"\n&v${i + 1} s=sine` : `&v${n} s=sine`])));
    expect(errors('* from f1', chain(USE_DEPTH))).toEqual([]);
    expect(compileSource('* from f1', undefined, { resolve: chain(USE_DEPTH) }).uses?.[0]?.gave).toHaveLength(USE_DEPTH);
    const path = Array.from({ length: USE_DEPTH + 1 }, (_, i) => `"f${i + 1}"`).join(' → ');
    expect(errors('* from f1', chain(USE_DEPTH + 1))).toEqual([`use "f${USE_DEPTH + 1}" nests past ${USE_DEPTH} deep: ${path}`]);
  });

  it('two used fragments defining one name by different lines name it and both ids; the piece’s own line settles it', () => {
    const resolve = library({ a: '&bd note=36 s=sine loop=A1', b: '&bd note=36 s=white' });
    const r = compileSource('* from a\n* from b\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~', undefined, { resolve });
    expect(r.diagnostics.map((d) => [d.message, d.span.line])).toEqual([['&bd is defined by "a" and by "b", by different lines: write it in the piece, or drop one use', 2]]);
    expect(errors('* from a\n* from b\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~\n&bd note=36 s=sine loop=C2', resolve)).toEqual([]);
  });

  it('what the compiler says of a used line is said on the use line it came through', () => {
    const r = compileSource('&bar meter("4/4") step=100bpm\n* from broken', undefined, { resolve: library({ broken: '&a step=8n 0 2\n&m [&a * &nowhere]' }) });
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => [d.message, d.span.line])).toEqual([['Unknown cell &nowhere', 2]]);
  });
});

describe('the built-in card hears only what the piece’s own lines leave unread', () => {
  it('a piece using the General MIDI kit sounds its own groove, not 47 held voices', () => {
    const text = GROOVE;
    expect(voices(text)).toEqual(['bd', 'hh', 'sd']);
    // (written out, the kit's lines are the piece's own, and the card hears every one)
    expect(voices(expand(text, resolveSeed)).length).toBeGreaterThan(3);
  });
});

describe('the rhythms with the General MIDI kit (S1)', () => {
  // (until rung 2 takes them out, a rhythm's stand-in voices are stripped here, so the kit's lines are the ones read)
  const strip = (text: string) =>
    text
      .split('\n')
      .filter((l) => !KIT_NAMES.includes(/^&([A-Za-z0-9_]+)/.exec(l)?.[1] ?? ''))
      .join('\n');
  for (const rhythm of RHYTHM_FRAGMENTS)
    it(`${rhythm.id}, on a meter it fits, sounds identical to the same text written out`, () => {
      const meter = METER_FRAGMENTS.map((m) => setTiming(m.text, 'bar', 'step', '120bpm')).find((m) => fitOf(rhythm.text, m).fits)!;
      // (heard through a card: the rhythms carry none, #291)
      const piece = `* from gm_kit\n${meter}\n${strip(rhythm.text)}\n${heard(rhythm.text)}`;
      const r = compileSource(piece, undefined, seed);
      expect(r.diagnostics, meter).toEqual([]);
      expect(r.uses?.[0]?.overrode).toEqual([]);
      expect(soundsIdentical(piece, expand(piece, resolveSeed), undefined, seed)).toBe(true);
    });
  it('every rhythm is one of the twenty-two (#572: four read from the examples)', () => expect(RHYTHM_FRAGMENTS).toHaveLength(22));
});

describe('the lockfile', () => {
  const file = (uses?: { id: string; hash: string }[]): PieceFile => ({ frontmatter: { title: 'A groove', ...(uses ? { uses } : {}) }, text: GROOVE, prose: '' });

  it('round-trips: writePiece(readPiece(f)) keeps uses:', () => {
    const written = writePiece(withLockfile(file(), compileSource(GROOVE, undefined, seed).uses!));
    expect(written).toContain(`uses:\n  - id: gm_kit\n    hash: ${fragmentHash(KIT)}\n`);
    const read = readPiece(written);
    expect('problems' in read).toBe(false);
    expect(writePiece(read as PieceFile)).toBe(written);
    expect(lockfileOf(read as PieceFile)).toEqual([{ id: 'gm_kit', hash: fragmentHash(KIT) }]);
  });

  it('a recorded hash the library no longer gives plays the current version, with a warning naming the id', () => {
    const locked = lockfileOf(file([{ id: 'gm_kit', hash: 'e1:0000000000000000' }]));
    const r = compileSource(GROOVE, undefined, { ...seed, locked });
    expect(r.ok).toBe(true);
    expect(r.diagnostics.map((d) => [d.severity, d.message, d.span.line])).toEqual([['warning', '"gm_kit" has changed since this piece was saved: its current version plays', 1]]);
    expect(r.uses?.[0]?.hash).toBe(fragmentHash(KIT));
    expect(compileSource(GROOVE, undefined, { ...seed, locked: [{ id: 'gm_kit', hash: fragmentHash(KIT) }] }).diagnostics).toEqual([]);
  });

  it('the resolver is asked for the recorded hash', () => {
    const asked: (string | undefined)[] = [];
    compileSource(GROOVE, undefined, { resolve: (id, hash) => (asked.push(hash), resolveSeed(id)), locked: [{ id: 'gm_kit', hash: 'e1:ab' }] });
    compileSource(GROOVE, undefined, { resolve: (id, hash) => (asked.push(hash), resolveSeed(id)) });
    expect(asked).toEqual(['e1:ab', undefined]);
  });

  it('an entry no use names is dropped on the next save, and the key with the last one', () => {
    const two = file([
      { id: 'gm_kit', hash: 'e1:1' },
      { id: 'harmonic_minor', hash: 'e1:2' },
    ]);
    expect(lockfileOf(readPiece(writePiece(two)) as PieceFile)).toEqual([{ id: 'gm_kit', hash: 'e1:1' }]);
    expect(writePiece({ ...two, text: '&a s=sine' })).not.toContain('uses');
  });

  it('keeps the entry of a from line on the next save, as of a use line (decision 065)', () => {
    const fromText = '&bd, &sd, &hh from gm_kit\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]\n';
    const piece = { ...file([{ id: 'gm_kit', hash: 'e1:1' }]), text: fromText };
    expect(lockfileOf(readPiece(writePiece(piece)) as PieceFile)).toEqual([{ id: 'gm_kit', hash: 'e1:1' }]);
    const recorded = writePiece(withLockfile({ ...file(), text: fromText }, compileSource(fromText, undefined, seed).uses!));
    expect(lockfileOf(readPiece(recorded) as PieceFile)).toEqual([{ id: 'gm_kit', hash: fragmentHash(KIT) }]);
  });

  it('a lockfile that isn’t a list of id and hash is a problem', () => {
    expect(readPiece('---\nuses: [core kit]\n---\n\n```cells\n* from "gm_kit"\n```\n')).toHaveProperty('problems');
  });

  it('a use that didn’t resolve keeps the entry it had', () => {
    const had = file([{ id: 'gm_kit', hash: 'e1:1' }]);
    const uses = compileSource(GROOVE, undefined, { resolve: () => null }).uses!;
    expect(lockfileOf(withLockfile(had, uses))).toEqual([{ id: 'gm_kit', hash: 'e1:1' }]);
  });

  it('the hash is the text’s up to layout, its rung written first', () => {
    expect(fragmentHash(KIT)).toMatch(/^e1:[0-9a-f]{16}$/);
    expect(fragmentHash('&a  s=sine # a comment\n\n&b s=saw')).toBe(fragmentHash('&a s=sine\n&b s=saw'));
    expect(fragmentHash('&a s=sine')).not.toBe(fragmentHash('&a s=saw'));
    expect(new Set(LIBRARY.map((f) => fragmentHash(f.text))).size).toBe(LIBRARY.length);
  });
});

describe('the tools keep from', () => {
  it('Normalise writes a collection’s from line its narrowest, in its order, never expanded', () => {
    const text = '* from gm_kit\n&bar meter("4/4") step=&tempo\n&tempo step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh ~\n&hh note=42 s=white cutoff=8000';
    const out = normalise(text, seed).source;
    // (the kit's cells the piece reads, &hh its own, #27)
    expect(out).toBe(text.replace('cutoff=', 'lpf=').replace('* from gm_kit', '&bd, &sd from gm_kit'));
  });

  it('the measure counts a use line as one leaf', () => {
    const own = '&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]';
    const without = structureOf(own, { asWritten: true });
    const withUse = structureOf(GROOVE, { asWritten: true, resolve: resolveSeed });
    expect(withUse).toEqual({ ...without, leaves: without.leaves + 1, total: without.total + 1 });
  });
});

describe('the fit (decision 047) with from', () => {
  const compiled = (text: string) => compileSource(text, undefined, seed);

  it('what a workbench’s from lines give counts as defined there', () => {
    const groove = '&beat step=8n &bd ~\n&back step=8n ~ &sd\n&out map=sample [&beat, &back]';
    expect(holesOf(groove, compiled).uses).toEqual(['&bd', '&sd']);
    const fit = fitOf(groove, '* from gm_kit\n&bar meter("4/4") step=100bpm', compiled);
    expect([fit.fits, fit.missing, fit.sounds]).toEqual([true, [], []]);
  });

  it('a hole read only as a sound doesn’t block the fit: it is the instrument to ask for next', () => {
    // (Funk's lines read as a text with no signature: their drums sound holes, as a groove's were before #637)
    const funk = linesAlone(RHYTHM_FRAGMENTS.find((f) => f.id === 'funk_drums')!.text);
    const bare = funk
      .split('\n')
      .filter((l) => !/ s=white$/.test(l))
      .join('\n');
    // (a line's first unknown cell is the one its compile reaches: holesOf stands each in and asks again, so &oh follows &hh)
    expect(holesOf(bare, compileSource).sounds).toEqual(['&bd', '&hh', '&oh', '&rim', '&sd']);
    const fit = fitOf(bare, '&bar meter("4/4") step=100bpm');
    expect([fit.fits, fit.missing, fit.sounds]).toEqual([true, [], ['&bd', '&hh', '&oh', '&rim', '&sd']]);
    // (a hole read as a table still blocks)
    expect(fitOf('&bass over=&harm step=8n 0!8\n&m [&bass * &v]\n&v s=saw', '&bar meter("4/4") step=100bpm').missing).toEqual(['&harm']);
  });

  it('a used fragment’s holes are judged over the expansion: its clock needs and its sounds the piece’s', () => {
    const bench = (meter: string) => setTiming(`&bar meter("${meter}")`, 'bar', 'step', '120bpm');
    // (a two-bar clave doesn't fit 7/8, used or written out)
    const clave = RHYTHM_FRAGMENTS.find((f) => f.id === 'son_clave_3_2')!.text;
    expect(fitOf(clave, bench('7/8')).fits).toBe(false);
    const used = fitOf('* from son_clave_3_2', bench('7/8'), undefined, resolveSeed);
    expect([used.fits, used.unmet.map((n) => n.cell)]).toEqual([false, ['&clave']]);
    expect(fitOf('* from son_clave_3_2', bench('4/4'), undefined, resolveSeed).fits).toBe(true);
    expect(holesOf('* from son_clave_3_2', (t) => compileSource(t, undefined, seed), resolveSeed).clock.map((n) => n.cell)).toEqual(['&clave']);
    // (a used groove's lines without its stand-ins: its voices are sounds, as written out)
    const funk = linesAlone(RHYTHM_FRAGMENTS.find((f) => f.id === 'funk_drums')!.text);
    const bare = funk
      .split('\n')
      .filter((l) => !/ s=white$/.test(l))
      .join('\n');
    const resolve: Resolve = (id) => (id === 'bare funk' ? bare : resolveSeed(id));
    const fit = fitOf('* from "bare funk"', bench('4/4'), undefined, resolve);
    expect([fit.fits, fit.missing, fit.sounds]).toEqual([true, [], ['&bd', '&hh', '&oh', '&rim', '&sd']]);
    expect(fitOf('* from "bare funk"', '* from gm_kit\n' + bench('4/4'), undefined, resolve).sounds).toEqual([]);
  });

  it('a union carries a fragment’s from lines, once', () => {
    expect(unionOf('* from gm_kit\n&beat step=8n &bd ~', '* from gm_kit\n&bar meter("4/4")').text).toBe('* from gm_kit\n&bar meter("4/4")\n&beat step=8n &bd ~');
    expect(unionOf('* from gm_kit\n&beat step=8n &bd ~', '&bar meter("4/4")').text).toBe('&bar meter("4/4")\n* from gm_kit\n&beat step=8n &bd ~');
  });
});
