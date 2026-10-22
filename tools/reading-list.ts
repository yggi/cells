// Lifted from yggi/jambot tooling/reading-list.ts @ 8871429.
/**
 * The boot set: what a fresh agent reads before it does anything, `AGENTS.md`
 * (imported by `CLAUDE.md`) and `docs/MEMORY.md` (which `AGENTS.md` names the
 * entry point). Its size has a ceiling, so the reading list stays something an
 * agent takes in whole.
 * Growth goes elsewhere by default: a fact lives next to what it describes.
 * Condensing the boot set is its own deliberate change, made when the ceiling
 * is reached, not a trim tucked into a feature's pull request.
 */
export const BOOT_SET = ['AGENTS.md', 'docs/MEMORY.md'];

/** In bytes: about 6k tokens, the family's ceiling (Jambot's too), with headroom over today's 17 KB (#259). A ceiling far above the size could never fire. */
export const CEILING = 24 * 1024;

/** The share of the ceiling from which the test warns, so the condensing comes before a pull request is stopped by it. */
export const ALARM = 0.9;

/** The boot set's size in bytes, given a reader of a path's text. */
export function bootBytes(read: (path: string) => string): number {
  return BOOT_SET.reduce((sum, path) => sum + Buffer.byteLength(read(path)), 0);
}
