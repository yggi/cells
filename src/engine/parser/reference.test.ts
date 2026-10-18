import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { PAGE, README, entries, renderReadme, renderReference } from '../../../tools/reference';
import { CORE, PARAMS } from '../attributes';
import { parse } from './index';
import { MODIFIERS } from './braid';
import { KEYS } from './cell';
import { GENERATORS } from './generators';
import { MAP_KINDS } from './values';
import { RATE_UNITS } from './units';

// docs/language/reference.md is generated from the parser's tables (tools/reference.ts). Record it:
// npm run reference (it also rewrites the README's index of forms)

const RECORD = 'record it: npm run reference';

describe('the syntax reference', () => {
  test('every example in it parses, with no diagnostics', () => {
    for (const e of entries()) for (const ex of e.examples) expect(parse(ex).diagnostics, `${e.form}: ${ex}`).toEqual([]);
  });

  test('it covers what the parser dispatches on', () => {
    const forms = entries().map((e) => e.form);
    const has = (f: string) => forms.some((x) => x.includes(f));
    for (const g of Object.keys(GENERATORS)) expect(has(`${g}(`), g).toBe(true);
    for (const m of Object.keys(MAP_KINDS)) expect(has(`map=${m}`), m).toBe(true);
    for (const u of Object.keys(RATE_UNITS)) expect(has(`n${u}`), u).toBe(true);
    for (const m of Object.keys(MODIFIERS)) expect(has(`x${m}n`), m).toBe(true);
    for (const k of Object.keys(CORE)) expect(KEYS[k as keyof typeof KEYS].form, k).toMatch(new RegExp(`^${k}=`));
    for (const [k, a] of Object.entries(CORE)) expect(has(`${k}=`), k).toBe(!a.old);
    for (const [k, a] of Object.entries(PARAMS)) if (!a.old) expect(has(`${k}=`), k).toBe(true);
  });

  test(`${PAGE} is current`, () => {
    expect(readFileSync(PAGE, 'utf8'), RECORD).toBe(renderReference());
  });

  test(`the index of forms in ${README} is current`, () => {
    const text = readFileSync(README, 'utf8');
    expect(text, RECORD).toBe(renderReadme(text));
  });

  test('a README without the markers is refused', () => {
    expect(() => renderReadme('# cells\n')).toThrow(/markers/);
  });

  test('the README index is written by the command: a changed count is put back', () => {
    const text = readFileSync(README, 'utf8');
    expect(renderReadme(text.replace(/: \d+ forms/, ': 0 forms'))).toBe(text);
  });
});
