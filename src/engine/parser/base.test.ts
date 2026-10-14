import { describe, expect, it } from 'vitest';
import { parse } from '.';
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import type { CellDecl } from '../ast';

const cell = (source: string, name: string): CellDecl => parse(source).cells.find((c) => c.name === name)!;
/** A braid's steps as written back: value (or ~), and its hold. */
const steps = (c: CellDecl) =>
  c.braid.kind === 'list'
    ? c.braid.tokens.map((t) => {
        const a = t.atom;
        const v = a.kind === 'note' ? String(a.value) : a.kind === 'rest' ? '~' : a.kind === 'chord' ? `[${a.notes.join(',')}]` : a.kind === 'ref' ? `&${a.name}` : a.kind;
        return `${v}${t.elongate > 1 ? `@${t.elongate}` : ''}${t.repeat > 1 ? `!${t.repeat}` : ''}`;
      })
    : [];
/** What a piece plays: each note's start (s), length and semitones from C4. */
function plays(source: string, cells?: string[]) {
  const r = compileSource(source);
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, 30)
    .filter((e) => !cells || cells.includes(e.voice))
    .map((e) => `${e.at.toFixed(3)} ${e.dur.toFixed(3)} ${Math.round(12 * Math.log2(e.freq / 261.6256))}`)
    .sort();
}

describe('base=: a cell as a copy of another, changed where it says', () => {
  const SUBJECT = '&subject 12 11 12@2 7@2 8@2 12 11 12@2 14@2 7@2';

  it('nothing written: the base as it is', () => {
    expect(steps(cell(`${SUBJECT}\n&copy base=&subject`, 'copy'))).toEqual(steps(cell(SUBJECT, 'subject')));
  });

  it('= keeps a step, a value replaces it, =@n holds the base’s pitch, past the end is added', () => {
    const c = cell(`${SUBJECT}\n&v base=&subject = 10 =@4 =!7 5 3`, 'v');
    expect(steps(c)).toEqual(['12', '10', '12@4', '7@2', '8@2', '12', '11', '12@2', '14@2', '7@2', '5', '3']);
  });

  it('a run in the base counts as its steps', () => {
    expect(steps(cell('&a 0!3 4\n&b base=&a = 2 = =', 'b'))).toEqual(['0', '2', '0', '4']);
  });

  it('transposed: ^$n moves what it keeps n semitones; what it writes is as it sounds', () => {
    // (the answer in BWV 847: the subject a fifth up, its fourth step a tonal answer)
    expect(steps(cell(`${SUBJECT}\n&answer base=&subject^$7 =!3 12@2`, 'answer'))).toEqual(['19', '18', '19@2', '12@2', '15@2', '19', '18', '19@2', '21@2', '14@2']);
  });

  it('^n moves what it keeps n steps of its table (a degree), and the cell reads the base’s table', () => {
    const src = '&major scan(2 2 1 2 2 2 1)\n&tune over=&major step=4 0 2 4\n&up base=&tune^1';
    const c = cell(src, 'up');
    expect(steps(c)).toEqual(['1', '3', '5']);
    expect(c.over?.name).toBe('major');
    expect(c.step).toEqual(cell(src, 'tune').step);
  });

  it('takes the base’s attributes where it sets none, and keeps its own label', () => {
    const c = cell('&lead s=saw lpf=800 loop=C4 label="lead"\n&lead2 base=&lead lpf=2000 label="brighter"', 'lead2');
    expect(c.params).toMatchObject({ s: 'saw', lpf: 2000 });
    expect(c.label).toBe('brighter');
  });

  it('a base of a base works', () => {
    expect(steps(cell('&a 0 2 4\n&b base=&a = 3\n&c base=&b = = 7', 'c'))).toEqual(['0', '3', '7']);
  });

  it('says what it can’t do', () => {
    const errors = (src: string) => [...parse(src).diagnostics, ...compileSource(src).diagnostics].map((d) => d.message).join(' | ');
    expect(errors('&a base=&b 0\n&b base=&a 1')).toMatch(/comes round to &/);
    expect(errors('&a 0 = 2')).toMatch(/= keeps a step of the base/);
    expect(errors('&a 0 2\n&b base=&a = = =')).toMatch(/= past the end of &a/);
    expect(errors('&major scan(2 2 1 2 2 2 1)\n&t over=&major 0 2\n&u base=&t^$1')).toMatch(/by its degrees \(\^n\)/);
    expect(errors('&u base=&nope =')).toMatch(/Unknown cell &nope/);
  });

  it('plays as the cell written out: BWV 847’s answer and its last entry', () => {
    const head = '&bar scan(1!64) step=89bpm beat=4 laps=1\n&v s=tri loop=C4';
    const subject = '&subject 12 11 12@2 7@2 8@2 12 11 12@2 14@2 7@2 12 11 12@2 14@2 5 7 8@4 7 5 3';
    const written = '&answer step=&bar 19 18 19@2 12@2 15@2 19 18 19@2 21@2 14@2 19 18 19@2 21@2 12 14 15@4 14 12 10@2';
    const overdub = '&answer step=&bar base=&subject^$7 =!3 12@2 =!15 10@2';
    const out = '&out map=sample [&answer * &v]';
    expect(plays([head, subject, overdub, out].join('\n'))).toEqual(plays([head, subject, written, out].join('\n')));
  });
});

describe("_: the step before it, one step longer (Strudel's elongation, decision 027)", () => {
  it('0 _ _ is 0@3, inside a subsequence too, and on top of a hold', () => {
    expect(steps(cell('&a 0 _ _ 2', 'a'))).toEqual(['0@3', '2']);
    expect(steps(cell('&a 0@2 _ 2', 'a'))).toEqual(['0@3', '2']);
    expect(steps(cell('&a &b _ 2\n&b 4', 'a'))).toEqual(['&b@2', '2']);
    const sub = cell('&a [0 _ 2] 4', 'a').braid;
    expect(sub.kind === 'list' && sub.tokens[0]!.atom.kind === 'seq' && sub.tokens[0]!.atom.layers[0]!.map((t) => t.elongate)).toEqual([2, 1]);
  });
  it('plays as the hold it stands for', () => {
    const tail = '\n&v s=tri loop=C4\n&out map=sample [&t * &v]';
    expect(plays(`&t step=2 0 _ _ 2${tail}`)).toEqual(plays(`&t step=2 0@3 2${tail}`));
  });
  it('says what it can’t do', () => {
    const errors = (src: string) =>
      compileSource(src)
        .diagnostics.map((d) => d.message)
        .join(' | ');
    expect(errors('&a _ 2')).toMatch(/_ lengthens the step before it/);
    expect(errors('&a 0!2 _')).toMatch(/_ after x!n/);
    expect(errors('&a 0 _@2')).toMatch(/takes no modifiers/);
  });
});
