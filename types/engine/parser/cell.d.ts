import type { CellDecl, MapSpec, ParamCells, Ref, Span, StepSpec } from '../ast';
import { CORE } from '../attributes';
import { LineScanner } from './scanner';
import { type Syntax } from './syntax';
/** What a cell's attributes have set so far, as its line is read. */
interface Body {
    over: Ref | null;
    base: Ref | null;
    shift: number | null;
    cycle: number | null;
    step: StepSpec | null;
    map: MapSpec | null;
    stride: number | null;
    env: Ref | null;
    pitch: Ref | null;
    show: string | null;
    label: string | null;
    laps: number | null;
    title: string | null;
    tags: string | null;
    tier: number | null;
    about: Ref[] | null;
    chance: number | null;
    seed: number | null;
    size: number | null;
    swing: {
        level: string;
        share: number;
    }[] | null;
    readonly params: Record<string, number | string>;
    readonly paramSpans: Record<string, Span>;
    readonly paramCells: Record<string, ParamCells>;
    readonly paramClocks: Record<string, StepSpec>;
}
/** Reads one attribute's value (the scanner is just past `key=`) into the body. */
type Reader = (s: LineScanner, b: Body, word: string, at: number) => void;
/** An attribute's reader, with how it's written and examples (its meaning is in attributes.ts). */
interface Key {
    readonly read: Reader;
    readonly form: string;
    readonly examples: readonly string[];
}
/** How a cell is shown (never how it sounds); the default for everything below it. Meanings: layout/show.ts. */
export declare const SHOWS: readonly ["braid", "pattern", "equal", "notes", "midi", "do", "degrees", "table", "scale", "mode", "key", "grid", "meter", "spectrum", "wave", "levels", "adsr", "mix", "note", "petal", "off", "matrix", "lfo", "brightness"];
/** Naming conventions, after a colon: show=notes:flats. */
export declare const SHOW_CONVENTIONS: Readonly<Record<string, readonly string[]>>;
/** The core attributes, each with a syntax of its own: the parser reads a cell's line through this table. */
export declare const KEYS: Readonly<Record<keyof typeof CORE, Key>>;
/** The lines' own syntax: what a line is, comments, continuing, off. */
export declare const LINE_SYNTAX: readonly Syntax[];
/** A cell's body: attributes and braid, up to the end of the scanner's text. */
export declare function parseBody(s: LineScanner, head: Ref): CellDecl;
export declare function parseCell(s: LineScanner): CellDecl;
export {};
