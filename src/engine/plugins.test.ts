// What a cell says about how it is drawn (size=, show=, label=) and the plugins a show can be (decision 011): read,
// checked and said wrong by the language, whatever a workbench then draws of it. Lifted from yggi/cell-studio
// src/layout/physics.test.ts, src/layout/show.test.ts and src/ui/plugin.test.ts @ 23a5972 (#326), where these were
// the only tests of them.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { parse } from './parser';

const errors = (src: string) =>
  compileSource(src)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);

describe('size=: how large a cell is drawn', () => {
  const src = '&bar size=2 scan(1 1 1 1) step=120bpm\n&t step=&bar 0 2 4\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &v]';
  it('is read', () => {
    const r = compileSource(src);
    expect([r.cells.get('bar')!.size, r.cells.get('t')!.size]).toEqual([2, 1]);
  });
  it('is only how it looks: the sound is the same', () => {
    const a = compileSource(src);
    const b = compileSource(src.replace(' size=2', ''));
    expect(a.outputs.map((o) => o.id)).toEqual(b.outputs.map((o) => o.id));
    expect(a.cells.get('bar')!.rate).toBe(b.cells.get('bar')!.rate);
  });
  it('says what it takes', () => {
    expect(parse('&bar size=9 0').diagnostics[0]!.message).toMatch(/size= is how large it is drawn, from .25 to 4/);
  });
});

describe('show=: a word the frontend draws (decision 086 §2)', () => {
  it('keeps any word, and gives it no meaning: which words a frontend draws is its own', () => {
    expect(compileSource('&t show=do 0').cells.get('t')!.show).toBe('do');
    expect(compileSource('&t show=fancy 0').cells.get('t')!.show).toBe('fancy');
    expect(errors('&t show=fancy 0')).toEqual([]);
  });
  it('keeps a convention after the colon, any word; says what it takes where there is none', () => {
    expect(compileSource('&t show=notes:klingon 0').cells.get('t')!.show).toBe('notes:klingon');
    expect(parse('&t show=notes: 0').diagnostics[0]!.message).toMatch(/a word after the colon, its convention/);
    expect(parse('&t show=1 0').diagnostics[0]!.message).toMatch(/show= takes a word/);
  });
  it('a plugin block is blanked in the cells’ text: the cells keep their line numbers', () => {
    const r = compileSource(
      ['=== plugin ring ===', '{ "fits": ["meter"] }', 'function draw() { return []; }', '=== end ===', '&bar scan(1 1) step=60bpm show=ring size=9'].join('\n'),
    );
    expect(r.diagnostics.find((d) => d.severity === 'error')!.span.line).toBe(5);
    expect(r.plugins.get('ring')?.fits).toEqual(['meter']);
  });
});

describe('label=: a cell’s name in words', () => {
  it('takes a text in quotes', () => {
    expect(compileSource('&a label=hello').diagnostics[0]!.message).toMatch(/label= takes a text in quotes/);
  });
});
