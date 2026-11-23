/**
 * A text with each `from` line that takes a built-in plugin-fragment written out where it stands, its fill answered
 * (#799), the seed library its resolver by default (`answeredIn`, `engine/use.ts`). A template's lines alone
 * (`learned.ts`'s `sameText`, a frontend's reading of a groove) read a groove's `&euclidLevel from metric_accent(…)` as the
 * levels it writes, not as a `from` line to leave out with its kit's.
 */
import type { Resolve } from '../engine/program';
import { answeredIn } from '../engine/use';
import { resolveSeed } from './library';

export const answered = (text: string, resolve: Resolve = resolveSeed): string => answeredIn(text, resolve);
