/**
 * Style space (decision 063 §3): the table of axes a style is a point on, and the slots a map names. A fragment's
 * association points (`repository/fragments.ts`) are written on these axes, and a frontend reads them from here instead
 * of owning them (Jambot did, `packages/engine/src/style.ts`: lifted from yggi/jambot packages/engine/src/style.ts @
 * c0c8336, its four axes the composer asks on; entropy and the tempo stay a frontend's, outside a style).
 *
 * A map that names its slots (`SLOTS`) lets a pick read one by name, `&env[sustain]`, `&funk[bite]`: the slot's fixed
 * position, as written (`&env[$2]`, `&funk[$2]`). A style's slots are the axes, in this order, so `&funk map=style .3
 * .45 .55 .5` and `&funk map=style sync=.3 harm=.45 bite=.55 mood=.5` are one point.
 */
/** One axis of style space: its name, its range, the words a frontend shows for it, and what it measures. */
export interface Axis {
    readonly name: string;
    readonly range: readonly [number, number];
    /** Its name as a person reads it: `'Syncopation'`. */
    readonly label: string;
    /** What its low end and its high end sound like: `['on the beat', 'off the beat']`. */
    readonly ends: readonly [string, string];
    /** What it measures from one end to the other, said from its ends: `'On the beat (0) to off the beat (1).'` */
    readonly sentence: string;
}
/**
 * The axes of style space, in their order: a style's slots, and what an association point is written on (decision 076).
 * Energy is not one: it is intensity, how hard a style is played at a moment (#571); entropy is the reach, never a place.
 */
export declare const AXES: readonly Axis[];
/**
 * A mode's brightness (decision 076 §2, #572): a seven-note scale's degrees in semitones above its tonic, summed with
 * the third and the sixth counted twice, less locrian's sum, over lydian's. The third and the sixth weigh twice because
 * they tell the modes apart by colour: counted once each, harmonic minor and dorian sum alike; with them, harmonic minor
 * (its ♭6) lies between aeolian and dorian. What `mood` starts from (`moodOf`).
 */
export declare const BRIGHTNESS: Readonly<Record<string, number>>;
/** The tension a mode's mood is read at where nothing says more (a quarter: at ease, but not untroubled). */
export declare const MOOD_TENSION = 0.25;
/**
 * A mood from a mode and a tension (decision 076 §2, #572): `0.6 · brightness + 0.4 · (1 − tension)`, darker (0) to
 * brighter (1). What a mode says, moved by what the harmony and the sound do with it: tension is dissonance, menace,
 * unrest, 0 at ease to 1 menacing. A mode fragment's mood (but at a style's own point), or a tonal fragment's where no style is near,
 * is its mode's at `MOOD_TENSION`; a style's is placed by hand, its tension heard (`docs/notes/572-axes-atlas.md`).
 */
export declare const moodOf: (mode: string, tension?: number) => number;
/** The axes' names, in their order. */
export declare const AXIS_NAMES: readonly string[];
/** The slots a map names, in their order (a slot is its position): an envelope's four, a style's axes. */
export declare const SLOTS: Readonly<Record<string, readonly string[]>>;
/** The section's style, an interface name (decision 063 §3): the composer's to write, a score's note `&style`. */
export declare const STYLE = "style";
/**
 * The centre of style space: each axis at the middle of its range. What a reader of `&style` plays where no line writes
 * it (a fragment heard alone, a text that names no style): the language's default, so no fragment defines `&style`.
 */
export declare const CENTRE: readonly number[];
