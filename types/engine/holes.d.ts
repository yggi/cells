/**
 * Deprecated (#727): plugin-fragments moved to `engine/fills.ts`, a fill and not a hole, since decision 047's holes are
 * what a fragment uses and doesn't define (`repository/holes.ts`). v0.25.0 shipped this module, so it stays one minor
 * version as a re-export for a frontend that imports it (Cell studio's `pluginView.ts` imports `lawOf`); it goes at the
 * next. Import from `@yggi/cells/engine/fills`.
 */
export { BUILT_IN, filledAt, lawOf, marksOf, unitOf, type Fill, type PluginFragment } from './fills';
/** @deprecated A fill (`Fill`, `engine/fills.ts`). */
export type { Fill as Hole } from './fills';
