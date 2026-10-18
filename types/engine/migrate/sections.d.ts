import type { CompileResult as Result } from '../program';
import type { Migration } from './index';
/** A table of sections named &parts: its rename to &sections, if it plays the same notes. */
export declare function sections(source: string, result: Result): Migration[];
