/**
 * A text with each `from` line that takes a built-in plugin-fragment written out where it stands, its fill answered
 * (#799): what its lines are once the plugin has answered, as Core writes them. A template's lines alone (`learned.ts`'s
 * `sameText`, the benches) read a groove's `&euclidLevel from metric_accent(…)` as the levels it writes, not as a `from`
 * line to leave out with its kit's.
 */
import { splitComment } from '../engine/edit';
import { BY_FRAGMENT } from '../engine/fills';
import { readFrom } from '../engine/parser/use';
import type { Resolve } from '../engine/program';
import { expand } from '../engine/use';
import { resolveSeed } from './library';

export const answered = (text: string, resolve: Resolve = resolveSeed): string =>
  text
    .split('\n')
    .flatMap((l) => {
      const f = readFrom(splitComment(l)[0].trim());
      return f?.kind === 'use' && BY_FRAGMENT.has(f.id) ? expand(l.trim(), resolve).split('\n').filter(Boolean) : [l];
    })
    .join('\n');
