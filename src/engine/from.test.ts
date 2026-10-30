// `from` lines (decision 064, #387): a line says where its cells come from. A fragment with a signature is a template, and
// a line takes a copy of it, its parameters bound to the arguments, its other names its own; one with none is a collection,
// its cells taken by name.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { parse, readFrom } from './parser';
import { expand, expansion } from './use';
import { eventsBetween, plan } from './realize';
import { codeShifts, type Resolve } from './program';
import { resolveSeed } from '../repository/library';

const lines = (...xs: string[]) => xs.join('\n');
/** A few templates, and the seed library behind them. */
const LIB: Record<string, string> = {
  dorian: lines('&key from &tonic', '&key scale(dorian, &tonic)'),
  diatonic: lines('&key from (&mode) &tonic', '&key scale(&mode, &tonic)', '&mode major'),
  swung: lines('&bar from (&swing) &tempo', '&bar meter("4/4") step=&tempo swing=&swing', '&swing swing=8n:2/3'),
  aaba: lines('&chorus from (&b) &a', '&chorus step=8n &a &a &b &a', '&b step=8n &a^3'),
  vamp: lines('&harm from &key', '&harm over=&key step=1m [0,2,4] [3,5,7]'),
  walk: lines('&line from &harm', '&line over=&harm step=4n 0 0 0 &next', '&next over=&harm[>>] 0'),
  synth: lines('&voice from', '&voice s=saw loop=C3 lpf=900'),
  player: lines('&player from (&voice, &level) &part', '&voice from synth', '&level map=amp .8', '&out play=&part level=&level &voice', '&player map=role &out'),
  drummer: lines('&drums from &lines', '&bd, &sd from gm_kit', '&kit &bd &sd', '&out play=&lines &kit', '&drums map=role &out'),
  bell: lines('&key, &bell from &tonic', '&key scale(ionian, &tonic) step=1m*7', '&bell step=&key:pulse 0 0'),
  leaky: lines('&line from', '&line over=&key step=4n 0 2'),
  groove: lines('&beat from', '&beat step=8n &bd &sd:0:.6 [&bd, &hh]'),
};
const resolve: Resolve = (id) => LIB[id] ?? resolveSeed(id);
const compiled = (text: string) => compileSource(text, undefined, { resolve });
const messages = (text: string) => compiled(text).diagnostics.map((d) => d.message);
const errors = (text: string) =>
  compiled(text)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);
/** What the expansion adds to a text: the lines its uses gave. */
const added = (text: string) => expansion(text, { resolve }).text.split('\n').slice(text.split('\n').length);
/** Every event of a text's first seconds: time, length, pitch, voice. */
const events = (text: string, seconds = 4) => {
  const r = compiled(text);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => d.message).join('; '));
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, seconds).map((e) => [+e.at.toFixed(9), +e.dur.toFixed(9), +e.freq.toFixed(6), e.voice]);
};
const METER = '&bar meter("4/4") step=120bpm';
const TUNE = lines('&tune over=&key step=8n 0 1 2 3 4 5 6 7', '&v s=sine loop=C4', '&out [&tune * &v]');

describe('the forms', () => {
  it('a use: the names, the head’s attributes, the id, the named arguments, the main argument', () => {
    expect(readFrom('&key label="my key" from harmonic_minor(tonic=&t, mode=free(major)) label="the tonic" D')).toEqual({
      kind: 'use',
      id: 'harmonic_minor',
      names: ['&key'],
      head: ['label="my key"'],
      args: [
        { name: 'tonic', value: '&t' },
        { name: 'mode', value: 'free(major)' },
      ],
      main: 'label="the tonic" D',
    });
    expect(readFrom('&bd, &sd from gm_kit')).toEqual({ kind: 'use', id: 'gm_kit', names: ['&bd', '&sd'], head: [], args: null, main: null });
    expect(readFrom('* from "harmonic minor"')).toEqual({ kind: 'use', id: 'harmonic minor', names: null, head: [], args: null, main: null });
    expect(readFrom('&bar from swung (swing=8n:.6) &tempo')).toMatchObject({ args: [{ name: 'swing', value: '8n:.6' }], main: '&tempo' });
  });

  it('a signature: the heads, the optional parameters, the main one', () => {
    expect(readFrom('&bar from (&swing) &tempo')).toEqual({ kind: 'signature', names: ['&bar'], optional: ['&swing'], main: '&tempo' });
    expect(readFrom('&key from &tonic')).toEqual({ kind: 'signature', names: ['&key'], optional: [], main: '&tonic' });
    expect(readFrom('&voice from')).toEqual({ kind: 'signature', names: ['&voice'], optional: [], main: null });
    expect(readFrom('&key, &bell from (&a, &b)')).toEqual({ kind: 'signature', names: ['&key', '&bell'], optional: ['&a', '&b'], main: null });
  });

  it('not a from line: a cell, a use line, from inside quotes', () => {
    for (const code of ['&key scale(dorian, D)', 'use &bd from gm_kit', '&n label="taken from the kit" 0']) expect(readFrom(code)).toBeUndefined();
  });

  it('a malformed one is null, and the parser says what a from line is', () => {
    for (const code of ['&a 0 1 from x', '* label="x" from x', '&a from x(y)', '&a from x(y=1, y=2)', '&a from (0) &b', '&a from &b &c', '&a from x"y"'])
      expect(readFrom(code), code).toBeNull();
    expect(parse('&a 0 1 from x').diagnostics.map((d) => d.message)[0]).toMatch(/^A from line says where its cells come from/);
  });

  it('a from line declares no cell of the text’s own, and a signature none at all', () => {
    expect(parse(lines('&key from dorian D', '&a 0')).cells.map((c) => c.name)).toEqual(['a']);
    expect(parse(lines('&key from &tonic', '&key scale(dorian, &tonic)')).cells.flatMap((c) => (c.lambda ? [] : [c.name]))).toEqual(['key']);
    expect(parse('&key from dorian D').uses).toEqual([{ id: 'dorian', names: ['&key'], span: { line: 1, col: 1, len: 18 } }]);
  });
});

describe('a copy of a template', () => {
  it('plays what the template written out with its argument plays', () => {
    expect(messages(lines('&key from dorian D', METER, TUNE))).toEqual([]);
    expect(events(lines('&key from dorian D', METER, TUNE))).toEqual(events(lines('&key scale(dorian, D)', METER, TUNE)));
  });

  it('its head takes the line’s name, and every other name it defines is its own', () => {
    expect(added('&scale from diatonic(mode=minor) A')).toEqual(['&scale scale(&scale_mode, &scale_tonic)', '&scale_mode minor', '&scale_tonic A']);
  });

  it('is a copy: one template twice, and a chain of copies, each its own (the bound: two keys, two walking basses)', () => {
    const text = lines(
      METER,
      '&keyA from dorian D',
      '&keyB from dorian A',
      '&hA from vamp &keyA',
      '&hB from vamp &keyB',
      '&wA from walk &hA',
      '&wB from walk &hB',
      '&v s=sine loop=C3',
      '&out [&wA * &v, &wB * &v]',
    );
    expect(messages(text)).toEqual([]);
    expect(added(text)).toContain('&wA_next over=&hA[>>] 0');
    expect(added(text)).toContain('&wB_next over=&hB[>>] 0');
    expect(events(text)).toEqual(
      events(
        lines(
          METER,
          '&keyA scale(dorian, D)',
          '&keyB scale(dorian, A)',
          '&hA over=&keyA step=1m [0,2,4] [3,5,7]',
          '&hB over=&keyB step=1m [0,2,4] [3,5,7]',
          '&wA over=&hA step=4n 0 0 0 &na',
          '&na over=&hA[>>] 0',
          '&wB over=&hB step=4n 0 0 0 &nb',
          '&nb over=&hB[>>] 0',
          '&v s=sine loop=C3',
          '&out [&wA * &v, &wB * &v]',
        ),
      ),
    );
  });

  it('a cell of the piece that shares a parameter’s name is not bound to it (the bound: the drone)', () => {
    const drone = lines('&key from dorian D', '&tonic s=tri loop=A3 label="a drone" 7', METER, '&tune over=&key step=8n 0 1 2', '&v s=sine loop=C4', '&out [&tune * &v, &tonic]');
    const keyOn = (text: string) => events(text).filter((e) => e[3] === 'v');
    expect(keyOn(drone)).toEqual(
      keyOn(lines('&key scale(dorian, D)', '&tonic s=tri loop=A3 7', METER, '&tune over=&key step=8n 0 1 2', '&v s=sine loop=C4', '&out [&tune * &v, &tonic]')),
    );
  });

  it('the old use of a template reads its lines as they are, its parameters by name', () => {
    expect(added(lines('use &key from dorian', '&tonic D'))).toEqual(['&key scale(dorian, &tonic)']);
    expect(events(lines('use &key from dorian', '&tonic D', METER, TUNE))).toEqual(events(lines('&key from dorian D', METER, TUNE)));
  });

  it('several heads are taken by their names, those it doesn’t name its own; * takes them all', () => {
    expect(added('&key, &bell from bell D')).toEqual(['&key scale(ionian, &key_tonic) step=1m*7', '&bell step=&key:pulse 0 0', '&key_tonic D']);
    expect(added('&bell from bell D')).toEqual(['&bell_key scale(ionian, &bell_tonic) step=1m*7', '&bell step=&bell_key:pulse 0 0', '&bell_tonic D']);
    expect(added('* from bell D')).toEqual(added('&key, &bell from bell D'));
  });
});

describe('the arguments', () => {
  it('a bare reference is that cell: the piece’s own, its slider kept', () => {
    expect(added(lines('&t D', '&key from dorian &t'))).toEqual(['&key scale(dorian, &t)']);
    expect(added(lines('&tempo step=free(110bpm, 90..130)', '&bar from swung &tempo'))).toEqual(['&bar meter("4/4") step=&tempo swing=&bar_swing', '&bar_swing swing=8n:2/3']);
  });

  it('a literal is the cell the template reads it as: a rate where step= reads it, a swing where swing= does, a note as a tonic', () => {
    expect(added('&bar from swung(swing=8n:.6) 124bpm')).toEqual(['&bar meter("4/4") step=&bar_tempo swing=&bar_swing', '&bar_swing swing=8n:.6', '&bar_tempo step=124bpm']);
    expect(events(lines('&bar from swung 124bpm', '&key scale(major, C)', TUNE))).toEqual(
      events(lines('&bar meter("4/4") step=124bpm swing=8n:2/3', '&key scale(major, C)', TUNE)),
    );
  });

  it('a value inherits its default’s attributes where it sets none; its braid replaces the default’s whole', () => {
    const text = lines(METER, '&a step=8n 0 2 4 7', '&chorus from aaba(b=&a^-3) &a', '&v s=sine loop=C4', '&out [&chorus * &v]');
    expect(added(text)).toEqual(['&chorus step=8n &a &a &chorus_b &a', '&chorus_b step=8n &a^-3']);
    expect(events(text)).toEqual(events(lines(METER, '&a step=8n 0 2 4 7', '&chorus step=8n &a &a &b &a', '&b step=8n &a^-3', '&v s=sine loop=C4', '&out [&chorus * &v]')));
    expect(added(lines('&line step=8n 0', '&p from player(level=.5) &line'))).toContain('&p_level map=amp .5');
  });

  it('the head’s attributes before from override its line’s, the rest inherited; after the id they are the main argument’s', () => {
    expect(added('&key label="my key" from diatonic label="the tonic" free(D)')).toEqual([
      '&key scale(&key_mode, &key_tonic) label="my key"',
      '&key_mode major',
      '&key_tonic label="the tonic" free(D)',
    ]);
    expect(added('&bar step=90bpm from swung &t')).toEqual(['&bar meter("4/4") swing=&bar_swing step=90bpm', '&bar_swing swing=8n:2/3']);
  });

  it('CompileResult.uses holds them, the main one under its parameter’s name', () => {
    expect(compiled(lines('&t step=100bpm', '&bar from swung(swing=8n:.6) &t')).uses).toEqual([
      {
        id: 'swung',
        names: ['&bar'],
        span: { line: 2, col: 1, len: 31 },
        hash: expect.stringMatching(/^e1:/),
        gave: ['&bar', '&bar_swing'],
        overrode: [],
        args: { swing: '8n:.6', tempo: '&t' },
      },
    ]);
  });
});

describe('nesting and collections', () => {
  it('a template’s own from lines are copies too, renamed with it; what it takes from a collection is shared by name', () => {
    const text = lines(METER, '&line step=8n 0 2 4', '&bass from player &line', '&bass2 from player(voice=&mine) &line', '&mine s=tri loop=C2');
    expect(errors(text)).toEqual([]);
    expect(added(text)).toEqual([
      '&bass_level map=amp .8',
      '&bass_out play=&line level=&bass_level &bass_voice',
      '&bass map=role &bass_out',
      '&bass_voice s=saw loop=C3 lpf=900',
      '&bass2_level map=amp .8',
      '&bass2_out play=&line level=&bass2_level &mine',
      '&bass2 map=role &bass2_out',
    ]);
    const drums = lines(METER, '&groove step=8n &bd &sd', '&drums from drummer &groove');
    expect(errors(drums)).toEqual([]);
    expect(added(drums).filter((l) => /^&(bd|sd) /.test(l))).toHaveLength(2);
  });

  it('a collection’s from line is its use: the same lines', () => {
    expect(added('&bd, &sd from gm_kit')).toEqual(added('use &bd, &sd from gm_kit'));
    expect(added('* from gm_kit')).toEqual(added('use * from gm_kit'));
  });

  it('expand writes the copy out, the from line gone', () => {
    expect(expand(lines('&key from dorian D', METER), resolve)).toBe(lines(METER, '&key scale(dorian, &key_tonic)', '&key_tonic D'));
  });
});

describe('what the compiler says', () => {
  it('a template’s main argument missing, a main argument it doesn’t take, a keyword it lacks', () => {
    expect(errors('&key from dorian')).toContain('"dorian" needs its main argument, &tonic, after its id: &key from dorian …');
    expect(errors('&v from synth C')).toContain('"synth" takes no main argument: its signature has none (&voice from )');
    expect(errors('&key from dorian(mode=major) D')).toEqual(['"dorian" takes no mode=: it has no optional parameters']);
    expect(errors('&key from diatonic(tonic=D) D')).toEqual(['"diatonic" takes no tonic=: its optional parameters are mode=']);
  });

  it('a collection takes no arguments, and gives only what it defines', () => {
    expect(errors('&q from gm_kit D')[0]).toBe('"gm_kit" has no signature, so it takes no arguments: a collection gives the cells it defines by name (&q from gm_kit)');
  });

  it('a template that reads a name it neither defines nor declares is an error; a sound read by name is not', () => {
    expect(errors('&y from leaky')).toContain('"leaky"\'s &line reads &key, which it neither defines nor declares: name it in its signature (&line from (&key) …), or define it');
    expect(errors(lines(METER, '&g from groove', '* from gm_kit'))).toEqual([]);
  });

  it('a head the line names that the template doesn’t have, and head attributes over several heads', () => {
    expect(errors(lines(METER, '&key, &x from bell D'))).toEqual(['&x is not a head of "bell": its heads are &key, &bell']);
    expect(errors(lines(METER, '&key, &bell label="k" from bell D'))).toEqual([
      'The attributes before from are the head\'s, and this line takes 2 heads from "bell": write them on each head\'s own line',
    ]);
  });

  it('a signature that names what the template doesn’t define, or a main parameter with a line', () => {
    const broken: Resolve = (id) => ({ a: lines('&x from (&o) &m', '&x 0 &m'), b: lines('&x from &m', '&x 0 &m', '&m 1') })[id] ?? null;
    expect(compileSource('&y from a 3', undefined, { resolve: broken }).diagnostics.map((d) => d.message)).toContain(
      '"a"\'s &o is an optional parameter: its line in the fragment is its default, and it has none',
    );
    expect(compileSource('&y from b 3', undefined, { resolve: broken }).diagnostics.map((d) => d.message)).toContain(
      '"b"\'s &m is its main parameter: it has no line, the argument is it',
    );
  });
});
