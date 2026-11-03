/**
 * The styles: the repository's facet `style` (decision 063 §3; #391), the points Jambot's ten presets play, each a
 * `map=style` cell of the seed collection `styles` (`fragments/styles/01-styles.md`), so a score names its section's
 * style by one (`&funk from styles`, `&style style=&funk`) where the section sits exactly on it. The points are
 * `presets.ts`'s, and a test holds the two to each other.
 */
import type { Fragment } from './fragments';
/** The styles built so far: the collection `styles`, associated as the facet `style` at each of its points. */
export declare const STYLE_FRAGMENTS: readonly Fragment[];
