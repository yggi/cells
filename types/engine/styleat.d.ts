import { type CompileOptions, type Env } from './program';
/**
 * The style `source` plays at `seconds`: a point, one value per axis (`AXES`, in their order), read from `&style` or the
 * cell named; null where the piece doesn't compile. Where no line writes the cell, it is the centre of style space, as
 * a voice reading it plays. Sliders (`free(…)`) read at their values as written.
 */
export declare function styleAt(source: string, seconds: number, options?: CompileOptions & {
    readonly env?: Env;
    readonly cell?: string;
}): readonly number[] | null;
