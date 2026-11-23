// tools/api.ts: the plan of entry points covers the modules it names, the page is current, and every symbol a frontend
// reaches (the ledger) is still exported.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ENTRIES,
  ENTRY_POINTS,
  ROOT,
  entryExports,
  entryOf,
  entryOfSymbol,
  exportsOfModules,
  importsOf,
  modules,
  readLedger,
  render,
  standing,
  rootExports,
  withGenerated,
} from './api';

describe('the entry points', () => {
  const all = modules();

  it('name seven entry points, each with a module', () => {
    expect(ENTRIES).toHaveLength(7);
    for (const e of ENTRIES)
      expect(
        all.some((m) => entryOf(m) === e.name),
        e.name,
      ).toBe(true);
  });

  it('have no rule that matches no module', () => {
    for (const { match } of ENTRY_POINTS)
      expect(
        all.some((m) => (match.endsWith('/') ? m.startsWith(match) : m === match)),
        match,
      ).toBe(true);
  });

  it('give every root export a module that exists', () => {
    for (const module of rootExports().keys()) expect(all, module).toContain(module);
  });
});

describe('the entry point files written', () => {
  const written = ENTRIES.filter((e) => e.name !== '@yggi/cells' && entryExports(e.name).size > 0);

  it('include every entry point but the root', () => {
    expect(written.map((e) => e.name)).toEqual(
      expect.arrayContaining(['@yggi/cells/edit', '@yggi/cells/midi', '@yggi/cells/inspect', '@yggi/cells/library', '@yggi/cells/repository', '@yggi/cells/time']),
    );
  });

  it('never give one name to two things: a name on two entry points comes from one module', () => {
    const from = new Map<string, Set<string>>();
    for (const e of ENTRIES) for (const [module, list] of entryExports(e.name)) for (const n of list) from.set(n, new Set([...(from.get(n) ?? []), module]));
    for (const [module, list] of rootExports()) for (const n of list) from.set(n, new Set([...(from.get(n) ?? []), module]));
    expect([...from].filter(([, modules]) => modules.size > 1).map(([n, modules]) => `${n}: ${[...modules].join(', ')}`)).toEqual([]);
  });

  it('export only from the modules planned for them, by name, none twice', () => {
    for (const e of written) {
      const names: string[] = [];
      for (const [module, list] of entryExports(e.name)) {
        for (const name of list) expect(entryOfSymbol(module, name), `${e.name}: ${module}:${name}`).toBe(e.name);
        names.push(...list);
      }
      expect(
        names.filter((n, i) => names.indexOf(n) !== i),
        e.name,
      ).toEqual([]);
    }
  });

  it('are in package.json exports, with types, module and default', () => {
    const exports = (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { exports: Record<string, Record<string, string>> }).exports;
    for (const e of written) {
      const key = `./${e.name.replace('@yggi/cells/', '')}`;
      const file = key.slice(2);
      expect(exports[key], key).toEqual({ types: `./types/${file}.d.ts`, module: `./src/${file}.ts`, default: `./dist/${file}.js` });
    }
  });
});

describe('importsOf', () => {
  it('reads named, type, default, namespace and multi-line imports, with aliases', () => {
    const source = [
      "import { compileSource, type Plan as P } from '@yggi/cells';",
      "import type { Take } from '@yggi/cells/engine/program';",
      "import ids, * as all from '@yggi/cells/engine/ids';",
      "import {\n  a,\n  b,\n} from '@yggi/cells/engine/midi';",
      "import { other } from 'elsewhere';",
    ].join('\n');
    expect(importsOf(source)).toEqual({
      '.': ['Plan', 'compileSource'],
      'engine/program': ['Take'],
      'engine/ids': ['*', 'default'],
      'engine/midi': ['a', 'b'],
    });
  });
});

describe('the ledger', () => {
  const ledger = readLedger();
  const reached = (module: string) => new Set(Object.values(ledger).flatMap((f) => [...(f.app[module] ?? []), ...(f.tests[module] ?? [])]));
  const code = (m: string) => m === '.' || /^(engine|theory|repository)\//.test(m);
  const wanted = [...new Set(Object.values(ledger).flatMap((f) => [...Object.keys(f.app), ...Object.keys(f.tests)]))].filter(code);

  it('names both frontends, at a pin', () => {
    expect(Object.keys(ledger).sort()).toEqual(['cell-studio', 'jambot']);
    for (const f of Object.values(ledger)) expect(f.pin).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it('leaves nothing on no entry point and not on purpose: the migrate internals went with #716 (yggi/jambot#727)', () => {
    expect(Object.fromEntries(Object.entries(standing(ledger)).map(([f, s]) => [f, s.left]))).toEqual({
      jambot: [],
      'cell-studio': [],
    });
  });

  it('is still exported: a symbol a frontend reaches that moved goes in changes/, and in the ledger', () => {
    const exported = exportsOfModules(wanted);
    const gone: string[] = [];
    for (const module of wanted) {
      const have = exported.get(module);
      if (!have) gone.push(`${module} (no such module)`);
      else for (const name of reached(module)) if (!have.has(name) && name !== '*' && name !== 'default') gone.push(`${module}: ${name}`);
    }
    expect(gone).toEqual([]);
  }, 120_000);
});

describe('docs/api.md', () => {
  it('is current: `npm run api` writes it', () => {
    const page = readFileSync(join(ROOT, 'docs/api.md'), 'utf8');
    expect(withGenerated(page, render())).toBe(page);
  });

  it('lists every root export', () => {
    const page = readFileSync(join(ROOT, 'docs/api.md'), 'utf8');
    const listed = new Set([...page.matchAll(/`([A-Za-z_$][\w$]*)`/g)].map((m) => m[1]));
    for (const [module, names] of rootExports()) for (const name of names) expect(listed.has(name), `${name} (${module})`).toBe(true);
    for (const e of ENTRIES) for (const [module, names] of entryExports(e.name)) for (const name of names) expect(listed.has(name), `${name} (${module}, ${e.name})`).toBe(true);
  });
});
