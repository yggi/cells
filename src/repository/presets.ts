/**
 * Jambot's eight presets as places in style space, on the four axes the repository's fragments are placed on: `sync` (on
 * the beat 0, off it 1), `harm` (a static vamp 0, moving, rich harmony 1), `artic` (legato 0, staccato 1) and `energy`
 * (sparse 0, dense 1). Swing, entropy and bpm are left out: a fragment's style has no tempo (decision 037), and swing is
 * which meter the band plays (decision 043). The meters' and the rhythms' files (`fragments/`) write these same points
 * as numbers, and their tests read them from here.
 */
import type { StylePoint } from './fragments';

/** A point on the four axes the fragments are placed on. */
export const at = (sync: number, harm: number, artic: number, energy: number): StylePoint => ({ sync, harm, artic, energy });

// Lifted from yggi/jambot packages/engine/src/style.ts @ 7b078e8 (unchanged at 327d6a8). The comments: each preset's
// swing, which its meter plays.
export const SYNTH_POP = at(0.3, 0.45, 0.55, 0.55);
export const TECHNO = at(0.12, 0, 1, 0.8);
export const DEEP_HOUSE = at(0.35, 0.55, 0.65, 0.65); // swing .3: 16n at .6
export const AMBIENT = at(0.05, 0.3, 0, 0.2); // swing .05: 16n at 31/60, about .52
export const LO_FI = at(0.5, 0.75, 0.35, 0.5); // swing .45: 16n at .65
export const FUNK = at(1, 0.12, 0.85, 0.75); // swing .3: 16n at .6
export const BOSSA_NOVA = at(0.75, 0.85, 0.45, 0.45);
export const SWING_JAZZ = at(0.35, 1, 0.3, 0.6); // swing 1: 8n at 2/3, the jazz kit and the walking bass (yggi/jambot#360)

/**
 * A point proposed for a ninth preset, Electro swing, which Jambot doesn't have yet: the seeds lifted from
 * examples/electroswing.md sit here (its drums, its stabs, harmonic minor). Off the beat more than Swing jazz (the off-beat
 * hats, the Charleston), its harmony moving less (a vamp and its dominant), shorter and denser (a house kick under it).
 * The meter, the bass line and the vamp the example uses aren't associated here: each would then be the first found at
 * points between the presets (the vamp at Bossa nova's, Deep house's and Synth-pop's own) where it isn't today.
 */
export const ELECTRO_SWING = at(0.55, 0.75, 0.6, 0.75);
