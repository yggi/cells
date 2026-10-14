/**
 * The parameters voices and physical cells understand, with what each means (from the table in
 * attributes.ts). Written as attributes: `&lead s=saw lpf=1800 room=.3` (its envelope is a cell:
 * map=adsr). The sound parameters keep dough's names (https://dough.strudel.cc, as in dough.c /
 * Strudel), and Strudel's and dough's other names for them read as ours (PARAM_ALIASES in attributes.ts); the
 * physical cells' are ours.
 */
export declare const DOUGH_PARAMS: Readonly<Record<string, string>>;
export declare const DOUGH_SOURCES: Readonly<Record<string, 'sine' | 'triangle' | 'sawtooth' | 'square' | 'white' | 'pink' | 'brown'>>;
export declare const RETIRED_PARAMS: Readonly<Record<string, string>>;
