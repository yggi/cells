import { type SpanOptions } from './span';
import { type CompileResult, type Shifts } from './program';
import type { Smf } from './midifile';
/** The piece's notes as a MIDI file (to `writeMidi`), and how many notes no MIDI key could carry. */
export declare function pieceMidi(result: CompileResult, shifts: Shifts, muted?: ReadonlySet<string>, name?: string, span?: SpanOptions): {
    smf: Smf;
    dropped: number;
};
