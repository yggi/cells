// Lifted from yggi/cell-studio src/docs.test.ts @ e168c8d, for the language's docs: the language pages can't rot, INDEX.md
// lists every page, and relative links resolve.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { compileSource } from './engine/compile';
import * as cells from './index';
import { EXAMPLE_SOURCES } from './engine/examples.generated';

const DOCS = resolve(import.meta.dirname, '../docs');
const markdown = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? markdown(p) : p.endsWith('.md') ? [p] : [];
  });
const rel = (p: string) => relative(DOCS, p).split('\\').join('/');
const pages = markdown(DOCS);
const read = (p: string) => readFileSync(p, 'utf8');

/** The ```cells blocks of a page: each must compile standalone with no diagnostics. */
const blocks = (text: string): string[] => [...text.matchAll(/^```cells\n([\s\S]*?)^```/gm)].map((m) => m[1]);

describe('docs: language pages compile', () => {
  const language = pages.filter((p) => rel(p).startsWith('language/'));
  it('there are language pages', () => expect(language.length).toBeGreaterThan(0));
  for (const page of language)
    for (const [i, src] of blocks(read(page)).entries())
      it(`${rel(page)} block ${i + 1}`, () => {
        const r = compileSource(src);
        // a small example may leave out the sound card; anything else is a diagnostic to fix
        const problems = r.diagnostics.filter((d) => !d.message.startsWith('Nothing plays yet'));
        expect(problems.map((d) => d.message)).toEqual([]);
        expect(r.ok).toBe(true);
      });
});

describe('docs: structure', () => {
  const index = read(join(DOCS, 'INDEX.md'));
  // notes/ and decisions/ are listed as directories only; their files change too often
  const listed = pages.filter((p) => !/^(notes|decisions)\//.test(rel(p)) && rel(p) !== 'INDEX.md');

  for (const page of listed) it(`INDEX.md lists ${rel(page)}`, () => expect(index).toContain(`](${rel(page)})`));

  it('INDEX.md lists notes/ and decisions/', () => {
    expect(index).toContain('](notes/)');
    expect(index).toContain('](decisions/)');
  });

  for (const page of [...pages, ...['README.md', 'AGENTS.md', 'CHANGELOG.md'].map((f) => resolve(DOCS, '..', f))])
    it(`links in ${rel(page)} resolve`, () => {
      const text = read(page).replace(/^```[\s\S]*?^```/gm, '');
      for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const file = resolve(dirname(page), target.split('#')[0]);
        expect(existsSync(file), `${rel(page)} → ${target}`).toBe(true);
      }
    });

  it('every decision linked from MEMORY.md exists, and every decision is linked', () => {
    const memory = read(join(DOCS, 'MEMORY.md'));
    const linked = [...memory.matchAll(/→ (decisions\/[\w.-]+\.md)/g)].map((m) => m[1]);
    for (const target of linked) expect(existsSync(join(DOCS, target)), target).toBe(true);
    const records = readdirSync(join(DOCS, 'decisions')).filter((f) => /^\d{3}-.*\.md$/.test(f));
    for (const r of records) expect(linked, r).toContain(`decisions/${r}`);
  });
});

/** The headings CHANGELOG.md lacks: *Unreleased*, and the version package.json names (the tag a frontend pins). */
const changelogMisses = (text: string, version: string): string[] => ['Unreleased', `v${version}`].filter((h) => !new RegExp(`^## ${h.replace(/\./g, '\\.')}\\b`, 'm').test(text));

describe('docs: the changelog', () => {
  it('is shown firing: a changelog without the version is missing it', () => {
    expect(changelogMisses('## Unreleased\n\n## v0.1.0 — 2026-10-14\n', '0.2.0')).toEqual(['v0.2.0']);
    expect(changelogMisses('## v0.1.0\n', '0.1.0')).toEqual(['Unreleased']);
  });

  it("has Unreleased and a section for package.json's version", () => {
    const { version } = JSON.parse(read(resolve(DOCS, '../package.json')));
    expect(changelogMisses(read(resolve(DOCS, '../CHANGELOG.md')), version)).toEqual([]);
  });
});

/** The tags the README's pins name that aren't package.json's version: a release moves them together. */
const stalePins = (text: string, version: string): string[] => [...text.matchAll(/github:yggi\/cells#v([\w.-]+)/g)].map((m) => m[1]).filter((v) => v !== version);

describe('docs: the README', () => {
  it('is shown firing: a pin on another version is stale', () => {
    expect(stalePins('"@yggi/cells": "github:yggi/cells#v0.1.0"', '0.2.0')).toEqual(['0.1.0']);
  });

  it("pins package.json's version, the tag a release makes", () => {
    const { version } = JSON.parse(read(resolve(DOCS, '../package.json')));
    expect(stalePins(read(resolve(DOCS, '../README.md')), version)).toEqual([]);
  });
});

describe('docs: the README shows the language as it is', () => {
  const readme = read(resolve(DOCS, '../README.md'));

  it('its piece compiles, and is lines of an example', () => {
    const [piece = ''] = blocks(readme);
    expect(compileSource(piece).diagnostics).toEqual([]);
    const lines = piece.split('\n').filter(Boolean);
    expect(lines.length).toBeLessThanOrEqual(10);
    const source = Object.values(EXAMPLE_SOURCES).find((src) => lines.every((l) => src.split('\n').includes(l)));
    expect(source, 'every line of the README piece is in one examples/*.cells').toBeDefined();
  });

  it('what its TypeScript block imports is exported, and it runs', () => {
    const [, names = '', body = ''] = /^```ts\nimport \{([^}]*)\} from '@yggi\/cells';\n([\s\S]*?)^```/m.exec(readme) ?? [];
    expect(body.split('\n').length, 'the block is at most 15 lines').toBeLessThanOrEqual(15);
    for (const n of names.split(',').map((x) => x.trim())) expect(cells, n).toHaveProperty(n);
    const source = blocks(readme)[0] ?? '';
    expect(cells.compileSource(source).ok).toBe(true);
    expect(cells.windowAt(cells.planOf(source), 0, 1).events.length).toBeGreaterThan(0);
  });

  it('is at most 120 lines, and links the reference and the overview', () => {
    expect(readme.split('\n').length).toBeLessThanOrEqual(120);
    expect(readme).toContain('](docs/language/reference.md)');
    expect(readme).toContain('](docs/language/overview.md)');
  });

  it('what the package ships of docs/language/ is at most 150 KB unpacked (#76: the pages and the reference)', () => {
    const bytes = readdirSync(join(DOCS, 'language')).reduce((n, f) => n + statSync(join(DOCS, 'language', f)).size, 0);
    expect(bytes / 1000).toBeLessThanOrEqual(150);
  });

  it("links every topic page it ships: docs/language/ is in package.json's files", () => {
    const { files } = JSON.parse(read(resolve(DOCS, '../package.json'))) as { files: string[] };
    expect(files).toContain('docs/language');
    for (const m of readme.matchAll(/\]\((docs\/[^)#\s]+)/g)) expect(m[1]).toMatch(/^docs\/language\//);
  });
});
