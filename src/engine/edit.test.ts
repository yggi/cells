import { describe, expect, it } from 'vitest';
import {
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
import { compileSource } from './compile';
import { PRESETS } from './presets';

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

  it('toggles off without touching anything else', () => {
    const a = setOff(src, 'scale', true);
    expect(a.split('\n')[2]).toBe('&scale off over=&key scan(2 1 2 2 1 2 2)');
    expect(setOff(a, 'scale', true)).toBe(a);
    expect(setOff(a, 'scale', false)).toBe(src);
  });

  it('round-trips through the compiler: what the graph sets is what the code says', () => {
    const base = PRESETS.royal.source;
    const r = compileSource(setOff(setShift(base, 'key', 5), 'theme', true));
    expect(r.ok).toBe(true);
    expect(r.cells.get('key')!.shift).toBe(5);
    expect(r.off.has('cell:theme')).toBe(true);
    expect(compileSource(setOff(setShift(setShift(base, 'key', 5), 'key', 0), 'theme', false).replace(/\s+$/gm, '')).cells.get('key')!.shift).toBe(0);
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
    const src = '&s scan(2 2 1 2 2 2 1) shift=free(0, 0..6) step=cycle(&key)*2   # modes';
    const code = (t: string) => t.replace(/\s*#.*$/, '');
    expect(code(setAttr(src, 's', 'shift', '3'))).toBe('&s scan(2 2 1 2 2 2 1) shift=3 step=cycle(&key)*2');
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
