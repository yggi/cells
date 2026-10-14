/** An interval's semitones: a degree (1–7) and its quality — P perfect, M major, m minor, A augmented, d diminished. */
export declare function semitones(interval: string): number;
/** tonal's scales by name (words joined by spaces): their steps, as scan(…) takes them (they add up to 12). */
export declare const TONAL_SCALES: Readonly<Record<string, readonly number[]>>;
