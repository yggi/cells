/**
 * The forms (#294): the facet `form`, a braid of holes a composer fills with motifs. Call and answer, the sentence and
 * the period read the hole `&call`; AABA reads `&a`, since an A is often a phrase itself. What a form derives from its
 * hole (an answer, a continuation, a bridge) is an operator on it by default (`&answer step=8n &call^-2`), a helper a
 * piece overrides by naming it (decision 059), so a form fits any call. Each is headed by its own name (`&phrase`,
 * `&sentence`, `&period`, `&chorus`), taps the host's meter by the eighth and has no voice and no card (#291): the lead
 * performer plays one as its `&leadline` (`&leadline step=8n &chorus`).
 *
 * All four sit at the centre of style space, as the facet `form`: a form fits any style. Each is a file of the seed
 * library, `fragments/forms/*.md` (`seed.ts`).
 */
import type { Fragment } from './fragments';
/** The forms built so far: call and answer, the sentence, the period and AABA, as the facet `form`. */
export declare const FORM_FRAGMENTS: readonly Fragment[];
