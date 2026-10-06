/**
 * The tags of a piece's card (`tags="genre:jazz, artist:Bach, rhythm"`): three kinds, told apart by a
 * prefix. `genre:` and `artist:` say what kind of tag it is; a tag without a prefix is a topic (a
 * technique or idea: rhythm, canon, tuning), the kind a person types without thinking about it.
 * The library shows the name only and groups by kind. Pure text: no UI.
 */
export type TagKind = 'genre' | 'artist' | 'topic';

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
  topic: [
    'basics',
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

/** A tag's kind and name: `genre:jazz` → genre, jazz; no prefix → a topic. */
export function parseTag(tag: string): { kind: TagKind; name: string } {
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
 */
export function canonicalTag(tag: string): string {
  const { kind, name } = parseTag(tag.trim());
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
