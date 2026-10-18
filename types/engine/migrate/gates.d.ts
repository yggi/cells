import type { CompileResult as Result } from '../program';
import type { Migration } from './index';
/** Each gate written the old way: its rewrite, if it plays the same notes. */
export declare function gates(source: string, result: Result): Migration[];
