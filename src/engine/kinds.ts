/**
 * What a cell is: its kind (#782). A line's attributes and braid make it a voice, a meter, a gate, a kit, a card …, and
 * that was inferred where it was needed: the sorts of a mix (`compiler/sorts.ts`), the roles an attribute acts on
 * (`compiler/roles.ts`), the Stats page's count (`stats.ts`). This is the one table: every cell of a compiled piece has
 * exactly one kind, the first rule that holds, read from its own line and the lines it names.
 *
 * A kind is not what reads a cell. A cell another reads through with `over=`, a name a table of sections declares, a
 * performer of a band, a voice another's `fm=` names: those are relations between two cells, and a cell of any kind can
 * stand in them. Pure: the compiled piece in, a word out.
 */
import type { Sort } from './algebra';
import type { CompileResult, ResolvedCell } from './program';

/** What the rules read of a piece: its cells, its clocks and its sections (each to its table). A compiled piece is one. */
export type KindPiece = Pick<CompileResult, 'cells' | 'clocks' | 'sections'>;

/** The kinds, in the order their rules are tried. */
export const KINDS = [
  'note',
  'card',
  'midi card',
  'gate',
  'role',
  'style',
  'scope',
  'fill',
  'tape',
  'head',
  'sum',
  'phrase',
  'mix',
  'resonator',
  'wave',
  'voice',
  'kit',
  'band',
  'meter',
  'tempo',
  'groove',
  'grid',
  'envelope',
  'ramp',
  'volume',
  'sections',
  'selector',
  'number',
  'line',
  'table',
  'blank',
  'steps',
] as const;
export type Kind = (typeof KINDS)[number];

/** What a rule may look at beside the cell: the piece. */
interface Seen {
  readonly result: KindPiece;
  /** The tables of names that declare sections (decision 016). */
  readonly sectionTables: ReadonlySet<string>;
  /** The tables of performers (decision 061). */
  readonly bands: ReadonlySet<string>;
}

export interface KindRule {
  readonly kind: Kind;
  /** What makes a cell this kind, in words. */
  readonly is: string;
  /** A cell of this kind: the last line; the lines before it are what it needs. */
  readonly example: readonly string[];
  readonly holds: (c: ResolvedCell, seen: Seen) => boolean;
}

const has = (c: ResolvedCell, key: string) => c.params[key] !== undefined;
/** The cells a braid names, bare, where it names cells alone (and at least one). */
const named = (c: ResolvedCell): readonly string[] | null => {
  const names = c.units.map((u) => (u.atom.kind === 'ref' ? u.atom.name : null));
  return names.length && names.every((n) => n !== null) ? (names as string[]) : null;
};
/** A table of performers: an unstepped braid of gates and role cells (decision 061). */
const isBand = (c: ResolvedCell, result: KindPiece): boolean => {
  const names = named(c);
  if (!names || c.step || c.gate || c.map || result.clocks.has(c.name)) return false;
  return names.every((n) => {
    const m = result.cells.get(n);
    return !!m && (!!m.gate || m.map?.kind === 'role');
  });
};
/** Is the cell's braid one mix chord? */
const isChord = (c: ResolvedCell) => c.units.length === 1 && c.units[0]!.atom.kind === 'mix';

/** What a cell is, from its own line and the lines it names. The first rule that holds decides. */
export const KIND_RULES: readonly KindRule[] = [
  {
    kind: 'note',
    is: 'A label= and nothing that plays: an explanation in the graph.',
    example: ['&why label="The bass walks down a fifth each bar."'],
    holds: (c) => c.note,
  },
  {
    kind: 'card',
    is: 'map=sample: the sound card, its entries its channels.',
    example: ['&a loop=A4', '&out map=sample [&a]'],
    holds: (c) => c.sink,
  },
  {
    kind: 'midi card',
    is: 'map=midi: a MIDI card, its entries MIDI channels.',
    example: ['&a loop=A4', '&t step=2 0 2', '&synth map=midi [&t * &a]'],
    holds: (c) => c.map?.kind === 'midi',
  },
  {
    kind: 'gate',
    is: 'play= with a braid of voices: a product with a name, where notes become sound.',
    example: ['&a loop=A4', '&t step=2 0 2', '&leadOut play=&t &a'],
    holds: (c) => !!c.gate,
  },
  {
    kind: 'role',
    is: 'map=role: its name is the role, its entries the gates that play it.',
    example: ['&a loop=A4', '&t step=2 0 2', '&violin play=&t &a', '&lead map=role &violin'],
    holds: (c) => c.map?.kind === 'role',
  },
  {
    kind: 'style',
    is: 'map=style: a point in style space; it doesn’t sound.',
    example: ['&funk map=style .3 .45 .55 .5'],
    holds: (c) => c.map?.kind === 'style',
  },
  {
    kind: 'scope',
    is: 'scope=: a picture of the cells its braid lists.',
    example: ['&a loop=A4', '&screen scope=stack &a'],
    holds: (c) => has(c, 'scope'),
  },
  {
    kind: 'fill',
    is: 'fill(…): a plugin-fragment’s code writes its braid (decision 085).',
    example: ['&day scan(1!24) loop=1d', '&cycle_mode fill(five_to_twelve, mode, &day) ionian'],
    holds: (c) => c.fill !== undefined,
  },
  {
    kind: 'tape',
    is: 'write=: it records what its write head names.',
    example: ['&t step=2 0 2', '&tape write=&t step=1 length=4'],
    holds: (c) => has(c, 'write'),
  },
  {
    kind: 'head',
    is: 'play= with no braid: a read head of a tape.',
    example: ['&t step=2 0 2', '&tape write=&t step=1 length=4', '&echo play=&tape at=1'],
    holds: (c) => has(c, 'play'),
  },
  {
    kind: 'sum',
    is: 'A mix of cells with no voice: the sum of their values (decision 079).',
    example: ['&a step=1 1 .2', '&b step=2 1 0', '&drift [&a * .7 + &b * .3]'],
    holds: (c) => !!c.sum,
  },
  {
    kind: 'phrase',
    is: 'A product with no voice and a pitch, named: notes with their levels (decision 087).',
    example: ['&t step=2 0 2', '&accent map=amp step=2 1 .5', '&phrase [&t * &accent]'],
    holds: (c) => isChord(c) && c.sort === 'pitch',
  },
  {
    kind: 'mix',
    is: 'A mix of sounds with a name: played as one voice, an instrument.',
    example: ['&a s=saw loop=C4', '&b s=sine loop=C3', '&organ [&a, &b]'],
    holds: (c) => !!c.mix,
  },
  {
    kind: 'resonator',
    is: 'body=: a struck or driven body, its braid its exciters.',
    example: ['&fork body=fork loop=A4 ring=3'],
    holds: (c) => has(c, 'body'),
  },
  {
    kind: 'wave',
    is: 'A braid turning at an audio rate with no sound parameter: alone in a product the sound, beside one a pitch (FM).',
    example: ['&square loop=220 0 1'],
    holds: (c) => c.sort === 'wave',
  },
  {
    kind: 'voice',
    is: 'A sound parameter (s=, lpf= …): it sounds.',
    example: ['&lead s=saw loop=C4'],
    holds: (c) => c.voice,
  },
  {
    kind: 'kit',
    is: 'An unstepped braid of voices: a table of them, a number picking one.',
    example: ['&bd s=sine loop=A1', '&hh s=white', '&kit &bd &hh'],
    holds: (c) => c.kit,
  },
  {
    kind: 'band',
    is: 'An unstepped braid of gates and roles: a table of performers (decision 061).',
    example: ['&a loop=A4', '&t step=2 0 2', '&violin play=&t &a', '&viola play=&t &a', '&band &violin &viola'],
    holds: (c, { bands }) => bands.has(c.name),
  },
  {
    kind: 'meter',
    is: 'A meter(…) or a scan(…) with a rate: it keeps time, and lines tap it.',
    example: ['&bar meter("4/4") step=84bpm'],
    holds: (c, { result }) => !!c.meter && result.clocks.has(c.name),
  },
  {
    kind: 'tempo',
    is: 'A rate alone, no braid: a tempo a meter reads (step=&tempo), or a clock.',
    example: ['&tempo step=84bpm'],
    holds: (c, { result }) => result.clocks.has(c.name) && c.braid === 'blank',
  },
  {
    kind: 'groove',
    is: 'A line of hits: a pattern read through a kit, or a stepped braid of voices.',
    example: ['&bd s=sine loop=A1', '&hh s=white', '&kit &bd &hh', '&drums over=&kit step=4 0 1 0 1'],
    holds: (c) => c.sort === 'signal',
  },
  {
    kind: 'grid',
    is: 'map=edo, ed(r) or ratios: how positions become frequencies.',
    example: ['&edo19 map=edo(19)'],
    holds: (c) => c.map?.kind === 'edo' || c.map?.kind === 'ratios',
  },
  {
    kind: 'envelope',
    is: 'map=adsr: a level over each note.',
    example: ['&pluck map=adsr .01 .3 .5 .4'],
    holds: (c) => c.map?.kind === 'adsr',
  },
  {
    kind: 'ramp',
    is: 'map=lin: values that ramp to the next, a level in a product and a pitch in a sum.',
    example: ['&swell map=lin loop=.25 .2 1'],
    holds: (c) => c.map?.kind === 'lin',
  },
  {
    kind: 'volume',
    is: 'map=amp, db or a table: values read as a level.',
    example: ['&accent map=amp step=2 1 .5'],
    holds: (c) => c.map?.kind === 'amp' || c.map?.kind === 'db' || c.map?.kind === 'table',
  },
  {
    kind: 'sections',
    is: 'A stepped table of names: it declares the sections of an arrangement (decision 016).',
    example: ['&bar meter("4/4") step=84bpm', '&tune step=&tuneBar 0 2 4 5', '&song over=&sections step=1m 0', '&sections step=4n &tuneBar'],
    holds: (c, { sectionTables }) => sectionTables.has(c.name),
  },
  {
    kind: 'selector',
    is: 'over= a table of sections or a band: it switches them.',
    example: ['&bar meter("4/4") step=84bpm', '&tune step=&tuneBar 0 2 4 5', '&sections step=4n &tuneBar', '&song over=&sections step=1m 0'],
    holds: (c, { sectionTables, bands }) => !!c.over && (sectionTables.has(c.over) || bands.has(c.over)),
  },
  {
    kind: 'number',
    is: 'One number and nothing else: named in a mix it is that number (decision 088).',
    example: ['&vol .5'],
    holds: (c) => c.sort === 'plain' && !c.map,
  },
  {
    kind: 'line',
    is: 'A braid with a clock (step=, loop= below hearing): it plays its steps in time.',
    example: ['&tune step=2 0 2 4'],
    holds: (c, { result }) => !!c.step || result.clocks.has(c.name),
  },
  {
    kind: 'table',
    is: 'A generator with no clock (scan, scale, even, fifths, a wave): a table to read through.',
    example: ['&major scan(2 2 1 2 2 2 1)'],
    holds: (c) => c.braid !== 'list' && c.braid !== 'blank',
  },
  {
    kind: 'blank',
    is: 'No braid and no clock: the table below it as it is, turned or set by its attributes (a key, a swing).',
    example: ['&key shift=2'],
    holds: (c) => c.braid === 'blank',
  },
  {
    kind: 'steps',
    is: 'Anything else: a list of steps with no clock of its own, a phrase to splice or a table to read through.',
    example: ['&motif 0 2 4'],
    holds: () => true,
  },
];

/**
 * What a cell of each kind is in a mix, its sort (`compiler/sorts.ts`, decision 006): a sound, a volume, a plain value, a
 * pitch, or a wave. `null` where the kind doesn't say: a read head is its tape's (a sound tape's a sound, a tape of notes'
 * a pitch); a card and a meter are never a mix's factor. A test holds it over every cell of every example.
 */
export const SORT_OF_KIND: Readonly<Record<Kind, Sort | null>> = {
  note: 'pitch',
  card: null,
  'midi card': null,
  gate: 'signal',
  role: 'pitch',
  style: 'pitch',
  scope: 'pitch',
  fill: null,
  tape: 'pitch',
  head: null,
  sum: 'plain',
  phrase: 'pitch',
  mix: 'signal',
  resonator: 'signal',
  wave: 'wave',
  voice: 'signal',
  kit: 'pitch',
  band: 'pitch',
  meter: null,
  tempo: 'pitch',
  groove: 'signal',
  grid: 'pitch',
  envelope: 'volume',
  ramp: 'plain',
  volume: 'volume',
  sections: 'pitch',
  selector: 'pitch',
  number: 'plain',
  line: 'pitch',
  table: 'pitch',
  blank: 'pitch',
  steps: 'pitch',
};

/** kindOf(name): what each cell of a compiled piece is (`KIND_RULES`); null for a name the piece doesn't have. */
export function kindsOf(result: KindPiece): (name: string) => Kind | null {
  const sectionTables = new Set(result.sections?.values() ?? []);
  const bands = new Set([...result.cells.values()].filter((c) => isBand(c, result)).map((c) => c.name));
  const seen: Seen = { result, sectionTables, bands };
  const memo = new Map<string, Kind | null>();
  return (name) => {
    if (!memo.has(name)) {
      const c = result.cells.get(name);
      memo.set(name, c ? KIND_RULES.find((r) => r.holds(c, seen))!.kind : null);
    }
    return memo.get(name)!;
  };
}
