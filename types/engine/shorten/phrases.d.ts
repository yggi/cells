import type { CompileOptions } from '../program';
import { type Hint } from '../fold/hints';
import { type Candidate, type Result, type ShortenRewrite } from './harness';
/**
 * Every phrase worth a cell of its own. `given`: hints found elsewhere (`hints(lines)` over what was heard, a MIDI file's
 * notes), placed on the cells as written (`placedHints`) and weighed beside the text's own (#157).
 */
export declare function phrases(source: string, cells: readonly Candidate[], result: Result, options?: CompileOptions, given?: readonly Hint[]): ShortenRewrite[];
