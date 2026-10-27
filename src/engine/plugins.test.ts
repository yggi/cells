// What a cell says about how it is drawn (size=, show=, label=) and the plugins a show can be (decision 011): read,
// checked and said wrong by the language, whatever a workbench then draws of it. Lifted from yggi/cell-studio
// src/layout/physics.test.ts, src/layout/show.test.ts and src/ui/plugin.test.ts @ 23a5972 (#326), where these were
// the only tests of them.
import { describe, expect, it } from 'vitest';
import { BUILTIN_PLUGINS } from './builtinPlugins';
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

describe('show=: one of the shows, or a plugin', () => {
  it('reads one of the shows; says which when it isn’t', () => {
    expect(compileSource('&t show=do 0').cells.get('t')!.show).toBe('do');
    expect(errors('&t show=fancy 0')[0]).toMatch(/show=fancy: not a show \(braid pattern equal notes midi do.*no plugin of that name/);
  });
  it('show=notes: takes a spelling, and says which', () => {
    expect(compileSource('&t show=notes:klingon 0').diagnostics[0]!.message).toMatch(/flats, sharps or german/);
  });
  it('a plugin block is blanked in the cells’ text: the cells keep their line numbers', () => {
    const r = compileSource(['=== plugin ring ===', '{ "fits": ["meter"] }', 'function draw() { return []; }', '=== end ===', '&bar scan(1 1) step=60bpm show=nope'].join('\n'));
    expect(r.diagnostics.find((d) => d.severity === 'error')!.span.line).toBe(5);
  });
});

describe('label=: a cell’s name in words', () => {
  it('takes a text in quotes', () => {
    expect(compileSource('&a label=hello').diagnostics[0]!.message).toMatch(/label= takes a text in quotes/);
  });
});

describe('the built-in plugins (builtinPlugins.ts)', () => {
  const sun = BUILTIN_PLUGINS.find((p) => p.name === 'sun')!;
  const own = (name: string) => `&bar scan(1 1) step=60bpm show=${name}\n=== plugin ${name} ===\n{ "fits": ["meter"] }\nfunction draw() { return []; }\n=== end ===`;
  it('is there for any piece, and a piece cannot write another of its name', () => {
    expect(compileSource('&day scan(1!24) loop=1d show=sun').plugins.get('sun')?.builtin).toBe(true);
    expect(errors(own('sun'))[0]).toMatch(/sun is a show of its own/);
    expect(errors('&day scan(1!24) loop=1d show=moon')[0]).toMatch(/not one of the built-in plugins \(sun\)/);
  });
  it('is not what a piece’s copy of a built-in’s text and manifest can earn: its name is taken, the plugin the app’s', () => {
    const copy = `&bar scan(1 1) step=60bpm show=sun\n=== plugin sun ===\n{ "fits": ["meter"] }\n${sun.code}\n=== end ===`;
    expect(errors(copy).join()).toMatch(/sun is a show of its own/);
    expect(compileSource(copy).plugins.get('sun')).toBe(sun);
  });
});
