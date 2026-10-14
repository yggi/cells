/** The values with a syntax of their own: step= and loop= (rates, clocks, chains), map= (kinds, grids, tables). */
import type { MapSpec, StepSpec } from '../ast';
import type { LineScanner } from './scanner';
import { type Syntax } from './syntax';
/** step= and loop=: what moves a cell — the forms besides the units. */
export declare const STEP_SYNTAX: readonly Syntax[];
export declare function parseStep(s: LineScanner, whole: boolean): StepSpec;
type MapWord = Exclude<MapSpec['kind'], 'table' | 'edo' | 'midi'> | 'edo' | 'midi';
/** map=: how a cell's values sound (or what kind of cell it is). The parser reads the words from this table. */
export declare const MAP_KINDS: Readonly<Record<MapWord, Syntax>>;
/** The forms of map= besides the words. */
export declare const MAP_SYNTAX: readonly Syntax[];
export declare function parseMap(s: LineScanner): MapSpec;
export {};
