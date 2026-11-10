import { type CompileResult } from '../program';
import type { Rewrite } from '../rewrite';
type Rule = 'bar' | 'tempo' | 'key' | 'tonic';
/** The beats a minute a meter is a bar at (the owner's bounds, #196): where a band plays. */
export declare const BAR_BPM: {
    readonly from: 40;
    readonly to: 300;
};
/** Each interface name the piece's main meter and main key aren't written in yet, where they are unambiguous. */
export declare function interfaceNames(source: string, result: CompileResult): Rewrite<Rule>[];
export {};
