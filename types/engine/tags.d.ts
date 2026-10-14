/**
 * The tags of a piece's card (`tags="genre:jazz, artist:Bach, rhythm"`): four kinds. `genre:` and
 * `artist:` say what kind of tag it is by a prefix; `tutorial` is a kind and its one tag at once (a
 * piece of the tutorial, whose tiers its card's tier= says); a tag without a prefix is
 * a topic (a technique or idea: rhythm, canon, tuning), the kind a person types without thinking
 * about it. The library shows the name only and groups by kind. Pure text: no UI.
 */
export type TagKind = 'genre' | 'artist' | 'tutorial' | 'topic';
/** The tutorial's tag: its pieces are the tutorial's, in tiers, a cell of their own in the library. */
export declare const TUTORIAL = "tutorial";
/** The MIDI library's tag (src/corpus.ts): its files are a cell of their own in the library, as the tutorial's pieces are. */
export declare const MIDI_FILE = "MIDI file";
/** The tags the examples use, by kind: a test fails on any other (a piece of your own may use any). */
export declare const VOCABULARY: Readonly<Record<TagKind, readonly string[]>>;
/** A tag's kind and name: `genre:jazz` → genre, jazz; `tutorial` → tutorial; no prefix → a topic. */
export declare function parseTag(tag: string): {
    kind: TagKind;
    name: string;
};
/** What the library shows: the name, without its kind. */
export declare const tagName: (tag: string) => string;
export declare const tagKind: (tag: string) => TagKind;
/**
 * One spelling for one tag, so a piece saved before the prefixes (`jazz`) lands on the same tag as
 * `genre:jazz`: a prefix is normalised (`Genre: jazz` → `genre:jazz`, `topic:rhythm` → `rhythm`);
 * a bare name the vocabulary knows as a genre or an artist gets its prefix; any other bare tag stays.
 * `basics`, the tutorial's tag before it had a kind of its own, is `tutorial`.
 */
export declare function canonicalTag(tag: string): string;
/** The tags of a piece as the library knows them: canonical, once each. */
export declare const canonicalTags: (tags: readonly string[]) => string[];
