// A piece's outline (#695): its parts, each a take or a line the piece writes, as a tree from the ground and from the outputs.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { EXAMPLES } from './examples';
import { outlineOf, type Outline, type OutlineNode } from './outline';
import { resolveSeed } from '../repository/library';

const compiled = (text: string) => compileSource(text, undefined, { resolve: resolveSeed });

/** Each part's key, once for each place it has in a tree. */
const keys = (nodes: readonly OutlineNode[]): string[] => nodes.flatMap((n) => [n.part.key, ...keys(n.children)]);

/** A tree as nested keys and ids, `key id` with its children indented, for a readable expectation. */
const drawn = (nodes: readonly OutlineNode[], depth = 0): string[] =>
  nodes.flatMap((n) => [`${'  '.repeat(depth)}${n.part.key} ${n.part.id ?? n.part.heads.join(',')}`, ...drawn(n.children, depth + 1)]);

const SCORE = [
  '&bar from meter(swing=16n:.6) 104bpm',
  '&key from diatonic(mode=dorian) D',
  '&harm from vamp_to_the_seventh &key',
  '&bassline from funk_bass &harm',
  '&leadline step=8n over=&key 0 2 4 ~ 7 ~ 4 2',
  '&drumlines step=16n &bd ~ &hh ~ &sd ~ &hh ~',
  '&style map=style sync=.85 harm=1 bite=.12 mood=.75',
  '* from band(drumlines=&drumlines, bassline=&bassline, leadline=&leadline, style=&style)',
].join('\n');

describe('outlineOf', () => {
  const score = compiled(SCORE);
  const outline: Outline = outlineOf(score);
  const part = (key: string) => outline.parts.find((p) => p.key === key)!;

  it('reads a score: a part a line, the band a part with its performers and instruments inside', () => {
    expect(score.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(outline.parts.map((p) => `${p.key} ${p.id ?? '-'}`)).toEqual([
      '1 meter',
      '2 diatonic',
      '3 vamp_to_the_seventh',
      '4 funk_bass',
      '5 -',
      '6 -',
      '7 -',
      '8 band',
      '8/3 drums_performer',
      '8/4 bass_performer',
      '8/5 pad_performer',
      '8/6 stab_performer',
      '8/7 lead_performer',
      '8/8 bass',
      '8/9 pad',
      '8/10 keys',
      '8/11 lead',
    ]);
    expect(part('4')).toMatchObject({ heads: ['&bassline'], args: { harm: '&harm' }, within: null, reads: ['1', '3'] });
    expect(part('8/4')).toMatchObject({ heads: ['&bassOut', '&bass'], within: '8' });
    expect(part('8').heads).toEqual(['&band', '&sound', '&midi']);
    expect(part('5')).toMatchObject({ heads: ['&leadline'], id: null });
  });

  it('nests from the ground: each part under what it is taken on, its argument first', () => {
    expect(drawn(outline.ground)).toEqual([
      '1 meter',
      '  6 &drumlines',
      '    8/3 drums_performer',
      '2 diatonic',
      '  3 vamp_to_the_seventh',
      '    4 funk_bass',
      '      8/4 bass_performer',
      '        8/8 bass',
      '          8 band',
      '  5 &leadline',
      '    8/7 lead_performer',
      '      8/11 lead',
      '7 &style',
      '8/5 pad_performer',
      '  8/9 pad',
      '8/6 stab_performer',
      '  8/10 keys',
    ]);
  });

  it('nests from the outputs: the card, then each instrument, its performer and the line it plays', () => {
    expect(drawn(outline.outputs)).toEqual([
      '7 &style',
      '8 band',
      '  8/3 drums_performer',
      '    6 &drumlines',
      '  8/8 bass',
      '    8/4 bass_performer',
      '      4 funk_bass',
      '        3 vamp_to_the_seventh',
      '          1 meter',
      '          2 diatonic',
      '  8/9 pad',
      '    8/5 pad_performer',
      '  8/10 keys',
      '    8/6 stab_performer',
      '  8/11 lead',
      '    8/7 lead_performer',
      '      5 &leadline',
    ]);
  });

  it('keeps a splice of voices out of both trees: the drum line plays on the kit', () => {
    expect(part('6')).toMatchObject({ reads: ['1'], on: ['8/3'] });
    // (without it, the drum line and its performer would read each other, and one would be cut from the other)
    expect(part('8/3').reads).toEqual(['6']);
  });

  it("names a fragment's facets by the frontend's catalogue, and a written part none", () => {
    const facets = outlineOf(score, { facetsOf: (id) => (id === 'funk_bass' ? ['bass'] : []) });
    expect(facets.parts.find((p) => p.key === '4')!.facets).toEqual(['bass']);
    expect(facets.parts.find((p) => p.key === '5')!.facets).toEqual([]);
  });

  it('says what the piece overrides in a take', () => {
    const own = outlineOf(compiled('&bd, &sd from gm_kit\n&sd s=white\n&beat step=8n &bd ~ &sd ~'));
    expect(own.parts.find((p) => p.id === 'gm_kit')).toMatchObject({ heads: ['&bd', '&sd'], overrode: ['&sd'] });
    expect(own.parts.find((p) => p.key === '2')).toMatchObject({ id: null, heads: ['sd'].map((h) => `&${h}`) });
  });

  it("over every example: each take's heads once, each line the piece writes a part, every part once in each tree", () => {
    let takes = 0;
    for (const [key, example] of Object.entries(EXAMPLES)) {
      const result = compiled(example.source);
      const o = outlineOf(result);
      const all = o.parts.map((p) => p.key);
      expect(keys(o.ground).sort(), key).toEqual([...all].sort());
      expect(keys(o.outputs).sort(), key).toEqual([...all].sort());
      for (const take of result.takes ?? []) {
        takes++;
        const heads = o.parts.filter((p) => p.line === take.span.line).flatMap((p) => p.heads);
        expect(new Set(heads).size, `${key}: ${take.id}`).toBe(heads.length);
        if (take.names) expect(heads, `${key}: ${take.id}`).toEqual(expect.arrayContaining([...take.names]));
      }
      for (const cell of result.cells.values()) {
        if (result.origins?.has(cell.name) || cell.lambda !== null || cell.implicit) continue;
        expect(o.parts.find((p) => p.key === String(cell.span.line))?.cells, `${key}: &${cell.name}`).toContain(cell.name);
      }
    }
    expect(takes).toBeGreaterThan(150);
  });
});
