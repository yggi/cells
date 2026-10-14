import type { Declared } from './declare';
import type { Ctx } from './context';
/**
 * The declarations with the built-in card added, when the piece writes no card and has a sound nothing reads: a sound
 * is what the mix algebra calls a signal or a wave (sorts.ts: a voice, a mix, a gate, a pattern read through a kit, a
 * tape's read head, a braid at audio rate). Otherwise as they were.
 */
export declare function builtinCard(ctx: Ctx, declared: Declared): Declared & {
    readonly builtin: string | null;
};
