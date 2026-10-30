/**
 * A compiled program: its types (cells as helices over grids, clocks, outputs, tapes), its
 * constants, and the small readers of a cell (picks, envelopes, positional meters). compile()
 * makes one (compile.ts, compiler/); helix.ts reads it through the shifts. What the cells mean is
 * on the language pages (docs/language/overview.md).
 */
import { pickLabel } from './ast';
import type { Atom, Binding, Braid, Diagnostic, FreeSpec, Pick, RateOp, Span, GateSpec, Move } from './ast';
import type { ShowPlugin } from './plugins';
import type { Meter } from './meter';
import type { Sort } from './algebra';

export const ROOT = 'fifths12TET';
/**
 * What a bare `over=key` names until compile reads it as the piece's main key (#124, declare.ts): no cell can be called
 * this, so a piece's own `&key` is never it.
 */
export const MAIN_KEY = 'key:main';
/**
 * The interface names: what fragments agree on and a union never renames (decision 047, point 2; more as facets need them):
 * the meter and its tempo, the key and its tonic (#290), the harmony. A named use's closure leaves one the piece defines
 * to the piece (decision 060), as it left the main key `over=key` read.
 */
export const INTERFACE_NAMES: readonly string[] = ['&bar', '&tempo', '&key', '&tonic', '&harm'];
/**
 * The most notes a cell's braid may stand for, every &ref spliced in (`&b &a!4000` with `&a 0!4000` is 16 million):
 * more is a compile error. The largest in examples/ is 1,120 (bwv847's &tempo).
 */
export const MAX_EVENTS = 50_000;
/**
 * The most notes a second a played cell may start (`step=1000000` would plan millions for a few seconds): more is a
 * compile error. The busiest in examples/ is 84 a second (dtmf's &dial); audio-rate cells (voices, wave shapes)
 * start no notes and aren't counted.
 */
export const MAX_NOTES_PER_SECOND = 2_000;
/**
 * How deep cells may be spliced into each other (`&a &b`, `&b &c` …, a chain of &refs): deeper is a compile error
 * (5,000 deep overflowed the stack). The deepest in examples/ is 4 (the Lullaby's &roll).
 */
export const MAX_SPLICE_DEPTH = 256;
/** The fields a label= can hold, {tempo} or {&key:tonic} (filled in by layout/labels.ts); any other is a warning. */
export const LABEL_FIELDS = ['name', 'notes', 'tonic', 'mode', 'steps', 'tempo', 'shift'] as const;
/** A voice without a rate loops at middle C. */
export const DEFAULT_FREQ = 261.63;

/** A step of a braid as written (before shifting). */
export interface Unit {
  readonly atom: Atom;
  readonly repeat: number;
  readonly subdivide: number;
  readonly elongate: number;
  /** x?p: the probability it is dropped; null: the cell's chance=. */
  readonly chance?: number | null;
  /** &x:0:g: a hit's own gain (.5 half). */
  readonly level?: number;
}

export interface ResolvedCell {
  readonly name: string;
  readonly span: Span;
  /** A bare grid (root). */
  readonly root: boolean;
  /** The default grid, added because the code didn't declare it. Not drawn. */
  readonly implicit: boolean;
  /** Table its numbers index. null: a root, or no over= (it reads through whoever splices it). */
  readonly over: string | null;
  /** Shift on the over= reference (`over=&scale[<<]`). */
  readonly overShift: number;
  /** Table used to show the cell on its own: over, else its first player's, else the default grid. */
  readonly context: string;
  /** Grid size (roots) / number of entries (tables). */
  readonly cycle: number;
  /**
   * cycle= as written: where a turning cell wraps. Without it a cell's turning
   * comes round after its own length (decision 008); a larger cycle= keeps it climbing.
   */
  readonly wrap: number | null;
  /** An unnamed cell (`&( … )`): its body as written. */
  readonly lambda: string | null;
  /** Numbers left free for the performer (free(…)): sliders on the node. */
  readonly frees: readonly FreeSpec[];
  /** laps=n: it plays n laps, then nothing it drives sounds. */
  readonly laps: number | null;
  /** loop=: it turns its whole braid at its rate (an oscillation), rather than stepping. */
  readonly loops: boolean;
  /** What a bare x? means here: the probability it is dropped (½ unless chance= says). */
  readonly chance: number;
  /** Its sequence of chance (seed=, else from its name). */
  readonly seed: number;
  /** size=: how large it's drawn, against the others (1). */
  readonly size: number;
  /** tags= on a cell: its clusters in the graph (on the piece's card, tags= are the piece's). */
  readonly tags: readonly string[];
  /** On a note: the cells it explains (about=), drawn as links from the note. */
  readonly about: readonly string[];
  /** base=: the cell it is a copy of (decision 026; resolved when parsed), and the transposition written with it. */
  readonly base?: { readonly name: string; readonly transpose?: number; readonly degree?: number };
  /** Steps a beat, from its meter (its steps over its beats: beat=, or meter(…)): a meter's bpm counts beats, 1 = every step a beat. */
  readonly beat: number;
  /** A bar, meter(…) or scan(…), compiled: its groups by level (0 the bar, 1 a beat … 4 finest) and where its steps fall. */
  readonly meter: Meter | null;
  /**
   * A resonator's exciters (its braid): each a tuned element — a semitone shift from its fundamental,
   * with settings of its own (from a cell it refers to: hard=, ring=, body=). None written: the twelve
   * semitones, so every body plays chromatically.
   */
  readonly exciters?: readonly Exciter[];
  /** show= as written: how it's shown (the layout decides what fits). */
  readonly show: string | null;
  /** Where show= is written (a warning about it points there). */
  readonly showSpan?: Span;
  /** label= as written: a name to show, or (alone) a note in the graph. */
  readonly label: string | null;
  /** Only a label: an explanatory note, not a cell that does anything. */
  readonly note: boolean;
  /** A voice's own volume (env=) and pitch (pitch=): acting on every note it plays. */
  readonly env: string | null;
  readonly pitch: string | null;
  readonly braid: Braid['kind'];
  readonly units: readonly Unit[];
  /** A scan(…): its intervals, and its lap (their sum) — the cell climbs by that lap. */
  readonly scan: { readonly lap: number; readonly steps: readonly number[] } | null;
  /** shift= as written. */
  readonly shift: number;
  /**
   * The key of a `scale(…, &tonic)` (#290): the cell its tonic is read from. Its `shift` is the tonic's first note; a
   * stepped tonic (`&tonic step=1m/8 D F`, #301) turns it, the note in force its shift (`shiftsAt`).
   */
  readonly tonic?: string;
  /** `off` as written. */
  readonly off: boolean;
  /** `oneshot` as written: a voice's note lasts its envelope's attack and decay, not its step. */
  readonly oneshot: boolean;
  /** `glide=` as written, seconds (0 off): a run of tied notes is one note, its envelope once, each next sliding there (realize.ts). */
  readonly glide: number;
  /** Cells spliced in with &ref, with how many slots reference each. */
  readonly children: ReadonlyMap<string, number>;
  /** Length in steps (a &ref takes the referenced cell's steps). */
  readonly steps: number;
  /** Steps taken by each unit as written (for picks like &x[1:3]). */
  readonly unitSteps: readonly number[];
  /** Whether the braid has numbers of its own (vs. only &refs and rests). */
  readonly hasValues: boolean;
  /** How far each step moves it (stride=), 1 by default. */
  readonly stride: number;
  /**
   * step=/loop= driven by another cell: the driver, and its ratio as written (the edge's rate). A tap of a meter
   * (`step=16n`, decision 040) names the meter as its driver, and the tap as written (`tap`: `16n`, `pulse`, `beat`).
   */
  readonly step: { readonly driver: string; readonly cycle: boolean; readonly whole: boolean; readonly chain: readonly RateOp[]; readonly tap?: string } | null;
  /**
   * Parameters given as a clock (`delaytime=&bar*4/3`, `length=`, `at=`: attributes.ts TIME_PARAMS), by key: the clock
   * tapped and its ratio as written (as step=). Compiled to seconds in `params`; kept for the graph's wire (a tap of the clock).
   */
  readonly paramClocks: Readonly<Record<string, NonNullable<ResolvedCell['step']>>>;
  /** map= (how values become output): amp, sin or a table. */
  readonly map:
    | { readonly kind: 'amp' | 'lin' | 'sample' | 'adsr' | 'db' | 'role' }
    | { readonly kind: 'edo'; readonly period: number }
    /** A grid of ratios: one period's tones, then the period (the last). */
    | { readonly kind: 'ratios'; readonly ratios: readonly number[] }
    | { readonly kind: 'table'; readonly table: string }
    /** A MIDI card (map=midi): its entries are channels in order, or all on `channel`; sent to output slot `port`. */
    | { readonly kind: 'midi'; readonly channel: number | null; readonly port: number }
    | null;
  /** A mix cell (`&mix [&theme * &lead, …]`): its voices, as written. */
  readonly mix: readonly Binding[] | null;
  /** The sound card (`map=sample`): its entries are channels. */
  readonly sink: boolean;
  /**
   * What the mix algebra reads it as (decision 006, `compiler/sorts.ts`): a sound (`signal`: a voice, a mix, a gate, a
   * pattern through a kit, a read head), a braid at audio rate (`wave`), a `pitch`, a `volume`, or `plain`. What a
   * frontend asks "does it sound?" of (decision 064).
   */
  readonly sort: Sort;
  /** A MIDI card's (map=midi) products written on it, typed, unit by unit (null: a unit that isn't a chord of them). */
  readonly chords?: readonly (readonly Binding[] | null)[];
  /** The clock this cell's stepping comes from, and its shifts per clock step. */
  readonly clock: string | null;
  readonly rate: number;
  /** dough sound parameters. */
  readonly params: Readonly<Record<string, number | string>>;
  /** Parameters that move: a range scaled by cells (or, no range, one cell's values as they are). */
  readonly paramCells: Readonly<Record<string, { readonly range: readonly [number, number] | null; readonly factors: readonly string[] }>>;
  /** Used as the voice of an out(…), or has sound parameters. */
  readonly voice: boolean;
  /** Voice: turns of its braid per second at pitch 0 (loop=f, or step=r over its k steps). */
  readonly freq: number;
  /** A braid of voices only: indexed by number, like a drum kit. */
  readonly kit: boolean;
  /** A gate (#234): whose notes it plays, its levels and gain, its receivers (declare.ts). */
  readonly gate?: GateSpec;
}

/** A cell moved at a rate (step=84bpm, loop=2). */
/**
 * Resonators' bodies: their modes — ratio to the fundamental, share of the ring, level. A fork: its
 * tone and the clang (6.27×, gone at once); a bell: hum, prime, tierce, quint, nominal …; a free bar
 * (1 : 2.756 : 5.404 : 8.933); a plate (dense, inharmonic); a box (a few low, short modes).
 */
export const BODIES: Record<string, readonly (readonly [number, number, number])[]> = {
  fork: [
    [1, 1, 1],
    [6.27, 0.03, 0.35],
  ],
  bell: [
    [0.5, 1, 0.5],
    [1, 0.8, 1],
    [1.2, 0.6, 0.7],
    [1.5, 0.5, 0.45],
    [2, 0.45, 0.6],
    [2.5, 0.3, 0.35],
    [2.67, 0.28, 0.3],
    [3, 0.22, 0.25],
  ],
  bar: [
    [1, 1, 1],
    [2.756, 0.45, 0.5],
    [5.404, 0.22, 0.3],
    [8.933, 0.12, 0.18],
  ],
  plate: [
    [1, 1, 0.8],
    [1.58, 0.8, 0.7],
    [2.24, 0.7, 0.6],
    [2.92, 0.55, 0.55],
    [3.15, 0.5, 0.5],
    [3.88, 0.4, 0.4],
    [4.47, 0.35, 0.35],
    [5, 0.3, 0.3],
  ],
  box: [
    [1, 1, 1],
    [1.42, 0.7, 0.6],
    [1.91, 0.5, 0.45],
    [2.53, 0.35, 0.3],
  ],
  // a tine (a bar clamped at one end, a kalimba's): its tone, and overtones near 5.9× and 17.6× that die at once
  tine: [
    [1, 1, 1],
    [5.93, 0.12, 0.35],
    [17.6, 0.03, 0.12],
  ],
  // a pipe closed at one end: odd harmonics only, the higher dying sooner
  pipe: [1, 3, 5, 7, 9, 11, 13].map((n) => [n, 1 / Math.sqrt(n), 1 / n] as const),
  // a stiff wire: harmonics, stretched a little sharp (fₙ = n f √(1 + B n²), B .0006)
  wire: Array.from({ length: 12 }, (_, i) => i + 1).map((n) => [n * Math.sqrt(1 + 0.0006 * n * n), 1 / (0.6 + 0.4 * n), 1 / n] as const),
  // a spring: not modes — a chirp (high before low) round a loop; drawn with one ring
  spring: [[1, 1, 1]],
};

export interface Exciter {
  readonly shift: number;
  readonly params: Readonly<Record<string, number | string>>;
}

/**
 * pan= as channel gains: 0 left, .5 centre, 1 right, the far side fading while the near one stays full
 * (a balance: centre is [1, 1], as without pan=). Any pair of channel gains is one gain and one pan.
 */
export function balance(pan: unknown): [number, number] {
  if (typeof pan !== 'number') return [1, 1];
  const p = Math.min(1, Math.max(0, pan));
  return [Math.min(1, 2 * (1 - p)), Math.min(1, 2 * p)];
}

/** What isn't a voice's: the sound card's level, and a clock's physics. */

export interface Clock {
  readonly cell: string;
  /** Steps per second. */
  readonly perSecond: number;
  /** A positional meter (a scan, a grid): its entries place its steps within the bar. */
  readonly positional: boolean;
  /** A belt (belt= on a driven cell): it follows its driver at this ratio through a spring, not rigidly. */
  readonly belt?: { readonly driver: string; readonly rate: number };
  /** A bare swing= on a clock that is not a meter (a list at a rate): of each pair of its steps, the second starts this far through. */
  readonly swing?: number;
  /**
   * A meter's swing (#18) on its own steps: where each of a bar's steps is played, in its steps (`swungSteps`). A tap reads
   * the meter without it and swings its own positions (`swingAt`).
   */
  readonly swung?: readonly number[];
  /**
   * A tap of a meter (decision 040: `step=16n`, `step=beat`): its steps at these positions, in the meter's steps, in a lap
   * of `lap` of them (the bar, or cycle= bars), laid through the meter's time map. `cell` is the meter. `written`: the
   * positions as written, before a swung meter's swing (#287: where a level line is read for a note); absent when the same.
   */
  readonly tap?: { readonly meter: string; readonly positions: readonly number[]; readonly lap: number; readonly written?: readonly number[] };
}

/** A pitch term of an out sum. */
interface PitchTerm {
  readonly cell: string;
  readonly pick: Pick | null;
  readonly shift: number;
  readonly sign: 1 | -1;
  /**
   * A kit read that doesn't start notes (decision 029): held under the term that does, its number picks the kit's
   * member; it adds no pitch.
   */
  readonly picks?: true;
}

/** A resolved out(&voice, &theme + &mod …). */
export interface Output {
  readonly id: string;
  /** Voice cell, or kit cell (numbers pick a voice). */
  readonly voice: string;
  readonly kit: boolean;
  /** The term that triggers notes. */
  readonly cell: string;
  readonly pick: Pick | null;
  readonly shift: number;
  readonly sign: 1 | -1;
  /** Further terms: their pitch is added while notes sound. */
  readonly mods: readonly PitchTerm[];
  /** Volume streams (map=amp): their values multiply the level while notes sound; rests are silence. */
  readonly levels: readonly PitchTerm[];
  /** The term that starts notes is a volume stream, not a pitch: notes sound at pitch 0, at its level. */
  readonly gate: boolean;
  /**
   * A voice alone (decision 028): nothing in its product starts notes, so it plays one note at its own pitch, held from
   * where play starts until play stops or the piece ends. `cell` is the voice itself (it has no clock: nothing steps it).
   */
  readonly drone?: true;
  /** Constant semitones from numbers in pitch sums. */
  readonly offset: number;
  /** Level per channel [left, right], from the gains in the mixes the sound card plays. */
  readonly gains: readonly [number, number];
  /** The mix cells and sound card it goes through (for drawing). */
  readonly via: readonly string[];
  /** Instruments (mixes used like voices) it plays through. */
  readonly through: readonly string[];
  /** Per-note envelope from a map=adsr factor (seconds; sustain a level), or null for the voice's own. */
  readonly envelope: { readonly attack: number; readonly decay: number; readonly sustain: number; readonly release: number } | null;
  /** The map=adsr cell it comes from. */
  readonly envelopeCell: string | null;
  /** Where its level comes from: each mix and sound card it's in, and what that mix adds per channel. */
  readonly parts: readonly {
    readonly mix: string;
    readonly sink: string;
    readonly gains: readonly [number, number];
    /**
     * The sound card's entry it comes through (a term of the card's mix, or of a channel's: `&bassOut`, `&crackle * &vinyl
     * * .04`): its channel, its place, and the cells it names (`crackle*vinyl`). What a render's stem by entry is (decision 062).
     */
    readonly entry?: { readonly channel: number; readonly index: number; readonly label: string };
  }[];
  /**
   * Selectors it plays through (a cell reading a table of sections, the section that steps it: decision 016): it sounds while each picks its
   * entry, and starts again from its beginning each time it's picked — reading a table splices.
   */
  readonly select: readonly {
    readonly cell: string;
    readonly entry: number;
    readonly part: string;
    /** A band's selector (decision 061): `part` is the performer's entry, a gate or its role; its time runs on unless restart= says. */
    readonly performer?: true;
  }[];
  /** A send: played into what it feeds (a resonator, a tape), not heard from its voice itself. */
  readonly silent?: boolean;
  /** Where it goes out as MIDI (map=midi cards); absent: on no MIDI card. Only here, and on no sound card: sent, and heard at its entry's gain (decision 064). */
  readonly midi?: readonly MidiDest[];
  /** Played off a tape: its source's notes, through the tape (a read head at= after the write head). */
  readonly tape?: { readonly head: string; readonly tape: string; readonly at: number; readonly length: number; readonly erase: number };
  readonly span: Span;
}

/** One place an output goes out as MIDI: a MIDI card's entry, its channel and output slot, at the gain of its product there. */
export interface MidiDest {
  /** The MIDI card (map=midi). */
  readonly card: string;
  /** A mix named as the entry (`&synth map=midi &lead`), whose switching off takes it away; null: written on the card. */
  readonly mix: string | null;
  readonly channel: number;
  /** The output slot (the MIDI page's output of that number, 1 the first). */
  readonly port: number;
  /** The numbers in its product on the card (velocity reads them, as it reads a sound card's gains). */
  readonly gain: number;
}

/** A MIDI card: a cell with map=midi, whose entries are MIDI channels. */
export const isMidiCard = (c: { readonly map: ResolvedCell['map'] } | undefined): boolean => c?.map?.kind === 'midi';

/** A tape that records sound (write= a mix): its loop and colour, for the audio. */
export interface AudioTape {
  readonly name: string;
  readonly source: string;
  readonly length: number;
  readonly erase: number;
  /** The loss filter's corner (Hz), saturation drive, hiss level. */
  readonly tone: number;
  readonly drive: number;
  readonly hiss: number;
  /** Print-through: a faint pre-echo (its level), printgap= tape-seconds before each head. */
  readonly print: number;
  readonly printgap: number;
  /** Dropouts: brief gaps in the playback, about this many a second. */
  readonly dropout: number;
  /** Each head: where it sits, and how far and fast it wanders (a flying head). */
  readonly heads: readonly { readonly head: string; readonly at: number; readonly wander: number; readonly wanderhz: number }[];
}
/** A resonator in a mix on its own (not struck there): its ringing, at a level per channel. */
export interface Resonance {
  readonly cell: string;
  readonly gains: readonly [number, number];
  /** Its gains by the mix and sound card they go through (as an output's): muting either takes its share away. */
  readonly parts: Output['parts'];
  /** The mixes it plays through on the way (as an output's): one switched off silences it. */
  readonly through: Output['through'];
}
/** A read head of a sound tape in a mix: what it reads, at a level per channel. */
export interface TapeReturn {
  readonly head: string;
  readonly tape: string;
  readonly gains: readonly [number, number];
  /** Its gains by the mix and sound card they go through (as an output's): muting either takes its share away. */
  readonly parts: Output['parts'];
  /** The mixes it plays through on the way (as an output's): one switched off silences it. */
  readonly through: Output['through'];
}

/** A cell a text uses and declares nowhere (`&harm`): its name, without the `&`, and each place it is used. */
export interface UnknownCell {
  readonly name: string;
  readonly at: readonly Span[];
}

export interface CompileResult {
  readonly ok: boolean;
  readonly tapes: readonly AudioTape[];
  readonly returns: readonly TapeReturn[];
  readonly resonances: readonly Resonance[];
  readonly cells: ReadonlyMap<string, ResolvedCell>;
  readonly clocks: ReadonlyMap<string, Clock>;
  readonly outputs: readonly Output[];
  /** Node ids of cells written `off`. */
  readonly off: ReadonlySet<string>;
  readonly diagnostics: readonly Diagnostic[];
  /** The cells the text uses and declares nowhere (the `Unknown cell &name` errors, as data), each with where it is used; in the order first reported. */
  readonly unknown: readonly UnknownCell[];
  /** The `show=` plugins the piece carries, by name (plugins.ts). */
  readonly plugins: ReadonlyMap<string, ShowPlugin>;
  /** Sections of an arrangement (decisions 016 and 044), each to its table: what a selector reading the table switches. */
  readonly sections?: ReadonlyMap<string, string>;
  /** The meter a tap that names none reads (decision 040): the first meter in the text with a tempo of its own. */
  readonly mainMeter?: string;
  /** The key a bare `over=key` reads, the old way (#124; #301, decision 060): the first cell in the text whose braid is `scale(…)`. */
  readonly mainKey?: string;
  /**
   * The built-in card's name, when the piece writes no card (decision 028): a sound card (`map=sample`) compile added,
   * which every sound nothing reads goes to. It is in `cells` (implicit: not drawn, in no line, never edited).
   */
  readonly builtinCard?: string;
  /** What each of the piece's `use` lines resolved to and gave it (decision 054), in the order written; absent for none. */
  readonly uses?: readonly Used[];
  /** Its gates, the performers (decision 058), in the order written: who plays which part, on what. */
  readonly performers: readonly Performer[];
}

/** A gate, as a performer (decision 058), any name, and its role a role cell's (decision 061): `&bassOut play=&bassline^$-12 level=.8 &bassV`. */
export interface Performer {
  /** The gate's name (`bassOut`). */
  readonly name: string;
  /** The role cell's name that lists it (decision 061: `&comp map=role &violin2`), or none: a performer with no role, which plays as written. */
  readonly role?: string;
  /** The part it plays: the cell its play= names (`bassline`). */
  readonly part: string;
  /** What it moves the part by (`play=&bassline^$-12`: `{ transpose: -12 }`), or none. */
  readonly move?: Move;
  /** The voices it plays the part on, as its braid writes them (a voice, a kit, a chord of voices). */
  readonly voices: readonly string[];
}

/**
 * Where a piece's `use` lines are read from (decision 054): a fragment's text by its id, and the hash its lockfile
 * recorded for it where it has one, or null where the library has none of that id. A library that no longer has the
 * version hashed gives its current one: the compile warns.
 */
export type Resolve = (id: string, hash?: string) => string | null;

/** A lockfile's entry (decision 054): the hash a piece's `use` of an id resolved to when it was saved. */
export interface Locked {
  readonly id: string;
  readonly hash: string;
}

/** What a compile reads besides the text: the resolver of its `use` lines, and the hashes its lockfile recorded. */
export interface CompileOptions {
  readonly resolve?: Resolve;
  readonly locked?: readonly Locked[];
}

/** A `use` line, as compiled (decisions 054, 059). */
export interface Used {
  /** The fragment's id, as written. */
  readonly id: string;
  /** The names it asks for (`use &bd, &sd from …`: `['&bd', '&sd']`), or null for every name (`use * from …`). */
  readonly names: readonly string[] | null;
  /** The line it is on. */
  readonly span: Span;
  /** The hash of the text it resolved to (`e1:…`: the text up to layout, decision 050), or null where it didn't resolve. */
  readonly hash: string | null;
  /**
   * The names it gave the piece (`&bd`), in the order the expansion writes them: its own lines, then those it used. For a
   * named use, the names it asks for and the fragment's lines they read (its helpers), less what the piece defines.
   */
  readonly gave: readonly string[];
  /** The names it asks for (or, for `*`, defines) that the piece's own lines define instead. */
  readonly overrode: readonly string[];
}

/** Shift of every cell; missing names use the code's shift=. */
export type Shifts = (name: string) => number;
export const codeShifts =
  (result: CompileResult): Shifts =>
  (name) =>
    result.cells.get(name)?.shift ?? 0;

/** Values the environment provides to the code (loop=SAMPLE_RATE, loop=A4). */
export interface Env {
  readonly SAMPLE_RATE: number;
  /** Concert pitch: every note name (C4, C#3, Bb2 …) is tuned from it, equal-tempered. */
  readonly A4: number;
  readonly [name: string]: number;
}
export const DEFAULT_ENV: Env = { SAMPLE_RATE: 48000, A4: 440 };

const LETTERS: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
/** Frequency of a note name (`A4`, `C#3`, `Bb2`, `E-1`) tuned from A4, or null if it isn't one. */
export function noteFrequency(name: string, a4 = 440): number | null {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(name);
  if (!m) return null;
  const semis = LETTERS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (parseInt(m[3], 10) - 4);
  return a4 * Math.pow(2, semis / 12);
}

/** Unit indices a pick selects from n units, Python-style; null if it selects nothing (or is out of range). */
export function pickIndices(n: number, pick: Pick | null): number[] | null {
  if (!pick) return Array.from({ length: n }, (_, i) => i);
  if (pick.kind === 'at') {
    const i = pick.i < 0 ? n + pick.i : pick.i;
    return i >= 0 && i < n ? [i] : null;
  }
  // Python's slices, step included: [::-1] runs backwards from the end
  const step = pick.step ?? 1;
  const norm = (x: number) => (x < 0 ? n + x : x);
  const out: number[] = [];
  if (step > 0) {
    const from = pick.from === null ? 0 : Math.max(0, Math.min(n, norm(pick.from)));
    const to = pick.to === null ? n : Math.max(0, Math.min(n, norm(pick.to)));
    for (let i = from; i < to; i += step) out.push(i);
  } else {
    const from = pick.from === null ? n - 1 : Math.max(-1, Math.min(n - 1, norm(pick.from)));
    const to = pick.to === null ? -1 : Math.max(-1, Math.min(n - 1, norm(pick.to)));
    for (let i = from; i > to; i += step) out.push(i);
  }
  return out.length ? out : null;
}

/**
 * The units a pick takes, as indices into the braid as written: a relative pick counts from the braid turned by
 * `shift` (its entry i is the written unit i + shift, round the braid), an absolute one (`$`) as written.
 */
export function pickedUnits(n: number, pick: Pick | null, shift: number): number[] | null {
  const idx = pickIndices(n, pick);
  return !idx || !pick || pick.abs || !n ? idx : idx.map((i) => (((i + shift) % n) + n) % n);
}

/** Steps taken by a pick from a cell (the whole cell when there's no pick), turned as the code has it. */
export function pickSteps(c: ResolvedCell, pick: Pick | null): number | null {
  if (!pick) return c.steps;
  const idx = pickedUnits(c.units.length, pick, c.shift);
  return idx ? idx.reduce((a, i) => a + c.unitSteps[i], 0) : null;
}

/** Why a pick takes nothing, in words: an index past the end, a slice that starts past it, a slice that ends before it starts. */
export function pickProblem(name: string, pick: Pick | null, steps: number): string {
  const at = `&${name}${pickLabel(pick)}`;
  const has = `&${name} has ${steps} step${steps === 1 ? '' : 's'}`;
  if (!pick || pick.kind === 'at') return `${at} picks nothing: ${pick && pick.i < 0 ? 'before the start' : 'past the end'}, ${has}`;
  const step = pick.step ?? 1;
  const norm = (x: number) => (x < 0 ? steps + x : x);
  if (step > 0 && pick.from !== null && norm(pick.from) >= steps) return `${at} picks nothing: it starts past the end, ${has}`;
  return `${at} picks nothing: ${step > 0 ? 'it ends before it starts (a slice runs forwards unless its step is negative: [::-1])' : 'it ends after it starts (a negative step runs backwards)'}, ${has}`;
}

/** The envelope a map=adsr cell writes (its four values), or null if it isn't one. */
export function adsrOf(c: ResolvedCell): { attack: number; decay: number; sustain: number; release: number } | null {
  if (c.map?.kind !== 'adsr') return null;
  const v = c.units.map((u) => (u.atom.kind === 'note' ? u.atom.value : NaN));
  if (v.length !== 4 || v.some((x) => !(x >= 0))) return null;
  return { attack: v[0], decay: v[1], sustain: Math.min(1, v[2]), release: v[3] };
}

/** Scans (meters) and grids place their steps within the bar; a plain list steps evenly. */
export function isPositional(c: ResolvedCell): boolean {
  return c.root || c.scan !== null;
}

/**
 * Does this cell keep time as a meter (#123)? Its compiled bar (`ResolvedCell.meter`, written `meter(…)` or `scan(…)`, one
 * `Meter` since #16) drives a clock of its own, not a tap of another's. What the graph draws as a meter, with its net.
 */
export function keepsTime(result: CompileResult, name: string): boolean {
  const clock = result.clocks.get(name);
  return !!clock && clock.cell === name && !clock.tap && !!result.cells.get(name)?.meter;
}
