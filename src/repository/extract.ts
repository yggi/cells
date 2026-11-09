/**
 * Extraction (#641, rung C4 of yggi/cell-studio#621): lines of a piece written as a fragment, and the piece taking it by
 * a `from` line in their place, `useOn`'s inverse. The signature it proposes (the owner's ruling, 2026-11-09):
 *  - **heads:** the cells the lines define that the rest of the piece reads;
 *  - **the main parameter:** the one cell the lines read and don't define, which the piece passes as its main argument
 *    (`&bassline from my_vamp_bass &key`, a bare reference binding the piece's own cell, decision 065 §5);
 *  - **private:** the rest the lines define, the copy's own;
 *  - a sound the lines strike (a kit's `&bd`) stays free, read by name as decision 065 §3 allows.
 * Lines that read several cells they don't define, or that nothing else reads, are no fragment yet, and it says why. It
 * checks that the piece plays the same (S1: `soundsIdentical`, over `seconds`), and whether the library holds the
 * fragment already (`sameText`, decision 048). Pure.
 */
import { compileSource } from '../engine/compile';
import { splitComment } from '../engine/edit';
import { readFrom } from '../engine/parser/use';
import { readsAsValue } from '../engine/use';
import type { Resolve } from '../engine/program';
import { soundsIdentical } from '../engine/sameness';
import { LIBRARY } from './library';
import { sameText } from './learned';

/** What `extract` is told: the new fragment's id, how to read the library, and how long the piece must play the same. */
export interface ExtractOptions {
  readonly id: string;
  readonly resolve: Resolve;
  /** How long S1 compares the piece before and after, in seconds: 16 by default. */
  readonly seconds?: number;
}

/** Lines of a piece as a fragment, and the piece taking it. */
export interface Extraction {
  /** The fragment's text: its signature line, then the lines as written. */
  readonly fragment: string;
  /** The piece with the `from` line in the lines' place. */
  readonly piece: string;
  /** The `from` line written. */
  readonly line: string;
  /** The signature: its heads, its main parameter (null: none), the cells the copy keeps to itself, and the sounds it reads by name. */
  readonly heads: readonly string[];
  readonly main: string | null;
  readonly private: readonly string[];
  readonly sounds: readonly string[];
  /** Does the piece play the same, before and after (S1)? */
  readonly same: boolean;
  /** The id of a library fragment that reads the same (`sameText`), or null. */
  readonly known: string | null;
}

/** Why lines can't be a fragment yet. */
export interface NoExtraction {
  readonly why: string;
}

/** A declaration's lines (it and the lines it continues onto), what it defines and what it reads. */
interface Group {
  /** Its first and last physical line, 0-based. */
  readonly first: number;
  readonly last: number;
  readonly defines: readonly string[];
  readonly reads: readonly string[];
  /** Its code, comments aside, its lines joined. */
  readonly code: string;
}

const CONTINUES = /[+*,[]\s*$/;
const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
/** The names a line's code reads, its quoted strings (a label) aside. */
const readsOf = (code: string) => [...new Set([...code.replace(/"[^"]*"/g, '').matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]!))];

function groupsOf(text: string): Group[] {
  const lines = text.split('\n');
  const out: Group[] = [];
  let first = -1;
  let code: string[] = [];
  lines.forEach((raw, i) => {
    const c = splitComment(raw)[0];
    if (first < 0) first = i;
    code.push(c);
    if (CONTINUES.test(c)) return;
    const whole = code.join(' ').trim().split(/\s+/).join(' ');
    const form = readFrom(whole);
    const defines = form ? (form.kind === 'use' ? (form.names ?? []) : []).map((n) => n.replace(/^&/, '')) : HEAD.exec(whole) ? [HEAD.exec(whole)![1]!] : [];
    if (whole) out.push({ first, last: i, defines, reads: readsOf(whole).filter((n) => !defines.includes(n)), code: whole });
    first = -1;
    code = [];
  });
  return out;
}

const written = (id: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(id) ? id : `"${id}"`);

/**
 * The lines of `text` numbered in `lines` (1-based; a declaration is taken whole where its first line is one of them),
 * written as a fragment, and the piece taking it (see the module's comment).
 */
export function extract(text: string, lines: readonly number[], options: ExtractOptions): Extraction | NoExtraction {
  const { id, resolve, seconds = 16 } = options;
  const groups = groupsOf(text);
  const chosen = groups.filter((g) => lines.includes(g.first + 1));
  if (!chosen.length) return { why: 'no declaration starts on the lines given' };
  if (chosen.some((g) => !g.defines.length)) return { why: 'a line given defines no cell of its own (a `* from` line, or no cell at all)' };
  const rest = groups.filter((g) => !chosen.includes(g));
  const defined = chosen.flatMap((g) => g.defines);
  const body = text
    .split('\n')
    .filter((_, i) => chosen.some((g) => i >= g.first && i <= g.last))
    .join('\n');
  // (the piece's main meter and main key are read by every tap and every bare `over=key`, not by name: they stay the piece's)
  const whole = compileSource(text, undefined, { resolve });
  const mains = [whole.mainMeter, whole.mainKey].filter((m): m is string => !!m && defined.includes(m));
  if (mains.length)
    return {
      why: `the lines define the piece's main ${mains[0] === whole.mainMeter ? 'meter' : 'key'}, &${mains[0]}, which the rest reads without naming it: leave its line in the piece`,
    };
  // (a card is where the piece is heard: the piece's, never a fragment's, #291)
  const cards = defined.filter((n) => ['sample', 'midi'].includes(whole.cells.get(n)?.map?.kind ?? ''));
  if (cards.length) return { why: `the lines hold a card, &${cards[0]}, where the piece is heard: a fragment carries none (leave its line in the piece)` };
  const heads = defined.filter((n) => rest.some((g) => g.reads.includes(n)));
  if (!heads.length) return { why: 'nothing else in the piece reads what these lines define' };
  // (what the lines read and don't define: an input where a line reads it as a value, as the expansion asks a fragment to
  // declare it (`readsAsValue`); a sound, read by name, where every line reads it as one)
  const outside = [...new Set(chosen.flatMap((g) => g.reads))].filter((n) => !defined.includes(n));
  const inputs = outside.filter((n) => chosen.some((g) => g.reads.includes(n) && readsAsValue(g.code, n))).map((n) => `&${n}`);
  const sounds = outside.filter((n) => !inputs.includes(`&${n}`)).map((n) => `&${n}`);
  if (inputs.length > 1) return { why: `the lines read ${inputs.join(', ')}, which they don't define: a fragment takes one main argument (take the others' lines in too)` };
  const main = inputs[0] ?? null;
  const heads$ = heads.map((h) => `&${h}`).join(', ');
  const fragment = [`${heads$} from${main ? ` ${main}` : ''}`, body].join('\n');
  const line = `${heads$} from ${written(id)}${main ? ` ${main}` : ''}`;
  const at = Math.min(...chosen.map((g) => g.first));
  const piece = text
    .split('\n')
    .flatMap((l, i) => (i === at ? [line] : chosen.some((g) => i >= g.first && i <= g.last) ? [] : [l]))
    .join('\n');
  const theirs: Resolve = (x, hash) => (x === id ? fragment : resolve(x, hash));
  const same = soundsIdentical(text, piece, seconds, { resolve: theirs });
  const known = LIBRARY.find((f) => sameText(fragment, f.text))?.id ?? null;
  return { fragment, piece, line, heads: heads.map((h) => `&${h}`), main, private: defined.filter((n) => !heads.includes(n)).map((n) => `&${n}`), sounds, same, known };
}
