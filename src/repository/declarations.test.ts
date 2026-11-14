// A fragment's association read from its text (decision 089): its declaration lines.
import { describe, expect, it } from 'vitest';
import { associationOf, isDeclaration, readDeclaration, withoutDeclarations } from './declarations';

const FUNK = { sync: 1, harm: 0.12, bite: 0.85, mood: 0.65 };
const TECHNO = { sync: 0.12, harm: 0, bite: 1, mood: 0.4 };
const styles = new Map([
  ['funk', FUNK],
  ['techno', TECHNO],
]);
const read = (code: string, template = true, facet?: string) => readDeclaration(code, { styles, template, ...(facet ? { facet } : {}) });

describe('a declaration line (decision 089)', () => {
  it('is a signature or a collection’s `* from` with no id, never a take', () => {
    expect(isDeclaration('&key from (&mode) &tonic style=&funk mode=dorian')).toBe(true);
    expect(isDeclaration('&key from &tonic')).toBe(true);
    expect(isDeclaration('* from style=&funk')).toBe(true);
    expect(isDeclaration('* from')).toBe(true);
    expect(isDeclaration('&bd from gm_kit')).toBe(false);
    expect(isDeclaration('* from gm_kit')).toBe(false);
    expect(isDeclaration('&bd s=sine')).toBe(false);
  });

  it('reads a named style, its weight, and a set found at each', () => {
    expect(read('* from style=&funk', false)!.points).toEqual([{ point: FUNK, weight: 1 }]);
    expect(read('* from style=&funk * .5', false)!.points).toEqual([{ point: FUNK, weight: 0.5 }]);
    expect(read('* from style=(&funk | &techno * .25)', false)!.points).toEqual([
      { point: FUNK, weight: 1 },
      { point: TECHNO, weight: 0.25 },
    ]);
  });

  it('reads an inline point by name, partial (decision 041) or in order, and keeps a reach, centre ± reach (§6)', () => {
    expect(read('* from style=&(map=style sync=.3 harm=.45)', false)!.points).toEqual([{ point: { sync: 0.3, harm: 0.45 }, weight: 1 }]);
    expect(read('* from style=&(map=style .3 .45 .55 .5)', false)!.points).toEqual([{ point: { sync: 0.3, harm: 0.45, bite: 0.55, mood: 0.5 }, weight: 1 }]);
    expect(read('* from style=&(map=style sync=.3 bite=.55 ± .1)', false)!.points).toEqual([{ point: { sync: 0.3, bite: 0.55 }, weight: 1, reach: { bite: 0.1 } }]);
    expect(read('* from style=&(map=style bite=.55 +- .1)', false)!.points[0]!.reach).toEqual({ bite: 0.1 });
  });

  it('takes the folder’s facet, or facet= where it differs, and a template’s arguments', () => {
    expect(read('&key from (&mode) &tonic style=&funk mode=dorian', true, 'mode')!.points).toEqual([{ point: FUNK, weight: 1, facet: 'mode', args: { mode: 'dorian' } }]);
    expect(read('&key from &tonic style=&funk facet=rhythm', true, 'mode')!.points).toEqual([{ point: FUNK, weight: 1, facet: 'rhythm' }]);
  });

  it('with no style= is no style: a collection’s bare `* from`, a template’s bare signature (§5)', () => {
    expect(read('* from', false, 'module')!.points).toEqual([{ point: {}, weight: 1, facet: 'module' }]);
    expect(read('&osc from (&pitch)', true, 'module')!.points).toEqual([{ point: {}, weight: 1, facet: 'module' }]);
  });

  it('says what is wrong: an unknown style, an unknown axis, an argument on a collection', () => {
    expect(read('* from style=&disco', false)!.problems).toEqual(['style=&disco: no style of that name in styles']);
    expect(read('* from style=&(map=style tempo=.3)', false)!.problems[0]).toMatch(/tempo is no axis/);
    expect(read('* from style=&funk mode=dorian', false)!.problems[0]).toMatch(/a collection's declaration has no arguments/);
  });
});

describe('a fragment’s association from its text', () => {
  it('is each declaration line’s points, in order; none where the text declares none', () => {
    const text = '&key from (&mode) &tonic style=&funk mode=dorian\n&key from (&mode) &tonic style=&techno mode=aeolian\n&key scale(&mode, &tonic)\n&mode major';
    expect(associationOf(text, { styles, facet: 'mode' })!.association.map((p) => p.args)).toEqual([{ mode: 'dorian' }, { mode: 'aeolian' }]);
    expect(associationOf('&x 0 1', { styles })).toBeNull();
    expect(associationOf('&x from &y\n&x 0', { styles })!.explicit).toBe(false);
    expect(associationOf('* from style=&funk\n&x 0', { styles })!.explicit).toBe(true);
  });

  it('leaves the text a piece takes: each signature once, bare, a collection’s declaration gone', () => {
    expect(withoutDeclarations('&key from (&mode) &tonic style=&funk mode=dorian\n&key from (&mode) &tonic style=&techno mode=aeolian\n&key scale(&mode, &tonic)')).toBe(
      '&key from (&mode) &tonic\n&key scale(&mode, &tonic)',
    );
    expect(withoutDeclarations('* from style=&funk\n&x 0')).toBe('&x 0');
  });
});
