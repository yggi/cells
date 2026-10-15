// Lifted from yggi/cell-studio src/docs.test.ts @ e168c8d, for the language's docs: the language pages can't rot, INDEX.md
// lists every page, and relative links resolve.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { compileSource } from './engine/compile';

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
