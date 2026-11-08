import type { CompileOptions } from '../program';
/** The core fold: Shorten's core kinds and unread lines, the best each round, each checked by S1; the steps are what each did. */
export declare function coreFold(text: string, options?: CompileOptions, rounds?: number, keep?: ReadonlySet<string>): {
    source: string;
    steps: string[];
};
