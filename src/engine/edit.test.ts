import { describe, expect, it } from 'vitest';
import {
  setFree,
  setAttr,
  addCell,
  attrsOf,
  declLine,
  declWords,
  deleteCell,
  nameProblem,
  renameCell,
  setBraid,
  setOff,
  setShift,
  setTiming,
  splitComment,
  splitToken,
  splitWords,
  usersOf,
} from './edit';
import { compileSource as compileAlone } from './compile';
import { flatten, tapped } from './flatten';
import { codeShifts } from './program';
import { PRESETS } from './presets';
import { resolveSeed } from '../repository/library';
/** As Cell studio compiles an example: its `use` lines read the seed library (#196); a text with none compiles as it would without. */
const compileSource: typeof compileAlone = (text, env, options) => compileAlone(text, env, { resolve: resolveSeed, ...options });

describe('source edits', () => {
  const src = `# a comment &key shift=9
&key shift=0                 # the 12
&scale over=&key scan(2 1 2 2 1 2 2)
&theme over=&scale 0 2 4   // tune
&keys 0`;

  it('finds a declaration by exact name, ignoring comments', () => {
    expect(declLine(src, 'key')).toBe(1);
    expect(declLine(src, 'theme')).toBe(3);
    expect(declLine(src, 'keys')).toBe(4);
    expect(declLine(src, 'nope')).toBe(-1);
  });

  it('sets, replaces and removes shift=, keeping comments in place', () => {
    const a = setShift(src, 'key', 7);
    expect(a.split('\n')[1]).toBe('&key shift=7                 # the 12');
    expect(setShift(a, 'key', 0).split('\n')[1]).toBe('&key                         # the 12');
    expect(setShift(src, 'scale', -2).split('\n')[2]).toBe('&scale shift=-2 over=&key scan(2 1 2 2 1 2 2)');
    expect(setShift(src, 'theme', 3).split('\n')[3]).toBe('&theme shift=3 over=&scale 0 2 4 // tune'); // longer line: comment moves right
    expect(setShift(src, 'keys', 1).split('\n')[1]).toBe('&key shift=0                 # the 12'); // &key untouched
    expect(setShift(src, 'nope', 1)).toBe(src);
  });

  it('leaves a circle whose argument is no turn written there (fifths(free(G))) as it is', () => {
    expect(setShift('&c fifths(free(G))', 'c', 2)).toBe('&c fifths(free(G))');
  });

  it('writes no turn on a section: one step, stepped as its table is, a turn changes nothing', () => {
    const src = '&bar step=1\n&sections step=&bar &keysBar &tuneBar\n&song over=&sections step=&bar/4 0 1\n&keys step=&keysBar 0 2\n&tune step=&tuneBar 4';
    expect(setShift(src, 'keysBar', 1)).toBe(src);
    // (a section's own line of attributes gets none either; one it already has can be taken back)
    const off = src.replace('&song', '&keysBar off\n&song');
    expect(setShift(off, 'keysBar', 1)).toBe(off);
    expect(setShift(off.replace('&keysBar off', '&keysBar off shift=1'), 'keysBar', 0)).toBe(off);
  });

  it('turns a circle of fifths by its own argument: by name if it was written by name (shift= alongside is an error)', () => {
    expect(setShift('&c fifths(G)', 'c', 2)).toBe('&c fifths(D)');
    expect(setShift('&c fifths(G)', 'c', 0)).toBe('&c fifths(C)');
    expect(setShift('&c fifths(1)', 'c', -1)).toBe('&c fifths(-1)');
    expect(setShift('&c fifths(1)', 'c', 0)).toBe('&c fifths()');
    expect(setShift('&c fifths()', 'c', 3)).toBe('&c fifths(3)');
    // (written with shift= beside fifths(): that shift= is turned)
    expect(setShift('&c shift=1 fifths()', 'c', 2)).toBe('&c shift=2 fifths()');
    // and what it writes compiles, turned as asked: [0] is the note it starts on
    for (const [n, first] of [
      [2, 2], // D
      [0, 0], // C
      [5, 11], // B
    ] as const) {
      const r = compileSource(setShift('&c fifths(G)', 'c', n) + '\n&x step=1 &c[0]');
      expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(flatten(r, 'x', codeShifts(r)).map((e) => tapped(r, e, codeShifts(r)).value)).toEqual([first]);
    }
  });

  it('toggles off without touching anything else', () => {
    const a = setOff(src, 'scale', true);
    expect(a.split('\n')[2]).toBe('&scale off over=&key scan(2 1 2 2 1 2 2)');
    expect(setOff(a, 'scale', true)).toBe(a);
    expect(setOff(a, 'scale', false)).toBe(src);
  });

  it('a section without a line of its own gets one under its table, and loses it when it says nothing (decision 016)', () => {
    const song = PRESETS.pop.source;
    const off = setOff(song, 'hookBar', true);
    const lines = off.split('\n');
    expect(lines[lines.findIndex((l) => l.startsWith('&sections ')) + 1]).toBe('&hookBar off');
    expect(compileSource(off).off.has('cell:hookBar')).toBe(true);
    expect(compileSource(off).diagnostics).toEqual([]);
    expect(setOff(off, 'hookBar', false)).toBe(song);
    expect(setAttr(song, 'hookBar', 'label', '"the hook"')).toMatch(/^&hookBar label="the hook"$/m);
    // (not a section, not a cell: nothing to edit)
    expect(setOff(song, 'nowhere', true)).toBe(song);
    // a section's sheet turning it (it has nothing to turn): still a section, nothing wrong
    expect(compileSource(setShift(song, 'hookBar', 3)).diagnostics).toEqual([]);
    // a CRLF file stays CRLF, and comes back as it was
    const crlf = song.replace(/\n/g, '\r\n');
    const crlfOff = setOff(crlf, 'hookBar', true);
    expect(crlfOff.split('\n').every((l, i, all) => i === all.length - 1 || l.endsWith('\r'))).toBe(true);
    expect(setOff(crlfOff, 'hookBar', false)).toBe(crlf);
  });

  it('round-trips through the compiler: what the graph sets is what the code says', () => {
    const base = PRESETS.royal.source;
    const r = compileSource(setOff(setShift(base, 'key', 5), 'theme', true));
    expect(r.ok).toBe(true);
    expect(r.cells.get('key')!.shift).toBe(5);
    expect(r.off.has('cell:theme')).toBe(true);
    expect(compileSource(setOff(setShift(setShift(base, 'key', 5), 'key', 0), 'theme', false).replace(/\s+$/gm, '')).cells.get('key')!.shift).toBe(0);
  });

  it('splitComment leaves a quoted # or // alone, and setBraid keeps the label', () => {
    expect(splitComment('&m label="Intro # 1" 0 2 # c')).toEqual(['&m label="Intro # 1" 0 2 ', '# c']);
    expect(splitComment('&m label="a // b" 0')).toEqual(['&m label="a // b" 0', '']);
    expect(setBraid('&m step=4 label="Intro # 1" 0 2 4', 'm', ['0', '2', '5'])).toBe('&m step=4 label="Intro # 1" 0 2 5');
  });
  it('splitComment knows # from a sharp', () => {
    expect(splitComment('&a 6# 7 # comment')).toEqual(['&a 6# 7 ', '# comment']);
    expect(splitComment('&a 0 // x # y')).toEqual(['&a 0 ', '// x # y']);
  });
});

describe('editor operations', () => {
  const src = `&bar scan(27 23 26 24) step=84bpm      # the clock
&theme over=scale(0,2) step=&bar 0@2 [0, 4, 7] &m[<<] ~   // tune
&mix [&theme * &lead,
      &pedal * &bass]
&lead s=saw loop=261.63 off`;

  it('splits words outside brackets', () => {
    expect(splitWords('&a [0, 4, 7] over=scale(0, 2) &b[1:3]')).toEqual(['&a', '[0, 4, 7]', 'over=scale(0, 2)', '&b[1:3]']);
  });

  it('reads a declaration: head, attributes, braid', () => {
    expect(declWords(src, 'theme')).toEqual({
      head: ['&theme'],
      attrs: ['over=scale(0,2)', 'step=&bar'],
      braid: ['0@2', '[0, 4, 7]', '&m[<<]', '~'],
    });
    expect([...attrsOf(src, 'lead')]).toEqual([
      ['s', 'saw'],
      ['loop', '261.63'],
      ['off', ''],
    ]);
  });

  it('replaces a braid, keeping attributes and the comment', () => {
    const a = setBraid(src, 'theme', ['0', '2', '&m']);
    expect(a.split('\n')[1]).toMatch(/^&theme over=scale\(0,2\) step=&bar 0 2 &m\s+\/\/ tune$/);
    expect(a.split('\n')[1].indexOf('//')).toBe(src.split('\n')[1].indexOf('//')); // the comment keeps its column
    expect(compileSource(setBraid(src, 'theme', ['0', '2', '4'])).cells.get('theme')!.units).toHaveLength(3);
    expect(setBraid(src, 'theme', []).split('\n')[1]).toMatch(/^&theme over=scale\(0,2\) step=&bar\s+\/\/ tune$/);
    expect(setBraid(src, 'mix', ['0'])).toBe(src); // a mix over several lines is left alone
  });

  it('keeps a CRLF file’s line endings, with or without a comment', () => {
    const crlf = '&bar scan(1 1) step=90bpm\r\n&tune step=&bar 0 2 4\r\n&low step=&bar 0 # a pedal\r\n&last step=&bar 1';
    const a = setBraid(crlf, 'tune', ['0', '2', '4', '7']);
    expect(a).toBe('&bar scan(1 1) step=90bpm\r\n&tune step=&bar 0 2 4 7\r\n&low step=&bar 0 # a pedal\r\n&last step=&bar 1');
    expect(setBraid(crlf, 'low', ['5'])).toBe('&bar scan(1 1) step=90bpm\r\n&tune step=&bar 0 2 4\r\n&low step=&bar 5 # a pedal\r\n&last step=&bar 1');
    expect(setBraid(crlf, 'last', ['2'])).toBe(crlf.replace(/1$/, '2'));
    expect(setAttr(crlf, 'tune', 'label', '"t"').split('\n')[1]).toBe('&tune label="t" step=&bar 0 2 4\r');
  });

  it('writes a template copy’s attribute on its head, before from, never as a second definition (decision 065)', () => {
    // (`&call step=8n &gypsy` looks like a table of sections naming &gypsy: a from line that takes it says it is none)
    const piece = '&gypsy from gypsy &key // the call\r\n&call step=8n &gypsy';
    const shown = setAttr(piece, 'gypsy', 'show', 'braid');
    expect(shown).toBe('&gypsy show=braid from gypsy &key // the call\r\n&call step=8n &gypsy');
    expect(setAttr(shown, 'gypsy', 'show', 'pattern')).toBe(shown.replace('braid', 'pattern'));
    expect(setAttr(shown, 'gypsy', 'show', null)).toBe(piece);
    // (the main argument's attributes, after the id, are its own)
    expect(setAttr('&key from major label="the tonic" free(D)', 'key', 'label', '"k"')).toBe('&key label="k" from major label="the tonic" free(D)');
    // (several heads, or no arguments, maybe a collection: no head of its own to write on, so nothing is written)
    for (const taken of ['&bd, &sd from gm_kit\n&k step=8n &bd', '&bd from gm_kit\n&k step=8n &bd']) expect(setAttr(taken, 'bd', 'show', 'braid')).toBe(taken);
    // (a piece from the library: shown, it says what it said before)
    const swing = PRESETS.electroswing!.source;
    const said = (text: string) => compileSource(text).diagnostics.map((d) => d.message);
    expect(said(setAttr(swing, 'gypsy', 'show', 'braid'))).toEqual(said(swing));
    // (a flag is no attribute: a head before from takes only key=value)
    expect(setOff(piece, 'gypsy', true)).toBe(piece);
  });

  it('step and loop are one setting', () => {
    const a = setTiming(src, 'lead', 'step', '440');
    expect(attrsOf(a, 'lead').get('step')).toBe('440');
    expect(attrsOf(a, 'lead').has('loop')).toBe(false);
  });

  it('deletes a cell, continuation lines included, and knows who used it', () => {
    expect(usersOf(src, 'theme')).toEqual(['mix']);
    expect(usersOf(src, 'bar')).toEqual(['theme']);
    const a = deleteCell(src, 'mix');
    expect(a.split('\n')).toHaveLength(3);
    expect(a).not.toMatch(/pedal/);
    expect(deleteCell(src, 'nope')).toBe(src);
  });

  it('adds a blank (chromatic) cell with a fresh name', () => {
    const a = addCell(src);
    expect(a.name).toBe('cell1');
    expect(addCell(a.source).name).toBe('cell2');
    const r = compileSource(a.source);
    expect(r.cells.get('cell1')).toMatchObject({ braid: 'blank', steps: 12 });
  });
});

describe('renaming and splitting', () => {
  const src = `&theme over=scale(0,2) step=&bar 0 2 &m[<<] # &theme stays in comments
&themes 1 2
&mix [&theme * &lead]
&tune &theme &themes`;
  it('renames a cell and every reference, not look-alikes or comments', () => {
    const a = renameCell(src, 'theme', 'royal');
    expect(a).toBe(`&royal over=scale(0,2) step=&bar 0 2 &m[<<] # &theme stays in comments
&themes 1 2
&mix [&royal * &lead]
&tune &royal &themes`);
    expect(renameCell(src, 'theme', 'themes')).toBe(src); // taken
    expect(renameCell(src, 'theme', '9x')).toBe(src); // invalid
  });
  it('says why a name won’t do', () => {
    expect(nameProblem(src, 'themes', 'theme')).toMatch(/already exists/);
    expect(nameProblem(src, 'a b')).toMatch(/Letters/);
    expect(nameProblem(src, 'theme', 'theme')).toBeNull();
  });
  it('splits a token: shares an elongation, else doubles', () => {
    expect(splitToken('4@2')).toEqual(['4', '4']);
    expect(splitToken('4@3')).toEqual(['4', '4@2']);
    expect(splitToken('&m[<<]')).toEqual(['&m[<<]', '&m[<<]']);
  });
});

describe('attributes with parentheses', () => {
  it('replaces or removes a value like free(0, 0..6) whole', () => {
    const src = '&s scan(2 2 1 2 2 2 1) shift=free(0, 0..6) step=cycle(&key)/2   # modes';
    const code = (t: string) => t.replace(/\s*#.*$/, '');
    expect(code(setAttr(src, 's', 'shift', '3'))).toBe('&s scan(2 2 1 2 2 2 1) shift=3 step=cycle(&key)/2');
    expect(code(setAttr(src, 's', 'step', null))).toBe('&s scan(2 2 1 2 2 2 1) shift=free(0, 0..6)');
    expect(setAttr(src, 's', 'shift', '3').indexOf('#')).toBe(src.indexOf('#')); // the comment keeps its column
  });
});

describe('quoted labels in edits', () => {
  it('a label is one word; setting it replaces it whole', () => {
    expect(splitWords('&key label="key: **{tonic}** [x]" shift=2 0 1')).toEqual(['&key', 'label="key: **{tonic}** [x]"', 'shift=2', '0', '1']);
    expect(setAttr('&key label="a b c" shift=2', 'key', 'label', '"d e"')).toBe('&key label="d e" shift=2');
    expect(setAttr('&key label="a b c" shift=2', 'key', 'label', null)).toBe('&key shift=2');
  });
});

describe('a free pitch class by name', () => {
  it('writes back by name: free(D) turned to E is free(E)', () => {
    const src = '&key shift=free(D)\n&t over=&key 0';
    const spec = compileSource(src).cells.get('key')!.frees[0];
    expect(setFree(src, spec, 4)).toBe('&key shift=free(E)\n&t over=&key 0');
  });
});
