import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { structureByCell, structureOf } from './measure';
import { PRESETS } from './presets';

const at = (text: string, name: string) => structureByCell(text, { asWritten: true }).find((c) => c.name === name)!;

describe("the structure measure: decision 049's (leaves, attribute values, cells; names and comments free)", () => {
  it('a leaf is a step as written: x!n and x@n one, a chord its entries, a reference one, a subsequence its leaves', () => {
    expect(at('&t 0 2@2 4!3 [0,4,7] ~ &m^$7 [0 2]', 't').leaves).toBe(1 + 1 + 1 + 3 + 1 + 1 + 2);
    expect(at('&bar scan(1!432 .72!96 2) step=120bpm', 'bar')).toMatchObject({ leaves: 3, attributes: 1, total: 5 });
  });
  it('an attribute value is one, a flag too; how a cell is shown or named costs nothing', () => {
    expect(at('&v s=saw loop=C4 lpf=800 oneshot', 'v').attributes).toBe(4);
    expect(at('&t label="a tune" tags="lead" show=notes step=4n 0 2', 't')).toMatchObject({ attributes: 1, leaves: 2, total: 4 });
  });
  it('a copy is measured as written, its base= one attribute value', () => {
    const text = '&subject 12 11 12@2 7@2 8@2\n&answer base=&subject^$7 =!3 12@2';
    expect(at(text, 'answer')).toMatchObject({ leaves: 2, attributes: 1, total: 4 });
    expect(at(text, 'subject').leaves).toBe(5);
  });
  it('a note costs nothing; renaming, comments and labels change nothing', () => {
    const a = '&piece label="A piece." about=&out\n&tune step=4n 0 2 4\n&lead s=sine loop=C4\n&out map=sample [&tune * &lead]';
    const b = '# a comment\n&tune2 label="the tune" step=4n 0 2 4   # its notes\n&voice s=sine loop=C4\n&out map=sample [&tune2 * &voice]';
    expect(structureOf(a)).toEqual(structureOf(b));
    expect(structureOf(a)).toEqual({ cells: 3, leaves: 3 + 0 + 2, attributes: 1 + 2 + 1, total: 3 + 5 + 4 });
  });
  it('is taken over the normal form: an alias and ours measure the same', () => {
    const piece = (lpf: string) => `&bar meter("4/4") step=120bpm\n&tune step=8n 0 2\n&v s=saw loop=C4 ${lpf}\n&out map=sample [&tune * &v]`;
    expect(structureOf(piece('cutoff=800'))).toEqual(structureOf(piece('lpf=800')));
  });
  it('BWV 847: the generator wrote 1,396, by hand 1,113 (#181, #182; its vibrato and its envelopes the library’s since #196)', () => {
    expect(structureOf(readFileSync('fixtures/bwv847-generated.cells', 'utf8')).total).toBe(1396);
    expect(structureOf(PRESETS.bwv847!.source).total).toBe(1113);
  });
});
