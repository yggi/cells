/**
 * The tags of a piece's card (`tags="genre:jazz, artist:Bach, rhythm"`): four kinds. `genre:` and
 * `artist:` say what kind of tag it is by a prefix; `tutorial` is a kind and its one tag at once (a
 * piece of the tutorial, the ladder of basics: its card's rung= says where); a tag without a prefix is
 * a topic (a technique or idea: rhythm, canon, tuning), the kind a person types without thinking
 * about it. The library shows the name only and groups by kind. Pure text: no UI.
 */
export type TagKind = 'genre' | 'artist' | 'tutorial' | 'topic';

/** The tutorial's tag: its pieces are the ladder of basics, a cell of their own in the library. */
export const TUTORIAL = 'tutorial';

/** The tags the examples use, by kind: a test fails on any other (a piece of your own may use any). */
export const VOCABULARY: Readonly<Record<TagKind, readonly string[]>> = {
  genre: ['classical', 'jazz', 'electronic', 'experimental', 'world', 'folk', 'ambient', 'dance', 'industrial', 'blues', 'minimal', '8-bit'],
  artist: [
    'Bach',
    'Wendy Carlos',
    'Stockhausen',
    'Neubauten',
    'Aphex Twin',
    'Brahms',
    'Coltrane',
    'Pachelbel',
    'Kraftwerk',
    'Scooter',
    'Daft Punk',
    'Chemical Brothers',
    'Nine Inch Nails',
    'Steve Reich',
  ],
  tutorial: [TUTORIAL],
  topic: [
    'sound',
    'rhythm',
    'harmony',
    'diatonic',
    'tonal',
    'modal',
    'chromatic',
    'microtonal',
    'tuning',
    'arrangement',
    'canon',
    'counterpoint',
    'motifs',
    'pentatonic',
    'stereo',
    'FM',
  ],
};

/** A tag's kind and name: `genre:jazz` → genre, jazz; `tutorial` → tutorial; no prefix → a topic. */
export function parseTag(tag: string): { kind: TagKind; name: string } {
  if (tag.toLowerCase() === TUTORIAL) return { kind: 'tutorial', name: TUTORIAL };
  const m = /^(genre|artist|topic):\s*(.*)$/i.exec(tag);
  return m ? { kind: m[1].toLowerCase() as TagKind, name: m[2] } : { kind: 'topic', name: tag };
}

/** What the library shows: the name, without its kind. */
export const tagName = (tag: string): string => parseTag(tag).name;
export const tagKind = (tag: string): TagKind => parseTag(tag).kind;

/**
 * One spelling for one tag, so a piece saved before the prefixes (`jazz`) lands on the same tag as
 * `genre:jazz`: a prefix is normalised (`Genre: jazz` → `genre:jazz`, `topic:rhythm` → `rhythm`);
 * a bare name the vocabulary knows as a genre or an artist gets its prefix; any other bare tag stays.
 * `basics`, the tutorial's tag before it had a kind of its own, is `tutorial`.
 */
export function canonicalTag(tag: string): string {
  if (/^(topic:\s*)?basics$/i.test(tag.trim())) return TUTORIAL;
  const { kind, name } = parseTag(tag.trim());
  if (kind === 'tutorial') return TUTORIAL;
  const known = (k: TagKind) => VOCABULARY[k].find((v) => v.toLowerCase() === name.toLowerCase());
  if (kind === 'topic') {
    const own = /^topic:/i.test(tag.trim());
    const g = !own ? known('genre') : undefined;
    if (g) return `genre:${g}`;
    const a = !own ? known('artist') : undefined;
    if (a) return `artist:${a}`;
    return name;
  }
  return `${kind}:${known(kind) ?? name}`;
}

/** The tags of a piece as the library knows them: canonical, once each. */
export const canonicalTags = (tags: readonly string[]): string[] => [...new Set(tags.map(canonicalTag))];
