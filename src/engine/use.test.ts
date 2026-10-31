// `use * from gm_kit` (decision 054, rung 3: #232): a fragment taken into a piece by its id, the piece's own lines winning,
// read through a resolver the host hands each compile, with the lockfile a piece file keeps.
import { describe, expect, it } from 'vitest';
import { compileSource as compiledWithOldUse } from './compile';
import { parse, USE_FORM, writeUse } from './parser';
import { expand, fragmentHash, USE_DEPTH } from './use';
import { setTiming } from './edit';
import { lockfileOf, readPiece, withLockfile, writePiece, type PieceFile } from './piecefile';
import { eventsBetween, plan } from './realize';
import { codeShifts, type Resolve } from './program';
import { soundsIdentical } from './sameness';
import { normalise } from './normalise/index';
import { structureOf } from './measure';
import { LIBRARY, resolveSeed } from '../repository/library';
import { METER_FRAGMENTS } from '../repository/meters';
import { RHYTHM_FRAGMENTS } from '../repository/rhythms';
import { INSTRUMENT_FRAGMENTS } from '../repository/instruments';
import { fitOf, unionOf } from '../repository/fit';
import { heard } from '../repository/heard';
import { holesOf } from '../repository/holes';

// (these texts take fragments the old way, `use`, which still reads for a release and warns that it is the old way,
// decision 065: what is tested here is what it reads, so that warning is set aside; `from.test.ts` tests the new way)
const OLD_USE = /^use is the old way/;
const compileSource = (...args: Parameters<typeof compiledWithOldUse>): ReturnType<typeof compiledWithOldUse> => {
  const r = compiledWithOldUse(...args);
  const diagnostics = r.diagnostics.filter((d) => !OLD_USE.test(d.message));
  return { ...r, diagnostics, ok: !diagnostics.some((d) => d.severity === 'error') };
};

const seed = { resolve: resolveSeed };
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
const GROOVE = 'use * from gm_kit\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]\n';

describe('the use line', () => {
  it('is a line of its own, the id in double quotes, read in the order written', () => {
    expect(parse('use * from "core kit"\n&a s=sine\n  use   "gm kit"  # a comment').uses?.map((u) => [u.id, u.span.line])).toEqual([
      ['core kit', 1],
      ['gm kit', 3],
    ]);
    expect(parse('&a s=sine').uses).toBeUndefined();
  });

  it('written any other way is an error of its own', () => {
    for (const bad of [
      'use core kit',
      "use 'core kit'",
      'use "core kit" &bd',
      'use ""',
      'use',
      'use * from',
      'use &bd from',
      'use &bd, from kit',
      'use * from core kit',
      'use &bd &sd from kit',
      'use bd from kit',
    ])
      expect(
        parse(bad).diagnostics.map((d) => d.message),
        bad,
      ).toEqual([USE_FORM]);
    expect(parse('&user s=sine').diagnostics).toEqual([]);
  });
});

describe('the expansion', () => {
  it('reads the piece’s own lines, then the used fragment’s it doesn’t define, the piece’s winning', () => {
    // (with a card of its own: written out, a piece with none would hear the kit's unread voices, below)
    const text = `${GROOVE}&out map=sample [&beat]\n&sd s=white hpf=900 env=&(map=adsr 0 .12 0 .05)\n`;
    const r = compileSource(text, undefined, seed);
    expect(r.diagnostics).toEqual([]);
    expect(r.uses).toEqual([
      {
        id: 'gm_kit',
        names: null,
        span: { line: 1, col: 1, len: 17 },
        hash: fragmentHash(KIT),
        gave: KIT_NAMES.filter((n) => n !== 'sd').map((n) => `&${n}`),
        overrode: ['&sd'],
      },
    ]);
    expect(r.cells.get('sd')?.params.hpf).toBe(900);
    const out = expand(text, resolveSeed);
    expect(out.startsWith('&bar meter("4/4") step=100bpm\n&beat')).toBe(true);
    expect(out).not.toContain('use * from gm_kit');
    expect(out.split('\n').filter((l) => l.startsWith('&sd'))).toEqual(['&sd s=white hpf=900 env=&(map=adsr 0 .12 0 .05)']);
    expect(soundsIdentical(text, out, undefined, seed)).toBe(true);
  });

  it('a text with no use line compiles as it did, and expands to itself', () => {
    const text = '&a s=sine loop=A4';
    expect(compileSource(text, undefined, seed).uses).toBeUndefined();
    expect(expand(text, resolveSeed)).toBe(text);
  });

  it('a used fragment may use another: its own lines win over what it uses, the piece’s over all', () => {
    const resolve = library({ groove: 'use * from kit\n&beat step=8n &bd ~ &sd ~\n&sd s=white hpf=2000', kit: '&bd s=sine loop=A1\n&sd s=white' });
    const r = compileSource('use * from groove\n&bar meter("4/4") step=100bpm\n&bd s=sine loop=C2\n&out map=sample [&beat]', undefined, { resolve });
    expect(r.diagnostics).toEqual([]);
    expect(r.uses?.[0]).toMatchObject({ gave: ['&beat', '&sd'], overrode: ['&bd'] });
    expect(r.cells.get('sd')?.params.hpf).toBe(2000);
  });

  it('an id used twice gives its lines once, and the second use says it adds nothing', () => {
    const r = compileSource(`${GROOVE}&out map=sample [&beat]\nuse * from gm_kit`, undefined, seed);
    expect(r.diagnostics.map((d) => [d.severity, d.message, d.span.line])).toEqual([['warning', '"gm_kit" is used already, on line 1: this use adds nothing', 5]]);
    expect(r.uses?.map((u) => [u.hash, u.gave.length])).toEqual([
      [fragmentHash(KIT), KIT_NAMES.length],
      [fragmentHash(KIT), 0],
    ]);
    const resolve = library({ twice: 'use * from kit\nuse * from kit\n&beat step=8n &bd ~', kit: '&bd s=sine loop=A1' });
    expect(errors('&bar meter("4/4") step=100bpm\nuse * from twice', resolve)).toEqual([]);
  });

  it('a line two used fragments give word for word is one line', () => {
    const resolve = library({ a: '&bd s=sine loop=A1\n&x s=saw', b: '&bd  s=sine   loop=A1 # the same\n&y s=saw' });
    const r = compileSource('use * from a\nuse * from b\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd &x &y', undefined, { resolve });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.uses?.map((u) => u.gave)).toEqual([
      ['&bd', '&x'],
      ['&bd', '&y'],
    ]);
  });
});

describe('a named use (decision 059)', () => {
  const BENCH = '&bar meter("4/4") step=104bpm\n&key scale(dorian, D)\n&harm over=&key step=1m [0,2,4]';
  const read = (text: string, resolve: Resolve = resolveSeed) => {
    const r = compileSource(text, undefined, { resolve });
    // (a bench with no card of its own: that nothing plays isn't what these say)
    const said = r.diagnostics.filter((d) => !d.message.startsWith('Nothing plays yet'));
    return { uses: r.uses, said: said.map((d) => [d.severity, d.message, d.span.line]) };
  };

  it('reads its forms: the names, every name, and a fragment named as its cell', () => {
    expect(parse('use &bd, &sd from core_kit\nuse * from "core kit"\nuse &aeolian\nuse &a,\n  &b from x').uses?.map((u) => [u.id, u.names])).toEqual([
      ['core_kit', ['&bd', '&sd']],
      ['core kit', null],
      ['aeolian', ['&aeolian']],
      ['x', ['&a', '&b']],
    ]);
    expect(writeUse({ id: 'core kit', names: null })).toBe('use * from "core kit"');
    expect(writeUse({ id: 'aeolian', names: ['&aeolian'] })).toBe('use &aeolian');
    expect(writeUse({ id: 'core_kit', names: ['&bd', '&sd'] })).toBe('use &bd, &sd from core_kit');
  });

  it('use is the old way (decision 065): every use line says its from line; use "id" reads as use * from "id"', () => {
    const said = (text: string) => parse(text).diagnostics.map((d) => [d.severity, d.message]);
    const oldWay = (line: string) => ['warning', `use is the old way: say where the cells come from, ${line} (decision 065; Normalise writes it, with a template's arguments)`];
    expect(said('use "core kit"')).toEqual([oldWay('* from "core kit"')]);
    expect(said('use * from "core kit"\nuse &bd from x\nuse &aeolian')).toEqual([oldWay('* from "core kit"'), oldWay('&bd from x'), oldWay('&aeolian from aeolian')]);
    const old = compileSource(GROOVE.replace('use * from gm_kit', 'use "gm_kit"'), undefined, seed);
    expect(old.uses).toEqual(compileSource(GROOVE, undefined, seed).uses?.map((u) => ({ ...u, span: { ...u.span, len: 12 } })));
  });

  it('takes the named cells and the lines they read within the fragment, its helpers', () => {
    const text = `use &bassline from "funk bass"\nuse * from bass\n${BENCH}`;
    const { uses, said } = read(text);
    expect(said.filter(([s]) => s === 'error')).toEqual([]);
    expect(uses?.[0]).toMatchObject({ names: ['&bassline'], gave: ['&bassline', '&bassNext'], overrode: [] });
    expect(compileSource(text, undefined, seed).cells.has('bassNext')).toBe(true);
  });

  it('naming every name a fragment defines expands as use * does, for every seed', () => {
    for (const f of LIBRARY) {
      const all = compileSource(`use * from ${JSON.stringify(f.id)}`, undefined, seed).uses![0]!.gave;
      const named = `use ${all.join(', ')} from ${JSON.stringify(f.id)}`;
      expect(expand(named, resolveSeed), f.id).toBe(expand(`use * from ${JSON.stringify(f.id)}`, resolveSeed));
      expect(expand(`use * from ${JSON.stringify(f.id)}`, resolveSeed), f.id).toBe(expand(`use "${f.id}"`, resolveSeed));
    }
  });

  it('use &x is use &x from x', () => {
    // (a mode whose head is named as its fragment, read by its name (decision 060))
    const resolve: Resolve = (id) => (id === 'phrygian' ? '&phrygian scale(phrygian, E)' : resolveSeed(id));
    const r = read(`use &phrygian\n&bar meter("4/4") step=100bpm\n&tune over=&phrygian step=8n 0 2 4\n&out map=sample [&tune * &v]\n&v s=sine`, resolve);
    expect(r.said).toEqual([]);
    expect(r.uses?.[0]).toMatchObject({ id: 'phrygian', names: ['&phrygian'], gave: ['&phrygian'] });
    // (the seed modes' head is &key: use &key from aeolian)
    expect(read('use &aeolian\n&bar meter("4/4") step=100bpm').said).toEqual([['error', '&aeolian is not in "aeolian": it defines &key', 1]]);
  });

  it('a name the fragment doesn’t define is an error, naming those it does', () => {
    expect(read(`use &bass from "funk bass"\n${BENCH}`).said).toEqual([['error', '&bass is not in "funk bass": it defines &bassline, &bassNext', 1]]);
    expect(read('use &bass\n&bar meter("4/4") step=100bpm').said).toEqual([['error', '&bass is not in "bass": it defines &bassV', 1]]);
  });

  it('an interface name the piece defines is the piece’s, read by the taken line, as the main key was (decision 060)', () => {
    const section = ['&key scale(aeolian, A)', '&chords over=&key step=1m [0,2,4] [3,5,7]', '&pad over=&chords step=4n 0 1 2'].join('\n');
    const resolve: Resolve = (id) => (id === 'section' ? section : resolveSeed(id));
    const piece = `use &pad from section\n&bar meter("4/4") step=100bpm\n&key scale(dorian, D)\n&v s=sine\n&out map=sample [&pad * &v]`;
    const r = read(piece, resolve);
    expect(r.said).toEqual([]);
    expect(r.uses?.[0]).toMatchObject({ names: ['&pad'], gave: ['&chords', '&pad'] });
    // (the piece's key is the one read: its &key in D dorian, not the section's A aeolian)
    const r2 = compileSource(piece, undefined, { resolve });
    expect(r2.cells.get('chords')!.over).toBe('key');
    expect(r2.cells.get('key')!.scan!.steps).toEqual([2, 1, 2, 2, 2, 1, 2]);
    // (a helper that is no interface name still clashes)
    const clash = read(
      `use &pad from section\n&bar meter("4/4") step=100bpm\n&key scale(dorian, D)\n&chords over=&key step=1m [0,2,4]\n&v s=sine\n&out map=sample [&pad * &v]`,
      resolve,
    );
    expect(clash.said.map((x) => x[1])).toEqual([expect.stringMatching(/^&chords is "section"'s, read by its &pad/)]);
  });

  it('a helper the piece also defines is an error (the owner’s ruling 1); naming it makes it the piece’s', () => {
    const helper = `use &bassline from "funk bass"\nuse * from bass\n${BENCH}\n&bassNext over=&harm 2`;
    expect(read(helper).said.filter(([s]) => s === 'error')).toEqual([
      ['error', "&bassNext is \"funk bass\"'s, read by its &bassline, and the piece's too: rename the piece's, or name &bassNext in the use to override it", 1],
    ]);
    const named = read(helper.replace('use &bassline from', 'use &bassline, &bassNext from'));
    // (an override a taken line reads is what the use does, so it says nothing: an instrument's voice given a sound)
    expect(named.said).toEqual([]);
    expect(named.uses?.[0]).toMatchObject({ gave: ['&bassline'], overrode: ['&bassNext'] });
    expect(read(`use &bass, &bassV from "bass performer"\n${BENCH}\n&bassline over=&harm step=4n 0\n&bassLevel map=amp .8\n&bassV s=tri loop=C2`).said).toEqual([]);
    // (one no taken line reads still adds nothing, and says so)
    expect(read(`${helper.replace('use &bassline from', 'use &bassline, &bassNext from')}\n&bassline over=&harm 0`).said).toEqual([
      ['warning', 'The piece defines &bassline, so taking it from "funk bass" adds nothing', 1],
      ['warning', 'The piece defines &bassNext, so taking it from "funk bass" adds nothing', 1],
    ]);
    // (a helper two named cells read is said once)
    const twice = library({ f: '&a [&h * 1]\n&b [&h * 2]\n&h s=sine' });
    expect(errors('use &a, &b from f\n&h s=saw', twice)).toHaveLength(1);
    // (a fragment's own helper collision is said through it)
    const resolve = library({ outer: 'use &a from inner\n&h s=saw', inner: '&a [&h * 1]\n&h s=sine' });
    expect(errors('use * from outer', resolve)).toEqual([
      '&h is "inner"\'s, read by its &a, and "outer"\'s too: rename "outer"\'s, or name &h in the use to override it (in "outer")',
    ]);
  });

  it('a use that adds nothing says so: twice on the issue’s section, on no seed fragment', () => {
    const section = [
      'use * from "4/4 leaning on 16n"',
      'use * from dorian',
      'use * from "vamp to the seventh"',
      'use * from "Funk drums"',
      'use * from gm_kit',
      'use * from "funk bass"',
      'use * from bass',
      '&bar meter("4/4") step=104bpm swing=16n:.6',
      '&key scale(dorian, D)',
    ].join('\n');
    expect(read(section).said).toEqual([
      ['warning', 'The piece defines all "4/4 leaning on 16n" gives (&bar): this use adds nothing', 1],
      ['warning', 'The piece defines all "dorian" gives (&key): this use adds nothing', 2],
    ]);
    expect(read(`use &bar from "4/4 leaning on 16n"\n${BENCH}`).said).toEqual([['warning', 'The piece defines &bar, so taking it from "4/4 leaning on 16n" adds nothing', 1]]);
    for (const f of LIBRARY)
      expect(
        compileSource(f.text, undefined, seed).diagnostics.filter((d) => /adds nothing|old way/.test(d.message)),
        f.id,
      ).toEqual([]);
  });

  it('two named uses of one id take each its names, a line once', () => {
    const r = read('use &bd from gm_kit\nuse &bd, &sd from gm_kit\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &sd ~\n&out map=sample [&beat]');
    expect(r.said).toEqual([]);
    expect(r.uses?.map((u) => u.gave)).toEqual([['&bd'], ['&sd']]);
  });
});

describe('the errors, each on its use line', () => {
  it('an unresolved id names it, and the piece’s other lines compile', () => {
    const r = compileSource('&bar meter("4/4") step=100bpm\nuse * from nowhere\n&a step=8n 0 2\n&m [&a * &v]\n&v s=sine', undefined, seed);
    expect(r.diagnostics.map((d) => [d.severity, d.message, d.span.line])).toEqual([['error', 'No fragment "nowhere" to use', 2]]);
    expect(r.uses?.[0]).toMatchObject({ id: 'nowhere', hash: null, gave: [] });
    expect(r.cells.has('a')).toBe(true);
    expect(compileSource('use "gm_kit"').diagnostics.map((d) => d.message)).toContain('No library to use "gm_kit" from: compileSource(text, env, { resolve })');
  });

  it('a cycle names it', () => {
    const resolve = library({ a: 'use * from b\n&x s=sine', b: 'use * from a\n&y s=sine' });
    expect(errors('use * from a', resolve)).toEqual(['use "a" is a cycle: "a" → "b" → "a"']);
    expect(errors('use * from self', library({ self: 'use "self"' }))).toEqual(['use "self" is a cycle: "self" → "self"']);
  });

  it(`a depth past ${USE_DEPTH} names it: ${USE_DEPTH} passes, ${USE_DEPTH + 1} fails`, () => {
    // (f1 uses f2 … fn uses nothing: the piece's use of f1 is depth 1, fn's line is depth n)
    const chain = (n: number) =>
      library(Object.fromEntries(Array.from({ length: n }, (_, i) => [`f${i + 1}`, i + 1 < n ? `use * from "f${i + 2}"\n&v${i + 1} s=sine` : `&v${n} s=sine`])));
    expect(errors('use * from f1', chain(USE_DEPTH))).toEqual([]);
    expect(compileSource('use * from f1', undefined, { resolve: chain(USE_DEPTH) }).uses?.[0]?.gave).toHaveLength(USE_DEPTH);
    const path = Array.from({ length: USE_DEPTH + 1 }, (_, i) => `"f${i + 1}"`).join(' → ');
    expect(errors('use * from f1', chain(USE_DEPTH + 1))).toEqual([`use "f${USE_DEPTH + 1}" nests past ${USE_DEPTH} deep: ${path}`]);
  });

  it('two used fragments defining one name by different lines name it and both ids; the piece’s own line settles it', () => {
    const resolve = library({ a: '&bd s=sine loop=A1', b: '&bd s=white' });
    const r = compileSource('use * from a\nuse * from b\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~', undefined, { resolve });
    expect(r.diagnostics.map((d) => [d.message, d.span.line])).toEqual([['&bd is defined by "a" and by "b", by different lines: write it in the piece, or drop one use', 2]]);
    expect(errors('use * from a\nuse * from b\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~\n&bd s=sine loop=C2', resolve)).toEqual([]);
  });

  it('what the compiler says of a used line is said on the use line it came through', () => {
    const r = compileSource('&bar meter("4/4") step=100bpm\nuse * from broken', undefined, { resolve: library({ broken: '&a step=8n 0 2\n&m [&a * &nowhere]' }) });
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
      const piece = `use * from gm_kit\n${meter}\n${strip(rhythm.text)}\n${heard(rhythm.text)}`;
      const r = compileSource(piece, undefined, seed);
      expect(r.diagnostics, meter).toEqual([]);
      expect(r.uses?.[0]?.overrode).toEqual([]);
      expect(soundsIdentical(piece, expand(piece, resolveSeed), undefined, seed)).toBe(true);
    });
  it('every rhythm is one of the fifteen', () => expect(RHYTHM_FRAGMENTS).toHaveLength(15));
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
      { id: 'harmonic minor', hash: 'e1:2' },
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
    expect(readPiece('---\nuses: [core kit]\n---\n\n```cells\nuse "gm_kit"\n```\n')).toHaveProperty('problems');
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

describe('the tools keep use', () => {
  it('Normalise writes the use line as its from line (decision 065), in its order, never expanded', () => {
    const text =
      'use * from gm_kit\nuse &key from "harmonic minor"\n&tonic D\n&bar meter("4/4") step=&tempo\n&tempo step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh ~\n&hh s=white cutoff=8000';
    const out = normalise(text, seed).source;
    // (a collection's use its from line; a template's, its tonic, which only it read, written in)
    expect(out).toBe(text.replace('cutoff=', 'lpf=').replace('use * from gm_kit\nuse &key from "harmonic minor"\n&tonic D', '* from gm_kit\n&key from "harmonic minor" D'));
    // (the old spellings, use "id" and use &x, are written * from "id" and &x from x; an id that is a word, bare)
    const old = 'use "gm_kit"  # the kit\nuse &pulse from "pulse"\nuse &kick,&snare from kit\n&bar meter("4/4") step=&tempo\n&tempo step=100bpm\n&beat step=8n &kick ~ &snare ~';
    const resolve = (id: string) => (id === 'kit' ? '&kick s=sine\n&snare s=white' : id === 'pulse' ? '&pulse s=sine loop=A4' : resolveSeed(id));
    expect(normalise(old, { resolve }).source).toBe(
      '* from gm_kit  # the kit\n&pulse from pulse\n&kick, &snare from kit\n&bar meter("4/4") step=&tempo\n&tempo step=100bpm\n&beat step=8n &kick ~ &snare ~',
    );
  });

  it('the measure counts a use line as one leaf', () => {
    const own = '&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]';
    const without = structureOf(own, { asWritten: true });
    const withUse = structureOf(GROOVE, { asWritten: true, resolve: resolveSeed });
    expect(withUse).toEqual({ ...without, leaves: without.leaves + 1, total: without.total + 1 });
  });
});

describe('the fit (decision 047) with use', () => {
  const compiled = (text: string) => compileSource(text, undefined, seed);

  it('what a workbench’s use lines give counts as defined there', () => {
    const groove = '&beat step=8n &bd ~\n&back step=8n ~ &sd\n&out map=sample [&beat, &back]';
    expect(holesOf(groove, compiled).uses).toEqual(['&bd', '&sd']);
    const fit = fitOf(groove, 'use * from gm_kit\n&bar meter("4/4") step=100bpm', compiled);
    expect([fit.fits, fit.missing, fit.sounds]).toEqual([true, [], []]);
  });

  it('a hole read only as a sound doesn’t block the fit: it is the instrument to ask for next', () => {
    const funk = RHYTHM_FRAGMENTS.find((f) => f.id === 'Funk drums')!.text;
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
    const clave = RHYTHM_FRAGMENTS.find((f) => f.id === 'son clave 3-2')!.text;
    expect(fitOf(clave, bench('7/8')).fits).toBe(false);
    const used = fitOf('use * from "son clave 3-2"', bench('7/8'), undefined, resolveSeed);
    expect([used.fits, used.unmet.map((n) => n.cell)]).toEqual([false, ['&clave']]);
    expect(fitOf('use * from "son clave 3-2"', bench('4/4'), undefined, resolveSeed).fits).toBe(true);
    expect(holesOf('use * from "son clave 3-2"', (t) => compileSource(t, undefined, seed), resolveSeed).clock.map((n) => n.cell)).toEqual(['&clave']);
    // (a used groove without its stand-ins: its voices are sounds, as written out)
    const funk = RHYTHM_FRAGMENTS.find((f) => f.id === 'Funk drums')!.text;
    const bare = funk
      .split('\n')
      .filter((l) => !/ s=white$/.test(l))
      .join('\n');
    const resolve: Resolve = (id) => (id === 'bare funk' ? bare : resolveSeed(id));
    const fit = fitOf('use * from "bare funk"', bench('4/4'), undefined, resolve);
    expect([fit.fits, fit.missing, fit.sounds]).toEqual([true, [], ['&bd', '&hh', '&oh', '&rim', '&sd']]);
    expect(fitOf('use * from "bare funk"', 'use * from gm_kit\n' + bench('4/4'), undefined, resolve).sounds).toEqual([]);
  });

  it('a union carries a fragment’s use lines, once', () => {
    expect(unionOf('use * from gm_kit\n&beat step=8n &bd ~', 'use * from gm_kit\n&bar meter("4/4")').text).toBe('use * from gm_kit\n&bar meter("4/4")\n&beat step=8n &bd ~');
    expect(unionOf('use * from gm_kit\n&beat step=8n &bd ~', '&bar meter("4/4")').text).toBe('&bar meter("4/4")\nuse * from gm_kit\n&beat step=8n &bd ~');
  });
});
