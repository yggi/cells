import { type CompileOptions, type CompileResult } from '../program';
import type { Rewrite } from '../rewrite';
/** The main meter as even beats (`scan(1 1 1)`, `scan(4 4 4 4)`, `scan(1!5)`) as the signature it is: `meter("3/4")`. */
export declare function evenScan(source: string, result: CompileResult): Rewrite<'meter' | 'swing'>[];
/** A clock of two that lines tap by its pulse to swing (`&swing scan(2 1) step=8n`), as the main meter's swing by it. */
export declare function swingClock(source: string, result: CompileResult): Rewrite<'meter' | 'swing'>[];
/**
 * A second clock its readers tap where every tick of it is a tick of a tap of the main meter (#668, `tapClock`): the
 * readers read that tap (`step=&sixteenths:16n` → `step=8n` under alla breve), and the clock goes where nothing else
 * reads it (its line stays where a note is about it). The clock's first 64 ticks are compared with the tap's to 1e-9 s,
 * so a clock slower than S1's window is checked past its first tick (#669's (a)). A clock with a slider of its own
 * (`free(`) isn't folded: two sliders never become one silently.
 */
export declare function tapClock(source: string, result: CompileResult, options?: CompileOptions): Rewrite<'meter' | 'swing'>[];
/**
 * A second meter that is the main one but for its feel (#668, `shadowMeter`): the main meter's own rate (the same cell or
 * the same written rate, never a slider of its own), its bar as long, read only by taps; the main meter takes its swing
 * and legato where it has none, its readers read the main meter's taps, and it goes where nothing else reads it.
 */
export declare function shadowMeter(source: string, result: CompileResult): Rewrite<'meter' | 'swing'>[];
