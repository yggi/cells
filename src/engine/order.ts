/** The library's order (the files themselves sort by name). */
export const ORDER = ['metronome', 'transpose', 'rhythm', 'twinkle', 'fifths', 'canon', 'waveforms', 'stereo', 'lullaby', 'jazz', 'five', 'waltz', 'sailor', 'royal', 'pertonos', 'ricercar', 'korobeiniki', 'coltrane', 'bossa', 'bell', 'prelude', 'pachelbel', 'pop', 'idm', 'alpha', 'studie', 'just', 'bwv847', 'acid', 'zell', 'cellscape', 'cellscape2', 'baustelle', 'focus', 'hypercell', 'onemore', 'brothers', 'ghosts', 'tines', 'phase', 'dtmf', 'musicbox', 'tape', 'automaton', 'echotape', 'soundtape', 'testtones', 'forks', 'resonanz', 'kalimba', 'harmonograph', 'fiveto12'] as const;

export type PresetKey = (typeof ORDER)[number];
