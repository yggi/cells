// The host globals the language uses, and only these: every JavaScript host has them (browsers, workers, node). The
// purity gate (tsconfig.pure.json) typechecks with no host types at all, so a new one is a choice made here, on purpose.
// The shapes are the slice the code reads (the pattern is ep133-sysex's src/host.d.ts).

/** A monotonic clock in milliseconds: the engine host times its own work. */
declare const performance: { now(): number };

/** Text from bytes: a MIDI file's track names and texts. */
declare class TextDecoder {
  constructor(label?: string, options?: { fatal?: boolean });
  decode(input?: Uint8Array): string;
}

/** Bytes from text: a MIDI file's texts, when one is written. */
declare class TextEncoder {
  encode(input?: string): Uint8Array;
}
