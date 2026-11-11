/** The card that sends drum parts on General MIDI's drum channel: the heads of each text given, or of the names given. */
export declare const drumCard: (...parts: readonly (string | readonly string[])[]) => string;
/** The cards that send a bass line on channel 2 through the bass instrument's voice, and sound it beside: its head, or the name given. */
export declare const bassCards: (part: string, head?: string) => string;
