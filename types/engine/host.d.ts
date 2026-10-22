import { type CompileOptions, type Env, type Locked, type Resolve } from './program';
import { type Plan } from './realize';
import { type Window } from './schedule';
export type ToEngine = {
    type: 'load';
    code: string;
    env?: Env;
    locked?: readonly Locked[];
} | {
    type: 'window';
    id: number;
    from: number;
    length: number;
    begins?: number;
} | {
    type: 'grab';
    cell: string;
    t: number;
    speed: number | null;
} | {
    type: 'reset';
};
export type FromEngine = {
    type: 'window';
    id: number;
    window: Window;
    ms: number;
} | {
    type: 'loaded';
    ms: number;
    ok: boolean;
};
/** The plan the app plays for a compiled piece: its shifts and switches as written; its `use` lines read through `options`. */
export declare function planOf(code: string, env?: Env, options?: CompileOptions): Plan;
/** A hand on a physical cell of a plan, at transport second t (null lets go). */
export declare function grabIn(p: Plan, cell: string, t: number, speed: number | null): void;
export declare const emptyWindow: (from: number, length: number) => Window;
/** What a host is made with: the resolver its pieces' `use` lines read through (it can't cross `postMessage`, so isn't in `load`). */
export interface HostOptions {
    readonly resolve?: Resolve;
}
export declare function createHost(now?: () => number, { resolve }?: HostOptions): (m: ToEngine) => FromEngine | null;
