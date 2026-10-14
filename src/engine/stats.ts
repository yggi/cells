/**
 * Numbers for a piece (#390): its cells by kind and in all, its wires and nets, the braid steps each cell writes, and
 * the size of its text. The sidebar's Stats page reads them; a conversion's story counts up through them. Pure: the
 * compiled piece, its graph and its text in, numbers out.
 */
import type { CompileResult, ResolvedCell } from './program';
import type { GraphModel } from './graph';

/** What a cell is, for counting: the first that fits, in this order. */
export type CellKind = 'card' | 'mix' | 'gate' | 'voice' | 'meter' | 'table' | 'envelope' | 'note' | 'line';

/** The kinds in the order they're shown. */
export const CELL_KINDS: readonly CellKind[] = ['line', 'table', 'meter', 'voice', 'envelope', 'gate', 'mix', 'card', 'note'];

/** min, max, mean and median of some numbers (all 0 when there are none). */
export interface Spread {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
}

export interface PieceStats {
  /** The cells written (not the implicit grid nor the built-in card), and how many of them are unnamed (`&( … )`). */
  readonly cells: number;
  readonly unnamed: number;
  readonly kinds: Readonly<Record<CellKind, number>>;
  /** Wires drawn (edges) and nets (a cell read through one port by several). */
  readonly wires: number;
  readonly nets: number;
  /** Places a cell is spliced into another's braid (`&m` in a braid), and the cells spliced so. */
  readonly splices: number;
  readonly spliced: number;
  /** Braid steps written (`x!4` one step, `[0,2]` one), in all, and per cell that writes a braid of steps. */
  readonly steps: number;
  readonly perCell: Spread;
  /** The text: characters, and lines that say something (not blank, not only a comment). */
  readonly chars: number;
  readonly lines: number;
}

/** min, max, mean, median. */
export function spread(xs: readonly number[]): Spread {
  if (!xs.length) return { min: 0, max: 0, mean: 0, median: 0 };
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return {
    min: s[0]!,
    max: s[s.length - 1]!,
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    median: s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2,
  };
}

/** What a cell is: a card (sound or MIDI), a mix, a gate, a voice, a meter, a table (read through by another's over=), an
 * envelope or a curve (`map=adsr`, `amp`, `lin`, `db`: a level or a pitch over a note), a note, else a line. */
function kindOf(c: ResolvedCell, meters: ReadonlySet<string>, tables: ReadonlySet<string>): CellKind {
  if (c.sink || c.map?.kind === 'midi') return 'card';
  if (c.mix) return 'mix';
  if (c.gate) return 'gate';
  if (c.voice) return 'voice';
  if (meters.has(c.name)) return 'meter';
  if (tables.has(c.name)) return 'table';
  if (c.map && ['adsr', 'amp', 'lin', 'db'].includes(c.map.kind)) return 'envelope';
  if (c.note) return 'note';
  return 'line';
}

/** The piece's numbers: from its compiled cells, its graph (the wires and nets as drawn) and its text. */
export function pieceStats(result: CompileResult, graph: GraphModel, text: string): PieceStats {
  const written = [...result.cells.values()].filter((c) => !c.implicit && c.name !== result.builtinCard);
  const meters = new Set(graph.nodes.flatMap((n) => (n.kind === 'cell' && n.isMeter ? [n.cell.name] : [])));
  const tables = new Set(written.flatMap((c) => (c.over ? [c.over] : [])));
  const kinds = Object.fromEntries(CELL_KINDS.map((k) => [k, 0])) as Record<CellKind, number>;
  for (const c of written) kinds[kindOf(c, meters, tables)]++;
  // (a braid as written: a blank one is the grid's, a scan or a wave a generator, a mix's entries are its sounds)
  const braids = written.filter((c) => c.braid === 'list' && !c.mix);
  const perCell = braids.map((c) => c.units.length);
  const splicedIn = written.flatMap((c) => [...c.children]);
  return {
    cells: written.length,
    unnamed: written.filter((c) => c.lambda !== null).length,
    kinds,
    wires: graph.edges.length,
    nets: graph.nets.length,
    splices: splicedIn.reduce((n, [, k]) => n + k, 0),
    spliced: new Set(splicedIn.map(([name]) => name)).size,
    steps: perCell.reduce((a, b) => a + b, 0),
    perCell: spread(perCell),
    chars: text.length,
    lines: text.split('\n').filter((l) => l.trim() && !/^\s*(\/\/|#)/.test(l)).length,
  };
}
