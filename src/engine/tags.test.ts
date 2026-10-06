import { describe, expect, test } from 'vitest';
import { canonicalTag, canonicalTags, parseTag, tagKind, tagName, VOCABULARY } from './tags';

describe('tags by kind', () => {
  test('a prefix names the kind; none is a topic', () => {
    expect(parseTag('genre:jazz')).toEqual({ kind: 'genre', name: 'jazz' });
    expect(parseTag('artist:Wendy Carlos')).toEqual({ kind: 'artist', name: 'Wendy Carlos' });
    expect(parseTag('rhythm')).toEqual({ kind: 'topic', name: 'rhythm' });
    expect([tagName('genre:jazz'), tagKind('genre:jazz'), tagName('canon')]).toEqual(['jazz', 'genre', 'canon']);
  });
  test('one spelling for one tag, so pieces saved without prefixes meet the examples', () => {
    expect(canonicalTag('jazz')).toBe('genre:jazz');
    expect(canonicalTag('Bach')).toBe('artist:Bach');
    expect(canonicalTag('bach')).toBe('artist:Bach');
    expect(canonicalTag('Genre: Jazz')).toBe('genre:jazz');
    expect(canonicalTag('topic:rhythm')).toBe('rhythm');
    expect(canonicalTag('rhythm')).toBe('rhythm');
    expect(canonicalTag('my own tag')).toBe('my own tag');
    expect(canonicalTag('genre:my style')).toBe('genre:my style');
    expect(canonicalTags(['jazz', 'genre:jazz', 'Jazz'])).toEqual(['genre:jazz']);
    // canonical stays canonical
    for (const t of ['genre:folk', 'artist:Steve Reich', 'tuning']) expect(canonicalTag(t)).toBe(t);
  });
  test('the vocabulary has each name once, whatever the kind', () => {
    const all = Object.values(VOCABULARY)
      .flat()
      .map((t) => t.toLowerCase());
    expect(new Set(all).size).toBe(all.length);
  });
});
