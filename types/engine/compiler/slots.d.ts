/**
 * A pick by name (decision 063): `&env[sustain]`, `&funk[artic]`. The parser reads the name (`Ref.slot`); before
 * anything else compiles, it becomes the slot's position as written (`&env[$2]`), read off the slots the cell's map
 * names (`SLOTS`, style.ts), so no phase after this one sees a name. A cell whose map names no slots, or a name its map
 * lacks, is an error that lists the slots there are; the pick is then dropped (the whole cell is read).
 */
import type { ParseResult } from '../ast';
/** The piece with every pick by name read as its slot's position, and an error for each that can't be. */
export declare function readSlots(parsed: ParseResult): ParseResult;
