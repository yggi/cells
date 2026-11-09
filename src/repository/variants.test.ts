import { describe, expect, it } from 'vitest';
import { readFragment, writeFragment, type FragmentFile } from './files';
import { createRepository, EMPTY_LAYER, type LearnedLayer, type StylePoint } from './fragments';
import { useFragments } from './learned';
import { LIBRARY } from './library';
import { boundText, takenAs, variantsOf } from './variants';

// A template's sets of arguments, each a fragment of its own (#387, B1): the seed's diatonic, and a filed template alike.
const at = (sync: number, harm: number, artic: number, energy: number): StylePoint => ({ sync, harm, artic, energy });
const TEXT = '&key from (&mode) &tonic\n&key scale(&mode, &tonic)\n&mode major';
const DARK = at(0.9, 0.9, 0.9, 0);
const BRIGHT = at(0.1, 0.1, 0.1, 0.875);
const mine = (association: FragmentFile['fragment']['association'], id = 'mine'): FragmentFile => ({
  fragment: { id, text: TEXT, association },
  meta: { source: 'composer' },
  prose: '',
});
const layerOf = (...filed: FragmentFile[]): LearnedLayer => ({ ...EMPTY_LAYER, filed });

describe('a template taken with its arguments (#387, B1)', () => {
  it('binds them into its text: the default line gone, the parameter out of the signature, the value where it was read', () => {
    expect(boundText(TEXT, { mode: 'dorian' })).toBe('&key from &tonic\n&key scale(dorian, &tonic)');
    expect(takenAs('diatonic', { mode: 'dorian' })).toBe('diatonic(mode=dorian)');
    expect(() => boundText(TEXT, { tempo: '90' })).toThrow(/&tempo is none of the signature's optional parameters/);
    expect(() => boundText('&key scale(dorian, C)', { mode: 'dorian' })).toThrow(/no signature/);
  });

  it('is a fragment for each set of arguments its points carry, in the order they first name them; its own points with none are itself', () => {
    const f = mine([
      { point: DARK, weight: 1, facet: 'mode', args: { mode: 'phrygian' } },
      { point: BRIGHT, weight: 1, facet: 'mode', args: { mode: 'lydian' } },
      { point: at(0.5, 0.5, 0.5, 0.25), weight: 1, facet: 'mode' },
      { point: at(0.8, 0.8, 0.8, 0.125), weight: 1, facet: 'mode', args: { mode: 'phrygian' } },
    ]).fragment;
    expect(variantsOf(f).map((v) => [v.id, v.association.length])).toEqual([
      ['mine', 1],
      ['mine(mode=phrygian)', 2],
      ['mine(mode=lydian)', 1],
    ]);
    expect(variantsOf(f).every((v) => v.association.every((wp) => wp.args === undefined))).toBe(true);
  });

  it('writes its arguments in its file and reads them back', () => {
    const file = mine([{ point: DARK, weight: 1, facet: 'mode', args: { mode: 'phrygian' } }]);
    const read = readFragment(writeFragment(file));
    expect('problems' in read ? read.problems : read.fragment.association).toEqual(file.fragment.association);
  });
});

describe('a filed template is taken with its arguments as the seed’s is', () => {
  const repository = createRepository(LIBRARY);
  const filed = mine([
    { point: DARK, weight: 1, facet: 'mode', args: { mode: 'phrygian' } },
    { point: BRIGHT, weight: 1, facet: 'mode', args: { mode: 'lydian' } },
  ]);

  it('a query finds each set as a fragment of its own, its text bound', () => {
    const [first] = repository.query(DARK, 1, {}, { facet: 'mode', layer: layerOf(filed) });
    expect([first!.fragment.id, first!.fragment.text, first!.distance]).toEqual(['mine(mode=phrygian)', '&key from &tonic\n&key scale(phrygian, &tonic)', 0]);
    expect(repository.query(BRIGHT, 1, {}, { facet: 'mode', layer: layerOf(filed) })[0]!.fragment.id).toBe('mine(mode=lydian)');
  });

  it('a use of one set raises its own point, in the template’s association, and no other set’s', () => {
    const after = useFragments(repository, layerOf(filed), [{ id: 'mine(mode=phrygian)', point: DARK, facet: 'mode' }]);
    expect(after.filed[0]!.fragment.association.map((wp) => [wp.args?.mode, wp.weight])).toEqual([
      ['phrygian', 1.1],
      ['lydian', 1],
    ]);
  });

  it('a use of one set at another set’s point still raises its own, not the nearer one of another set (#464)', () => {
    const after = useFragments(repository, layerOf(filed), [{ id: 'mine(mode=phrygian)', point: BRIGHT, facet: 'mode' }]);
    expect(after.filed[0]!.fragment.association.map((wp) => [wp.args?.mode, wp.weight])).toEqual([
      ['phrygian', 1.1],
      ['lydian', 1],
    ]);
  });

  it('a use in a facet the set has no point of adds one, carrying its arguments, so it stays that set’s', () => {
    const where = at(0.5, 0.2, 0.35, 0.875);
    const after = useFragments(repository, layerOf(filed), [{ id: 'mine(mode=lydian)', point: where, facet: 'harmony' }]);
    const added = after.filed[0]!.fragment.association[2]!;
    expect([added.args, added.facet, added.weight]).toEqual([{ mode: 'lydian' }, 'harmony', 0.1]);
    expect(repository.query(where, 1, {}, { facet: 'harmony', layer: after }).map((f) => f.fragment.id)).toContain('mine(mode=lydian)');
  });

  it('a filed template whose arguments name a parameter it lacks is a malformed layer, said', () => {
    const wrong = mine([{ point: DARK, weight: 1, facet: 'mode', args: { tempo: '90' } }]);
    expect(() => repository.query(DARK, 1, {}, { layer: layerOf(wrong) })).toThrow(/A malformed learned layer: mine: boundText: &tempo is none/);
  });
});
