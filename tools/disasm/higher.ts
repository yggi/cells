/**
 * Higher-order repetition, measured on a folded piece (docs/notes/disassembler.md, *Repetition at every level*): what
 * the folder leaves that a move on its own symbols would fold. A line that splices one cell again and again at moving
 * bases (`&m &m^1 &m^2 &m^3`: a sequence; a canon per tonos, the whole canon a tone higher each time) is a fast cell
 * driven by a slow path of transpositions. The language says one as a key cell stepped slowly, the line read through a
 * scale over it (examples/pertonos.cells); a caret that read a cell (`&m^&path`) would say it per line. The probe
 * counts such runs and what a path would cost, so either has a number.
 */

/** A run of one cell spliced at moving bases: the cell, its bases in order, the characters it is written in. */
export interface Path {
  readonly line: string;
  readonly cell: string;
  readonly bases: readonly number[];
  readonly chars: number;
}

/** A splice in a braid: `&m3`, `&m3^2`, `&m3^$-5`, `&m3^2@2`, `&m3!4`. */
const SPLICE = /^&(\w+)(?:\^\$?(-?\d+))?(@\d+)?(?:!(\d+))?$/;

/** The runs of three or more splices of one cell at two or more bases, in each line of a folded piece's source. */
export function pathsOf(source: string): Path[] {
  const out: Path[] = [];
  for (const text of source.split('\n')) {
    const m = /^&(\w+) step=\S+ (.*)$/.exec(text);
    if (!m) continue;
    const toks = m[2]!.split(' ');
    const flush = (run: { cell: string; at: string; bases: number[]; chars: number } | null) => {
      if (run && run.bases.length >= 3 && new Set(run.bases).size >= 2) out.push({ line: m[1]!, cell: run.cell, bases: run.bases, chars: run.chars });
    };
    let run: { cell: string; at: string; bases: number[]; chars: number } | null = null;
    for (const t of toks) {
      const s = SPLICE.exec(t);
      if (s && run && run.cell === s[1] && run.at === (s[3] ?? '')) {
        for (let i = 0; i < Number(s[4] ?? 1); i++) run.bases.push(Number(s[2] ?? 0));
        run.chars += t.length + 1;
        continue;
      }
      flush(run);
      run = s ? { cell: s[1]!, at: s[3] ?? '', bases: Array<number>(Number(s[4] ?? 1)).fill(Number(s[2] ?? 0)), chars: t.length + 1 } : null;
    }
    flush(run);
  }
  return out;
}

/** What a path would cost said once: the cell repeated (`&m!n`) and its bases as a table of their own, a run of one
 * base written `b!n` (as `&m^&path!n` would: a guess at a spelling the language doesn't have). */
export function pathCost(p: Path): number {
  const runs: string[] = [];
  for (let i = 0; i < p.bases.length;) {
    let n = 1;
    while (p.bases[i + n] === p.bases[i]) n++;
    runs.push(n === 1 ? `${p.bases[i]}` : `${p.bases[i]}!${n}`);
    i += n;
  }
  return `&${p.cell}^&p!${p.bases.length}`.length + 1 + `&p ${runs.join(' ')}`.length + 1;
}

/** Whether a path's bases move by one step each time (an arithmetic sequence: a sequence proper, a canon per tonos). */
export const isArithmetic = (p: Path) => p.bases.every((b, i) => i < 2 || b - p.bases[i - 1]! === p.bases[1]! - p.bases[0]!);
