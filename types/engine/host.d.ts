import { type Env } from './program';
import { type Plan } from './realize';
import { type Window } from './schedule';
export type ToEngine = {
    type: 'load';
    code: string;
    env?: Env;
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
/** The plan the app plays for a compiled piece: its shifts and switches as written. */
export declare function planOf(code: string, env?: Env): Plan;
/** A hand on a physical cell of a plan, at transport second t (null lets go). */
export declare function grabIn(p: Plan, cell: string, t: number, speed: number | null): void;
export declare const emptyWindow: (from: number, length: number) => Window;
export declare function createHost(now?: () => number): (m: ToEngine) => FromEngine | null;
