/** Source location, 1-based line and column. */
export interface Span {
  readonly line: number;
  readonly col: number;
  readonly len: number;
}

export interface Diagnostic {
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly span: Span;
}

/**
 * A pick from a braid as written (ignoring any rotation), Python-style:
 * `&x[0]` first token, `&x[-1]` last, `&x[1:3]`, `&x[-1:]`, `&x[:-1]` slices,
 * `&x[::-1]` backwards (retrograde), `&x[::2]` every other.
 */
export type Pick =
  | { readonly kind: 'at'; readonly i: number }
  | { readonly kind: 'slice'; readonly from: number | null; readonly to: number | null; readonly step?: number | null };

export const pickLabel = (p: Pick | null): string =>
  !p ? '' : p.kind === 'at' ? `[${p.i}]` : `[${p.from ?? ''}:${p.to ?? ''}${p.step ? `:${p.step}` : ''}]`;

/** `[<<n]` / `[>>n]` (n defaults to 1): shifted back / forward, on top of the cell's own rotation. */
export const shiftLabel = (shift: number): string =>
  shift === 0 ? '' : `[${shift < 0 ? '<<' : '>>'}${Math.abs(shift) === 1 ? '' : Math.abs(shift)}]`;

export const refLabel = (r: { pick: Pick | null; shift: number; transpose?: number }) =>
  (pickLabel(r.pick) || shiftLabel(r.shift)) + (r.transpose ? `^${r.transpose}` : '');

/**
 * `&name`, optionally viewed through brackets: a pick from the braid as
 * written (`&name[0]`, `&name[-1:]`) or a relative shift (`&name[<<]`,
 * `&name[>>2]`) — one or the other.
 */
export interface Ref {
  readonly name: string;
  readonly pick: Pick | null;
  readonly shift: number;
  /** ^n: what it plays, n grid steps up (^-n down), after its tables. */
  readonly transpose?: number;
  readonly span: Span;
}

/**
 * A number is an index into the cell's `over` (decimals allowed on a root).
 * Accidentals (`6#`, `3b`) move one step on the grid below that.
 * `&cell` splices the cell's braid; `&cell[i]`, `&cell[a:b]` splice part of it as written.
 */
export type Atom =
  | { readonly kind: 'note'; readonly value: number; readonly alter: number }
  | { readonly kind: 'rest' }
  | { readonly kind: 'chord'; readonly notes: readonly number[]; readonly alters: readonly number[] }
  /** [a|b|c]: one of them, chosen afresh each time round (reproducibly). */
  | { readonly kind: 'choice'; readonly values: readonly number[]; readonly alters: readonly number[] }
  /** transpose: grid steps up (or down) after its tables: &subject^7, &subject^-12. */
  | { readonly kind: 'ref'; readonly name: string; readonly pick: Pick | null; readonly shift: number; readonly transpose?: number }
  /** A mix chord `[&theme * &lead, …]`: its expressions as written; compile types them (algebra.ts). */
  | { readonly kind: 'mix'; readonly exprs: readonly Expr[] };

/** An expression in a mix chord, as written: sums and products of cells and numbers. */
export type Expr =
  | { readonly k: 'ref'; readonly ref: Ref }
  | { readonly k: 'num'; readonly value: number; readonly span: Span }
  | { readonly k: 'sum'; readonly items: readonly { readonly e: Expr; readonly sign: 1 | -1 }[]; readonly span: Span }
  | { readonly k: 'prod'; readonly factors: readonly Expr[]; readonly span: Span };

/**
 * One step of a braid, with Strudel-style modifiers:
 *  - `x!n` repeat: n copies, each taking a full footprint
 *  - `x*n` subdivide: n copies squeezed into one footprint
 *  - `x@n` elongate: one copy stretched over n footprints
 */
export interface Token {
  readonly atom: Atom;
  readonly repeat: number;
  readonly subdivide: number;
  readonly elongate: number;
  /** x?p: it sounds with probability p (x? alone: the cell's chance=, else ½). */
  readonly chance?: number | null;
  readonly span: Span;
}

/** What sits in a cell's grid. */
export type Braid =
  | { readonly kind: 'blank' }
  | { readonly kind: 'list'; readonly tokens: readonly Token[]; readonly perBeat?: number }
  /** Running totals of intervals: scan(2 2 1 2 2 2 1) → 0 2 4 5 7 9 11, lap 12. Scales, meters, rhythms. */
  | { readonly kind: 'scan'; readonly steps: readonly number[]; readonly span: Span }
  /** One cycle of a sine in n steps: sin(2πi/n), −1 … 1. */
  | { readonly kind: 'sin'; readonly n: number; readonly span: Span };

/**
 * How a cell moves. `step=` counts single steps, `loop=` whole turns of the braid:
 *
 *   step=1 / loop=1               one step / the whole braid per second (also 84bpm, 440hz, 44k,
 *                                 or an environment value: loop=SAMPLE_RATE)
 *   step=&x / loop=&x             one step / the whole braid per step of &x
 *   step=cycle(&x) / loop=cycle(&x)   … per full cycle of &x
 *
 * Driven forms take a chain of `*n` (once per n) and `/n` (n per one), n any
 * positive number, read left to right: `*2/3` is three steps per two.
 */
/** A parameter given by cells: a range scaled by them, or (no range) one cell's values as they are. */
export interface ParamCells {
  readonly range: readonly [number, number] | null;
  readonly factors: readonly Ref[];
  readonly span: Span;
}

export type StepSpec = { readonly whole: boolean } & (
  | {
      readonly kind: 'driven';
      readonly driver: Ref;
      readonly cycle: boolean;
      /** Steps per driver step (or cycle): `*2` ½, `/2` 2, `*2/3` 1.5. */
      readonly ratio: number;
      /** The ratio as written, for drawing: `×2/3`. */
      readonly label: string;
      readonly span: Span;
    }
  | { readonly kind: 'rate'; readonly perSecond: number; readonly span: Span; readonly free?: FreeSpec }
  /** A value the environment provides, like loop=SAMPLE_RATE. */
  | { readonly kind: 'env'; readonly name: string; readonly span: Span }
);

/**
 * map=: how a cell's values become output.
 *   amp     held: a voice's waveform (its range lerped to −1…1), or a volume
 *   lin     the same, ramping from each value to the next
 *   &table  look each value up first
 *   sample  the cell is the sound card: its entries are channels, at the sample rate
 *   edo     the cell is a grid: positions to frequencies, cycle= equal steps to the octave
 *   ed(r)   … to the ratio r instead: ed(5) (Studie II), ed(3/2) (Carlos' alpha), ed(3) (Bohlen–Pierce)
 *   ratios  the cell is a grid whose braid lists one period's tones as ratios, the
 *           last the period: map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2 (just intonation)
 *   db      a volume in decibels: 0 full, −6 about half, −20 a tenth (rests silent)
 *   adsr    an envelope: attack decay sustain release (seconds; sustain a level) for each note
 */
export type MapSpec =
  | { readonly kind: 'amp' | 'lin' | 'sample' | 'adsr' | 'ratios' | 'db'; readonly span: Span }
  /** A grid: cycle= equal steps to the period — 2 (an octave) for map=edo, r for map=ed(r). */
  | { readonly kind: 'edo'; readonly period: number; readonly span: Span }
  | { readonly kind: 'table'; readonly table: Ref; readonly span: Span };

/**
 * free(default, lo..hi): a number the performer may change, within a range —
 * a slider on the node. Moving it rewrites this free(…) in the code. Also
 * free(adagio) etc.: a tempo marking's range, its middle the default.
 */
export interface FreeSpec {
  /** What it sets: a rate (step / loop), shift, stride, or a gain in a mix. */
  readonly key: 'step' | 'loop' | 'shift' | 'stride' | 'gain' | 'interval' | 'chance' | 'text' | 'choice' | 'param';
  /** For key 'param': which setting (lpf, swing …) it is. */
  readonly param?: string;
  readonly value: number;
  /** Written unit of the value and range (bpm, hz, k), or ''. */
  readonly unit: string;
  readonly lo: number;
  readonly hi: number;
  /** Where the whole free(…) is written in the source (to rewrite it). */
  readonly span: Span;
  /** Named choices, one per whole value lo…hi (free(5, 0..15, "1 2 3 A …")): drawn as a keypad. */
  readonly labels?: readonly string[];
  /** A text left free (free("867 5309")): drawn as a text field (key 'text'). */
  readonly text?: string;
}

export interface CellDecl {
  readonly name: string;
  readonly span: Span;
  /** Numbers left free for the performer (sliders). */
  readonly frees?: readonly FreeSpec[];
  /** An unnamed cell, written where it's used (`&( … )`): its body as written. */
  readonly lambda?: string;
  readonly over: Ref | null;
  readonly shift: number | null;
  /** `off`: switched off — silences it and everything that reads through it or plays it. */
  readonly off: boolean;
  readonly step: StepSpec | null;
  readonly map: MapSpec | null;
  /** How far each step moves a stepped table (stride=7 walks a 12-cycle in fifths). */
  readonly stride: number | null;
  readonly cycle: number | null;
  /** A voice's own volume, acting on every note it plays (a map=adsr envelope, or any volume cell). */
  readonly env?: Ref | null;
  /** A voice's own pitch, added to every note it plays (a vibrato). */
  readonly pitch?: Ref | null;
  /** How the cell is shown (never how it sounds): notes, do, scale, pattern … — the default for everything below it. */
  readonly show?: string | null;
  /** A name to show instead of &name — or, on a cell with nothing else, a note in the graph. */
  readonly label?: string | null;
  /** On a note: the piece's title (the first note with one is the piece's card). */
  readonly title?: string | null;
  /** On a note: the piece's tags, comma-separated. */
  readonly tags?: string | null;
  /** On a note: the cells it explains, drawn as links from the note (`about=&fenv`, `about=(&fenv &accent)`). */
  readonly about?: readonly Ref[];
  /**
   * Sound parameters that move: lpf=&sweep (the cell's values are the parameter's),
   * lpf=200..3000 * &fenv * &accent (a range, scaled by cells from 0 to 1 — an
   * envelope among them shapes each note).
   */
  readonly paramCells?: Readonly<Record<string, ParamCells>>;
  /** laps=n: it plays n laps, then nothing it drives sounds (a piece that ends). */
  readonly laps?: number | null;
  /** size=: how large it's drawn (and how much room the layout gives it), against the others (1). */
  readonly size?: number | null;
  /** What a bare x? means here: its probability (½ unless set; free() makes it a slider). */
  readonly chance?: number | null;
  /** A different sequence of chance for this cell. */
  readonly seed?: number | null;
  /** Times given as a clock: delaytime=&bar/2 (an eighth, at whatever the tempo is). */
  readonly paramClocks?: Readonly<Record<string, StepSpec>>;
  /** dough parameters (s=saw lpf=1800 …): a cell with any of these is a voice. */
  readonly params: Readonly<Record<string, number | string>>;
  readonly paramSpans: Readonly<Record<string, Span>>;
  readonly braid: Braid;
}

/** A pitch term acting on a voice: `&theme`, `+ &vibrato`, `- &x`. */
export interface Term {
  readonly ref: Ref;
  readonly sign: 1 | -1;
  /** Written inside a pitch sum (`(&theme + &vibrato)`): a pitch, whatever its map. */
  readonly inSum?: boolean;
}

/**
 * One voice of a mix chord, with everything acting on it (after distributing, algebra.ts):
 *
 *   &mix [(&theme + &vibrato) * &lead * 1.2, &pedal * &bass * 0.8]
 *
 * The voice is the factor that is a sound, wherever it is written; the pitches and
 * volumes acting on it are its terms; numbers are semitones in a sum, a gain in a product.
 */
export interface Binding {
  readonly voice: Ref;
  readonly pitches: readonly Term[];
  /** Constant semitones (numbers inside a pitch sum: `(&theme + 12) * &bass`). */
  readonly offset: number;
  /** Product of the numbers in its product: amplitude. */
  readonly gain: number;
}

export interface ParseResult {
  readonly cells: readonly CellDecl[];
  readonly diagnostics: readonly Diagnostic[];
}
