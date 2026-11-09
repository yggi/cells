// The catalogue (#638): every seed file once, its facets read off its points, its variants the ids a query answers with,
// a layer's filed fragments after the seed's, and the points use added kept with the fragment they name.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { catalogue } from './catalogue';
import { EMPTY_LAYER, type LearnedLayer } from './fragments';
import { holesOf } from './holes';
import { LIBRARY, resolveSeed, resolverOf } from './library';
import { SEED } from './seed';
import { argsOf } from './variants';

const seed = catalogue();
const meter = seed.find((e) => e.id === 'meter')!;
const layer: LearnedLayer = {
  filed: [
    {
      fragment: { id: 'my riff', text: '&riff from &key\n&riff over=&key step=8n 0 2 4 2', association: [{ point: { sync: 0.4 }, weight: 0.1, facet: 'motif' }] },
      meta: { source: 'a person', created: '2026-11-09T12:00:00Z' },
      prose: '',
    },
  ],
  points: [{ id: meter.variants[1]!, point: { sync: 0.9 }, weight: 0.2, facet: 'meter' }],
  together: [],
};

describe('catalogue', () => {
  it('lists every seed file once, in path order', () => {
    expect(seed.map((e) => e.path)).toEqual(SEED.map((f) => f.path));
    expect(new Set(seed.map((e) => e.id)).size).toBe(SEED.length);
    expect(seed.length).toBeGreaterThanOrEqual(120);
  });

  it("names each entry's facets from its points, every seed file at least one", () => {
    for (const e of seed) expect(e.facets.length, e.id).toBeGreaterThan(0);
    expect(seed.find((e) => e.id === 'bell_and_scale')!.facets).toEqual(expect.arrayContaining(['mode', 'rhythm']));
  });

  it('gives the ids a query answers with: its variants are the library, each once', () => {
    expect(seed.flatMap((e) => e.variants).sort()).toEqual(LIBRARY.map((f) => f.id).sort());
    expect(meter.variants.length).toBeGreaterThan(1);
    expect(meter.variants.filter((v) => v.startsWith('meter(')).length).toBeGreaterThan(1);
  });

  it('reads a signature and what an entry takes, every id it takes in the seed', () => {
    expect(meter.signature).toMatchObject({ names: ['&bar'], main: '&tempo' });
    expect(seed.find((e) => e.id === 'gm_kit')!.signature).toBeNull();
    expect(seed.find((e) => e.id === 'drums_performer')!.takes).toContain('gm_kit');
    for (const e of seed) for (const id of e.takes) expect(resolveSeed(id), `${e.id} takes ${id}`).not.toBeNull();
  });

  it("compiles an entry's holes on first read, as holesOf reads them, once", () => {
    const e = seed.find((x) => x.id === 'root_bass')!;
    const expected = holesOf(e.text, (t) => compileSource(t, undefined, { resolve: resolveSeed }), resolveSeed);
    expect(e.holes).toEqual(expected);
    expect(e.holes).toBe(e.holes);
    expect(e.holes.uses).toContain('&harm');
  });

  it("lists a layer's filed fragments after the seed's, and keeps a point use added with the variant it names", () => {
    const withLayer = catalogue(layer);
    expect(withLayer).toHaveLength(seed.length + 1);
    expect(withLayer.at(-1)).toMatchObject({ id: 'my riff', path: null, source: 'a person', facets: ['motif'], signature: { names: ['&riff'], main: '&key' } });
    const m = withLayer.find((e) => e.id === 'meter')!;
    expect(m.association).toHaveLength(meter.association.length + 1);
    expect(m.association.at(-1)).toEqual({
      point: { sync: 0.9 },
      weight: 0.2,
      facet: 'meter',
      args: argsOf({ id: 'meter', text: meter.text, association: meter.association }, meter.variants[1]!),
    });
    expect(m.association.at(-1)!.args).toBeDefined();
  });

  it('gives the same entries for the same layer, and the seed alone for an empty one', () => {
    expect(catalogue(layer)).toBe(catalogue(layer));
    expect(catalogue(EMPTY_LAYER)).toBe(seed);
  });
});

describe('resolverOf', () => {
  it('reads the seed first, then the filed fragments, and is the seed alone for an empty layer', () => {
    const resolve = resolverOf(layer);
    expect(resolve('my riff')).toContain('&riff over=&key');
    expect(resolve('meter')).toBe(resolveSeed('meter'));
    expect(resolve('no such id')).toBeNull();
    expect(resolverOf(EMPTY_LAYER)).toBe(resolveSeed);
  });

  it('plays a piece that takes a filed fragment', () => {
    const piece = '&key scale(major, C)\n&bar meter("4/4") step=120bpm\n&line from "my riff" &key\n&v s=sine loop=C4\n&out map=sample [&line * &v]';
    const r = compileSource(piece, undefined, { resolve: resolverOf(layer) });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
});
