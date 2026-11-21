// What a declaration reads (reads.ts, #618, #737): every cell a line names is found by shape, and the written graph is
// measured against it. A read with no wire between its two cells is a gap in the graph; the gaps known today are held,
// form by form, and the count only falls (`UNDRAWN`: a form drawn removes its line, and a form that is drawn but still
// listed fails too, so the list can't go stale).
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { parse } from './parser';
import { writtenGraph } from './graph';
import { EXAMPLES } from './examples';
import { expansion } from './use';
import { resolveSeed } from '../repository/library';
import { formOf, readsOf } from './reads';

const O = { resolve: resolveSeed };
const decl = (text: string, name: string) => parse(text).cells.find((c) => c.name === name)!;
const formsOf = (text: string, name: string) => readsOf(decl(text, name)).map((r) => `${r.form}:${r.name}`);

describe('readsOf finds every cell a line names, by the form that reads it', () => {
  const TAIL = '&t step=8n 0 1 2\n&v s=sine loop=C4\n&o [&t * &v]';
  it('a meter: its step, bend table and depth cells, and swing cell', () => {
    const text = `&bar meter("12/8") step=&tempo bend=8n:&lean:&k swing=&sw\n&tempo 60bpm\n&lean 4 3 3\n&k 1\n&sw swing=8n:.6\n${TAIL}`;
    expect(formsOf(text, 'bar').sort()).toEqual(['bend.depthMoves:k', 'bend.table:lean', 'paramCells.swing:sw', 'step.driver:tempo']);
  });
  it('a cell: over, env, pitch, a parameter scaled by cells, a style, a sum of cells, a tonic', () => {
    const text = `&a over=&key step=8n 0 1\n&key scale(minor, &tonic)\n&tonic D\n&e 1\n&p 1\n&v s=sine env=&e pitch=&p lpf=200..3000 * &e\n&calm map=style .3 .45 .55 .55\n&x style=&calm\n&drift [&a * .5 + &e * .5]\n`;
    expect(formsOf(text, 'a').sort()).toEqual(['over:key']);
    expect(formsOf(text, 'v').sort()).toEqual(['env:e', 'paramCells.lpf:e', 'pitch:p']);
    expect(formsOf(text, 'x')).toEqual(['style.from:calm']);
    expect(
      formsOf(text, 'drift')
        .map((f) => f.split(':')[1])
        .sort(),
    ).toEqual(['a', 'e']);
    // (the scale is a hidden cell the key reads over=, and holds the tonic: `key:λ…`, the key's own)
    expect(formsOf(text, 'key')).toEqual([expect.stringMatching(/^over:key:λ/)]);
    expect(formsOf(text, parse(text).cells.find((c) => c.name.startsWith('key:'))!.name)).toEqual(['tonic:tonic']);
  });
  it('a form is a path without its indices, its first two keys', () => {
    expect(formOf('braid.tokens.3.atom.layers.0.1.atom')).toBe('braid.tokens');
    expect(formOf('paramCells.lpf.factors.0')).toBe('paramCells.lpf');
    expect(formOf('over')).toBe('over');
  });
});

/**
 * The reads of a text the written graph draws no wire for, by form: a read is drawn when its two cells have an edge
 * between them, either way. A read inside an unnamed cell (`&key:λ19_5`) is its owner's. A gate read in a mix
 * (`&out [&leadOut, &drumOut]`) is drawn through the voices it plays (#234: each in from its own wheel, no wire from the
 * gate): it counts as drawn when every one of its voices is wired into the reader, and not otherwise. A style's slot
 * (`lpf=… * &style[bite]`) is read through the cell compile makes for it: drawn when the style is wired into that cell
 * and that cell into the reader.
 */
function undrawn(source: string): Record<string, number> {
  const text = expansion(source, O).text;
  const result = compileSource(text, undefined, O);
  const wired = new Set<string>();
  const norm = (id: string) => id.replace(/^junction:([^:]+):.*$/, 'cell:$1');
  for (const e of writtenGraph(result).edges) {
    wired.add(`${norm(e.from)}|${norm(e.to)}`);
    wired.add(`${norm(e.to)}|${norm(e.from)}`);
  }
  const gaps: Record<string, number> = {};
  for (const d of parse(text).cells) {
    if (!d.name || !result.cells.has(d.name)) continue;
    const owner = d.name.includes(':') ? d.name.split(':')[0]! : d.name;
    for (const r of readsOf(d)) {
      const to = result.cells.get(r.name);
      if (r.name === d.name || r.name === owner || !to || to.implicit) continue;
      if (wired.has(`cell:${d.name}|cell:${r.name}`) || wired.has(`cell:${owner}|cell:${r.name}`)) continue;
      const voices = to.gate?.receivers ?? [];
      if (voices.length && voices.every((v) => wired.has(`cell:${v}|cell:${d.name}`) || wired.has(`cell:${v}|cell:${owner}`))) continue;
      const made = [...result.cells.values()].filter((m) => m.readsSlot?.cell === r.name);
      if (made.some((m) => wired.has(`cell:${r.name}|cell:${m.name}`) && (wired.has(`cell:${m.name}|cell:${d.name}`) || wired.has(`cell:${m.name}|cell:${owner}`)))) continue;
      gaps[r.form] = (gaps[r.form] ?? 0) + 1;
    }
  }
  return gaps;
}

/** The reads no wire is drawn for, over every example, by form. Fewer is better: draw the form, and its line goes. */
const UNDRAWN: Readonly<Record<string, number>> = {
  // (a meter's swing cell, `swing=&swing`: the cell is read, and no wire is drawn from it, yggi/cells#618, #737)
  // (a fill's cells, `&cycle [&cycle_notes * &cycle_level]`, and a law's, in daytime and fiveto12: they wait on #792)
  'braid.tokens': 6,
  // (a key's tonic, written in a scale the key holds)
  tonic: 2,
};

describe('every read in the examples is a wire, but the known gaps', () => {
  const total: Record<string, number> = {};
  for (const { source } of Object.values(EXAMPLES)) for (const [form, n] of Object.entries(undrawn(source))) total[form] = (total[form] ?? 0) + n;

  it('the reads with no wire are the ones listed, form by form', () => {
    expect(Object.fromEntries(Object.entries(total).sort())).toEqual(UNDRAWN);
  });
});
