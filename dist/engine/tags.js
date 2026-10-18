export const TUTORIAL = 'tutorial';
export const MIDI_FILE = 'MIDI file';
export const VOCABULARY = {
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
        'MIDI',
        'physics',
        'tape',
    ],
};
export function parseTag(tag) {
    if (tag.toLowerCase() === TUTORIAL)
        return { kind: 'tutorial', name: TUTORIAL };
    const m = /^(genre|artist|topic):\s*(.*)$/i.exec(tag);
    return m ? { kind: m[1].toLowerCase(), name: m[2] } : { kind: 'topic', name: tag };
}
export const tagName = (tag) => parseTag(tag).name;
export const tagKind = (tag) => parseTag(tag).kind;
export function canonicalTag(tag) {
    if (/^(topic:\s*)?basics$/i.test(tag.trim()))
        return TUTORIAL;
    const { kind, name } = parseTag(tag.trim());
    if (kind === 'tutorial')
        return TUTORIAL;
    const known = (k) => VOCABULARY[k].find((v) => v.toLowerCase() === name.toLowerCase());
    if (kind === 'topic') {
        const own = /^topic:/i.test(tag.trim());
        const g = !own ? known('genre') : undefined;
        if (g)
            return `genre:${g}`;
        const a = !own ? known('artist') : undefined;
        if (a)
            return `artist:${a}`;
        return name;
    }
    return `${kind}:${known(kind) ?? name}`;
}
export const canonicalTags = (tags) => [...new Set(tags.map(canonicalTag))];
