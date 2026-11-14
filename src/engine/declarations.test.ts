// A declaration's attributes as the compile reads them (decision 089), a cell's set of styles and a style point's reach.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { parse } from './parser';
import { bodyOf, signatureOf } from './use';

const errors = (text: string) =>
  compileSource(text)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);

describe('a declaration, compiled to nothing (decision 089)', () => {
  it('takes style= and facet= and the template’s optional parameters on a signature, and leaves the body as it is', () => {
    const t = '&key from (&mode) &tonic style=(&funk | &techno * .5) mode=dorian facet=mode\n&key scale(&mode, &tonic)\n&mode major';
    expect(signatureOf(t)).toMatchObject({ names: ['&key'], optional: ['&mode'], main: '&tonic', attributes: ['style=(&funk | &techno * .5)', 'mode=dorian', 'facet=mode'] });
    expect(bodyOf(t)).toBe('&key scale(&mode, &tonic)\n&mode major');
    expect(errors(t).filter((m) => /declaration|optional parameter/.test(m))).toEqual([]);
  });

  it('says an attribute that is no optional parameter is an error, naming those it has', () => {
    expect(errors('&key from (&mode) &tonic tempo=3\n&key 0')).toEqual([
      "tempo= is no optional parameter of this template: a declaration's arguments are its optional parameters (mode=), beside style= and facet=",
    ]);
  });

  it('reads a collection’s `* from` with no id as its declaration: style= and facet= alone', () => {
    expect(errors('* from style=&funk facet=rhythm\n&x 0')).toEqual([]);
    expect(errors('* from style=&funk mode=x\n&x 0')).toEqual(["mode=: a collection's declaration says where it is found, style= and facet= (decision 089)"]);
    expect(bodyOf('* from style=&funk\n&x 0')).toBe('&x 0');
  });
});

const STYLES = '&funk map=style sync=1 harm=.12 bite=.85 mood=.65\n&bossa map=style sync=.75 harm=.85 bite=.45 mood=.9\n';

describe('a set of styles on a cell (decision 089 §7)', () => {
  it('compiles, each style read', () => {
    expect(errors(`${STYLES}&x style=(&funk | &bossa * .5) 0 1`)).toEqual([]);
    expect(errors(`${STYLES}&x style=(&funk | &disco) 0 1`).some((m) => /disco/.test(m))).toBe(true);
  });

  it('has no one value: the section’s &style of a set, and a pick of one, are errors', () => {
    expect(errors(`${STYLES}&style style=(&funk | &bossa)`)).toEqual([
      "&style style=( … | … ): the section's style is one point, not a set (a set says where a cell belongs: &style style=&funk)",
    ]);
    expect(errors(`${STYLES}&x style=(&funk | &bossa)\n&v s=saw loop=C3 lpf=200..2000 * &x[bite]`)).toEqual(['&x[bite]: a set has no one value: pick from one of its styles']);
  });
});

describe('a style point’s reach on an axis (decision 089 §6)', () => {
  it('is centre ± reach with no cell moving it: its value the centre, its reach kept', () => {
    const cell = parse('&mine map=style sync=.3 harm=.45 bite=.55 ± .1 mood=.5').cells[0]!;
    expect(cell.reach).toEqual({ bite: 0.1 });
    expect(cell.braid.kind === 'list' && cell.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : null))).toEqual([0.3, 0.45, 0.55, 0.5]);
    expect(errors('&mine map=style sync=.3 harm=.45 bite=.55 ± .1 mood=.5\n&v s=saw loop=C3 lpf=200..2000 * &mine[bite]')).toEqual([]);
  });

  it('with a cell moving it stays decision 079’s window, a moving axis, no reach', () => {
    const cell = parse('&walk map=lin step=1m 0 1\n&mine map=style sync=.3 harm=.45 bite=.55 ± .1 * &walk mood=.5').cells[1]!;
    expect(cell.reach).toBeUndefined();
    expect(cell.paramCells?.bite?.range).toEqual([0.45, 0.65]);
  });
});
