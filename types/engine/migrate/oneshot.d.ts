import type { Rewrite } from '../rewrite';
/** Each line that writes `oneshot` bare: written `oneshot=1`. */
export declare function oneshots(source: string): Rewrite<'oneshot'>[];
