import type { CompileResult } from '../program';
import type { Rewrite } from '../rewrite';
/** The main meter as even beats (`scan(1 1 1)`, `scan(4 4 4 4)`, `scan(1!5)`) as the signature it is: `meter("3/4")`. */
export declare function evenScan(source: string, result: CompileResult): Rewrite<'meter' | 'swing'>[];
/** A clock of two that lines tap by its pulse to swing (`&swing scan(2 1) step=8n`), as the main meter's swing by it. */
export declare function swingClock(source: string, result: CompileResult): Rewrite<'meter' | 'swing'>[];
