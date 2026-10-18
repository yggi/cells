import { describe, expect, it } from 'vitest';
import { cellsOf, structureOf, textOf } from './structure';

const at = (text: string, name: string) => cellsOf(text, { asWritten: true }).find((c) => c.name === name)!;

describe("tools/structure.ts: decision 049's measure (leaves, attribute values, cells; names and comments free)", () => {
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
  it('BWV 847 by hand is more compact by structure than the text the generator wrote (#177)', () => {
    const generated = structureOf(textOf('fixtures/bwv847-generated.cells'));
    const byHand = structureOf(textOf('example:bwv847'));
    expect(byHand.total).toBeLessThan(generated.total * 0.85);
    expect(byHand.leaves).toBeLessThan(generated.leaves);
  });
});
