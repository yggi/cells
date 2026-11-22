/**
 * A part read in its document (#703): Kinderlieder's six tunes, each read as the lead it is, over the document's key.
 */
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../engine/examples';
import { givenOf, partOf } from '../engine/use';
import { readFragment } from './firstguess';
import { resolveSeed } from './library';
import { readPart } from './readpart';

const document = EXAMPLES.kinderlied.source;
const HEADS = ['twinkle', 'wonder', 'haenschen', 'hinein', 'heim', 'weinet'];
const read = (doc: string, head: string) => readPart(doc, head, { resolve: resolveSeed, facet: 'motif' });
/** The document with its key written another way. */
const keyed = (key: string) => document.replace('diatonic(mode=ionian) C', key);

describe('what a document gives a part', () => {
  it("is the lines for the part's main parameter, with what they read: Kinderlieder's key", () => {
    expect(givenOf(document, 'twinkle')).toBe('&key from diatonic(mode=ionian) C');
    expect(givenOf(document, 'nowhere')).toBeNull();
    // (a text of one signature is its own part: it gives it nothing)
    expect(givenOf('&a from &key\n&a over=&key 0 1\n', 'a')).toBe('');
  });
});

describe('a part read in its document', () => {
  it('reads each of the six tunes: a point with a mood and how far to trust it', () => {
    for (const head of HEADS) {
      const r = read(document, head)!;
      expect(r, head).not.toBeNull();
      expect(r.point.mood, head).toBeGreaterThan(0);
      expect(r.confidence.mood, head).toBeGreaterThan(0);
    }
  });

  it('reads hinein and weinet apart on mood, by at least 0.1', () => {
    const [hinein, weinet] = ['hinein', 'weinet'].map((h) => read(document, h)!.point.mood!);
    expect(Math.abs(hinein! - weinet!)).toBeGreaterThanOrEqual(0.1);
  });

  it("reads as it does alone where the document gives it nothing new: the host's major is the document's key", () => {
    for (const head of HEADS) expect(read(document, head), head).toEqual(readFragment(partOf(document, head)!, 'motif', resolveSeed));
  });

  it("differs from it only in mood where the document's key is another: its notes, onsets and lengths are the same", () => {
    let moved = 0;
    for (const head of HEADS) {
      const alone = read(document, head)!;
      const dorian = read(keyed('diatonic(mode=dorian) D'), head)!;
      expect(dorian.point.sync, head).toBe(alone.point.sync);
      expect(dorian.point.bite, head).toBe(alone.point.bite);
      expect(dorian.intensity, head).toBe(alone.intensity);
      if (dorian.point.mood !== alone.point.mood) moved++;
    }
    // (the key is the document's to give: hinein reads a dorian .60 in C, an aeolian .45 in D)
    expect(moved).toBeGreaterThan(0);
    expect(read(document, 'hinein')!.point.mood).toBeCloseTo(0.6, 2);
    expect(read(keyed('diatonic(mode=dorian) D'), 'hinein')!.point.mood).toBeCloseTo(0.45, 2);
  });

  it("reads a line's bite as the line's own, the document's voice for it moving none", () => {
    const voiced = document.replace('&leadV s=tri loop=C5 env=&(map=adsr .005 .3 .3 .2)', '&leadV s=saw loop=C3 env=&(map=adsr .5 .05 1 1)');
    expect(voiced).not.toBe(document);
    for (const head of HEADS) expect(read(voiced, head), head).toEqual(read(document, head));
  });

  it('is null for a head no signature names, and for a part with no band part to read as', () => {
    expect(read(document, 'nowhere')).toBeNull();
    expect(readPart(document, 'twinkle', { resolve: resolveSeed })).toBeNull();
    expect(readPart(document, 'twinkle', { resolve: resolveSeed, facet: 'meter' })).toBeNull();
  });
});
