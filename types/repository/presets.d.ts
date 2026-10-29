/**
 * Jambot's eight presets as places in style space, on the four axes the repository's fragments are placed on: `sync` (on
 * the beat 0, off it 1), `harm` (a static vamp 0, moving, rich harmony 1), `artic` (legato 0, staccato 1) and `energy`
 * (sparse 0, dense 1). Swing, entropy and bpm are left out: a fragment's style has no tempo (decision 037), and swing is
 * which meter the band plays (decision 043). The meters' and the rhythms' files (`fragments/`) write these same points
 * as numbers, and their tests read them from here.
 */
import type { StylePoint } from './fragments';
/** A point on the four axes the fragments are placed on. */
export declare const at: (sync: number, harm: number, artic: number, energy: number) => StylePoint;
export declare const SYNTH_POP: Readonly<Record<string, number>>;
export declare const TECHNO: Readonly<Record<string, number>>;
export declare const DEEP_HOUSE: Readonly<Record<string, number>>;
export declare const AMBIENT: Readonly<Record<string, number>>;
export declare const LO_FI: Readonly<Record<string, number>>;
export declare const FUNK: Readonly<Record<string, number>>;
export declare const BOSSA_NOVA: Readonly<Record<string, number>>;
export declare const SWING_JAZZ: Readonly<Record<string, number>>;
export declare const ELECTRO_SWING: Readonly<Record<string, number>>;
export declare const SPOOKY: Readonly<Record<string, number>>;
