// `use "core kit"` (decision 054, rung 3: #232): a fragment taken into a piece by its id, the piece's own lines winning,
// read through a resolver the host hands each compile, with the lockfile a piece file keeps.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { parse } from './parser';
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
import { holesOf } from '../repository/holes';

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

const KIT = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'core kit')!.text;
const KIT_NAMES = parse(KIT)
  .cells.filter((c) => !c.lambda)
  .map((c) => c.name);
const GROOVE = 'use "core kit"\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]\n';

describe('the use line', () => {
  it('is a line of its own, the id in double quotes, read in the order written', () => {
    expect(parse('use "core kit"\n&a s=sine\n  use   "gm kit"  # a comment').uses?.map((u) => [u.id, u.span.line])).toEqual([
      ['core kit', 1],
      ['gm kit', 3],
    ]);
    expect(parse('&a s=sine').uses).toBeUndefined();
  });

  it('written any other way is an error of its own', () => {
    for (const bad of ['use core kit', "use 'core kit'", 'use "core kit" &bd', 'use ""', 'use'])
      expect(
        parse(bad).diagnostics.map((d) => d.message),
        bad,
      ).toEqual(['A use line names a fragment by its id, in double quotes, on a line of its own: use "core kit"']);
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
        id: 'core kit',
        span: { line: 1, col: 1, len: 14 },
        hash: fragmentHash(KIT),
        gave: KIT_NAMES.filter((n) => n !== 'sd').map((n) => `&${n}`),
        overrode: ['&sd'],
      },
    ]);
    expect(r.cells.get('sd')?.params.hpf).toBe(900);
    const out = expand(text, resolveSeed);
    expect(out.startsWith('&bar meter("4/4") step=100bpm\n&beat')).toBe(true);
    expect(out).not.toContain('use "core kit"');
    expect(out.split('\n').filter((l) => l.startsWith('&sd'))).toEqual(['&sd s=white hpf=900 env=&(map=adsr 0 .12 0 .05)']);
    expect(soundsIdentical(text, out, undefined, seed)).toBe(true);
  });

  it('a text with no use line compiles as it did, and expands to itself', () => {
    const text = '&a s=sine loop=A4';
    expect(compileSource(text, undefined, seed).uses).toBeUndefined();
    expect(expand(text, resolveSeed)).toBe(text);
  });

  it('a used fragment may use another: its own lines win over what it uses, the piece’s over all', () => {
    const resolve = library({ groove: 'use "kit"\n&beat step=8n &bd ~ &sd ~\n&sd s=white hpf=2000', kit: '&bd s=sine loop=A1\n&sd s=white' });
    const r = compileSource('use "groove"\n&bar meter("4/4") step=100bpm\n&bd s=sine loop=C2\n&out map=sample [&beat]', undefined, { resolve });
    expect(r.diagnostics).toEqual([]);
    expect(r.uses?.[0]).toMatchObject({ gave: ['&beat', '&sd'], overrode: ['&bd'] });
    expect(r.cells.get('sd')?.params.hpf).toBe(2000);
  });

  it('an id used twice gives its lines once, and the second use says it adds nothing', () => {
    const r = compileSource(`${GROOVE}&out map=sample [&beat]\nuse "core kit"`, undefined, seed);
    expect(r.diagnostics.map((d) => [d.severity, d.message, d.span.line])).toEqual([['warning', 'use "core kit" is written already, on line 1: this one adds nothing', 5]]);
    expect(r.uses?.map((u) => [u.hash, u.gave.length])).toEqual([
      [fragmentHash(KIT), KIT_NAMES.length],
      [fragmentHash(KIT), 0],
    ]);
    const resolve = library({ twice: 'use "kit"\nuse "kit"\n&beat step=8n &bd ~', kit: '&bd s=sine loop=A1' });
    expect(errors('&bar meter("4/4") step=100bpm\nuse "twice"', resolve)).toEqual([]);
  });

  it('a line two used fragments give word for word is one line', () => {
    const resolve = library({ a: '&bd s=sine loop=A1\n&x s=saw', b: '&bd  s=sine   loop=A1 # the same\n&y s=saw' });
    const r = compileSource('use "a"\nuse "b"\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd &x &y', undefined, { resolve });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.uses?.map((u) => u.gave)).toEqual([
      ['&bd', '&x'],
      ['&bd', '&y'],
    ]);
  });
});

describe('the errors, each on its use line', () => {
  it('an unresolved id names it, and the piece’s other lines compile', () => {
    const r = compileSource('&bar meter("4/4") step=100bpm\nuse "nowhere"\n&a step=8n 0 2\n&m [&a * &v]\n&v s=sine', undefined, seed);
    expect(r.diagnostics.map((d) => [d.severity, d.message, d.span.line])).toEqual([['error', 'No fragment "nowhere" to use', 2]]);
    expect(r.uses?.[0]).toMatchObject({ id: 'nowhere', hash: null, gave: [] });
    expect(r.cells.has('a')).toBe(true);
    expect(compileSource('use "core kit"').diagnostics.map((d) => d.message)).toContain('No library to use "core kit" from: compileSource(text, env, { resolve })');
  });

  it('a cycle names it', () => {
    const resolve = library({ a: 'use "b"\n&x s=sine', b: 'use "a"\n&y s=sine' });
    expect(errors('use "a"', resolve)).toEqual(['use "a" is a cycle: "a" → "b" → "a"']);
    expect(errors('use "self"', library({ self: 'use "self"' }))).toEqual(['use "self" is a cycle: "self" → "self"']);
  });

  it(`a depth past ${USE_DEPTH} names it: ${USE_DEPTH} passes, ${USE_DEPTH + 1} fails`, () => {
    // (f1 uses f2 … fn uses nothing: the piece's use of f1 is depth 1, fn's line is depth n)
    const chain = (n: number) =>
      library(Object.fromEntries(Array.from({ length: n }, (_, i) => [`f${i + 1}`, i + 1 < n ? `use "f${i + 2}"\n&v${i + 1} s=sine` : `&v${n} s=sine`])));
    expect(errors('use "f1"', chain(USE_DEPTH))).toEqual([]);
    expect(compileSource('use "f1"', undefined, { resolve: chain(USE_DEPTH) }).uses?.[0]?.gave).toHaveLength(USE_DEPTH);
    const path = Array.from({ length: USE_DEPTH + 1 }, (_, i) => `"f${i + 1}"`).join(' → ');
    expect(errors('use "f1"', chain(USE_DEPTH + 1))).toEqual([`use "f${USE_DEPTH + 1}" nests past ${USE_DEPTH} deep: ${path}`]);
  });

  it('two used fragments defining one name by different lines name it and both ids; the piece’s own line settles it', () => {
    const resolve = library({ a: '&bd s=sine loop=A1', b: '&bd s=white' });
    const r = compileSource('use "a"\nuse "b"\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~', undefined, { resolve });
    expect(r.diagnostics.map((d) => [d.message, d.span.line])).toEqual([['&bd is defined by "a" and by "b", by different lines: write it in the piece, or drop one use', 2]]);
    expect(errors('use "a"\nuse "b"\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~\n&bd s=sine loop=C2', resolve)).toEqual([]);
  });

  it('what the compiler says of a used line is said on the use line it came through', () => {
    const r = compileSource('&bar meter("4/4") step=100bpm\nuse "broken"', undefined, { resolve: library({ broken: '&a step=8n 0 2\n&m [&a * &nowhere]' }) });
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => [d.message, d.span.line])).toEqual([['Unknown cell &nowhere', 2]]);
  });
});

describe('the built-in card hears only what the piece’s own lines leave unread', () => {
  it('a piece using the General MIDI kit sounds its own groove, not 47 held voices', () => {
    const text = GROOVE.replace('core kit', 'gm kit');
    expect(voices(text)).toEqual(['bd', 'hh', 'sd']);
    // (written out, the kit's lines are the piece's own, and the card hears every one)
    expect(voices(expand(text, resolveSeed)).length).toBeGreaterThan(3);
  });
});

describe('the rhythms with the core kit (S1)', () => {
  // (until rung 2 takes them out, a rhythm's stand-in voices are stripped here, so the kit's lines are the ones read)
  const strip = (text: string) =>
    text
      .split('\n')
      .filter((l) => !KIT_NAMES.includes(/^&([A-Za-z0-9_]+)/.exec(l)?.[1] ?? ''))
      .join('\n');
  for (const rhythm of RHYTHM_FRAGMENTS)
    it(`${rhythm.id}, on a meter it fits, sounds identical to the same text written out`, () => {
      const meter = METER_FRAGMENTS.map((m) => setTiming(m.text, 'bar', 'step', '120bpm')).find((m) => fitOf(rhythm.text, m).fits)!;
      const piece = `use "core kit"\n${meter}\n${strip(rhythm.text)}`;
      const r = compileSource(piece, undefined, seed);
      expect(r.diagnostics, meter).toEqual([]);
      expect(r.uses?.[0]?.overrode).toEqual([]);
      expect(soundsIdentical(piece, expand(piece, resolveSeed), undefined, seed)).toBe(true);
    });
  it('every rhythm is one of the thirteen', () => expect(RHYTHM_FRAGMENTS).toHaveLength(13));
});

describe('the lockfile', () => {
  const file = (uses?: { id: string; hash: string }[]): PieceFile => ({ frontmatter: { title: 'A groove', ...(uses ? { uses } : {}) }, text: GROOVE, prose: '' });

  it('round-trips: writePiece(readPiece(f)) keeps uses:', () => {
    const written = writePiece(withLockfile(file(), compileSource(GROOVE, undefined, seed).uses!));
    expect(written).toContain(`uses:\n  - id: core kit\n    hash: ${fragmentHash(KIT)}\n`);
    const read = readPiece(written);
    expect('problems' in read).toBe(false);
    expect(writePiece(read as PieceFile)).toBe(written);
    expect(lockfileOf(read as PieceFile)).toEqual([{ id: 'core kit', hash: fragmentHash(KIT) }]);
  });

  it('a recorded hash the library no longer gives plays the current version, with a warning naming the id', () => {
    const locked = lockfileOf(file([{ id: 'core kit', hash: 'e1:0000000000000000' }]));
    const r = compileSource(GROOVE, undefined, { ...seed, locked });
    expect(r.ok).toBe(true);
    expect(r.diagnostics.map((d) => [d.severity, d.message, d.span.line])).toEqual([
      ['warning', '"core kit" has changed since this piece was saved: its current version plays', 1],
    ]);
    expect(r.uses?.[0]?.hash).toBe(fragmentHash(KIT));
    expect(compileSource(GROOVE, undefined, { ...seed, locked: [{ id: 'core kit', hash: fragmentHash(KIT) }] }).diagnostics).toEqual([]);
  });

  it('the resolver is asked for the recorded hash', () => {
    const asked: (string | undefined)[] = [];
    compileSource(GROOVE, undefined, { resolve: (id, hash) => (asked.push(hash), resolveSeed(id)), locked: [{ id: 'core kit', hash: 'e1:ab' }] });
    compileSource(GROOVE, undefined, { resolve: (id, hash) => (asked.push(hash), resolveSeed(id)) });
    expect(asked).toEqual(['e1:ab', undefined]);
  });

  it('an entry no use names is dropped on the next save, and the key with the last one', () => {
    const two = file([
      { id: 'core kit', hash: 'e1:1' },
      { id: 'gm kit', hash: 'e1:2' },
    ]);
    expect(lockfileOf(readPiece(writePiece(two)) as PieceFile)).toEqual([{ id: 'core kit', hash: 'e1:1' }]);
    expect(writePiece({ ...two, text: '&a s=sine' })).not.toContain('uses');
  });

  it('a lockfile that isn’t a list of id and hash is a problem', () => {
    expect(readPiece('---\nuses: [core kit]\n---\n\n```cells\nuse "core kit"\n```\n')).toHaveProperty('problems');
  });

  it('a use that didn’t resolve keeps the entry it had', () => {
    const had = file([{ id: 'core kit', hash: 'e1:1' }]);
    const uses = compileSource(GROOVE, undefined, { resolve: () => null }).uses!;
    expect(lockfileOf(withLockfile(had, uses))).toEqual([{ id: 'core kit', hash: 'e1:1' }]);
  });

  it('the hash is the text’s up to layout, its rung written first', () => {
    expect(fragmentHash(KIT)).toMatch(/^e1:[0-9a-f]{16}$/);
    expect(fragmentHash('&a  s=sine # a comment\n\n&b s=saw')).toBe(fragmentHash('&a s=sine\n&b s=saw'));
    expect(fragmentHash('&a s=sine')).not.toBe(fragmentHash('&a s=saw'));
    expect(new Set(LIBRARY.map((f) => fragmentHash(f.text))).size).toBe(LIBRARY.length);
  });
});

describe('the tools keep use', () => {
  it('Normalise keeps the use line, in its order, never expanded', () => {
    const text = 'use "core kit"\nuse "gm kit"\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh ~\n&hh s=white cutoff=8000';
    const out = normalise(text, seed).source;
    expect(out).toBe(text.replace('cutoff=', 'lpf='));
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
    const fit = fitOf(groove, 'use "core kit"\n&bar meter("4/4") step=100bpm', compiled);
    expect([fit.fits, fit.missing, fit.sounds]).toEqual([true, [], []]);
  });

  it('a hole read only as a sound doesn’t block the fit: it is the instrument to ask for next', () => {
    const funk = RHYTHM_FRAGMENTS.find((f) => f.id === 'Funk drums')!.text;
    const bare = funk
      .split('\n')
      .filter((l) => !/ s=white$/.test(l))
      .join('\n');
    // (a line's first unknown cell is the one its compile reaches: &oh follows &hh on the hats' line)
    expect(holesOf(bare, compileSource).sounds).toEqual(['&bd', '&hh', '&rim', '&sd']);
    const fit = fitOf(bare, '&bar meter("4/4") step=100bpm');
    // (the fit finds &oh too: a stand-in for &hh lets the compile reach it)
    expect([fit.fits, fit.missing, fit.sounds]).toEqual([true, [], ['&bd', '&hh', '&oh', '&rim', '&sd']]);
    // (a hole read as a table still blocks)
    expect(fitOf('&bass over=&harm step=8n 0!8\n&m [&bass * &v]\n&v s=saw', '&bar meter("4/4") step=100bpm').missing).toEqual(['&harm']);
  });

  it('a used fragment’s holes are judged over the expansion: its clock needs and its sounds the piece’s', () => {
    const bench = (meter: string) => setTiming(`&bar meter("${meter}")`, 'bar', 'step', '120bpm');
    // (a two-bar clave doesn't fit 7/8, used or written out)
    const clave = RHYTHM_FRAGMENTS.find((f) => f.id === 'son clave 3-2')!.text;
    expect(fitOf(clave, bench('7/8')).fits).toBe(false);
    const used = fitOf('use "son clave 3-2"', bench('7/8'), undefined, resolveSeed);
    expect([used.fits, used.unmet.map((n) => n.cell)]).toEqual([false, ['&clave']]);
    expect(fitOf('use "son clave 3-2"', bench('4/4'), undefined, resolveSeed).fits).toBe(true);
    expect(holesOf('use "son clave 3-2"', (t) => compileSource(t, undefined, seed), resolveSeed).clock.map((n) => n.cell)).toEqual(['&clave']);
    // (a used groove without its stand-ins: its voices are sounds, as written out)
    const funk = RHYTHM_FRAGMENTS.find((f) => f.id === 'Funk drums')!.text;
    const bare = funk
      .split('\n')
      .filter((l) => !/ s=white$/.test(l))
      .join('\n');
    const resolve: Resolve = (id) => (id === 'bare funk' ? bare : resolveSeed(id));
    const fit = fitOf('use "bare funk"', bench('4/4'), undefined, resolve);
    expect([fit.fits, fit.missing, fit.sounds]).toEqual([true, [], ['&bd', '&hh', '&oh', '&rim', '&sd']]);
    expect(fitOf('use "bare funk"', 'use "core kit"\n' + bench('4/4'), undefined, resolve).sounds).toEqual([]);
  });

  it('a union carries a fragment’s use lines, once', () => {
    expect(unionOf('use "core kit"\n&beat step=8n &bd ~', 'use "core kit"\n&bar meter("4/4")').text).toBe('use "core kit"\n&bar meter("4/4")\n&beat step=8n &bd ~');
    expect(unionOf('use "gm kit"\n&beat step=8n &bd ~', '&bar meter("4/4")').text).toBe('&bar meter("4/4")\nuse "gm kit"\n&beat step=8n &bd ~');
  });
});
