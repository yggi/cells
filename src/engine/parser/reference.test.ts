import { describe, expect, test } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { entries, renderReference } from '../../../tools/reference';
import { CORE, PARAMS } from '../attributes';
import { parse } from './index';
import { MODIFIERS } from './braid';
import { KEYS } from './cell';
import { GENERATORS } from './generators';
import { MAP_KINDS, RATE_UNITS } from './values';

// docs/language/reference.md is generated from the parser's tables (tools/reference.ts). Record it:
// UPDATE_REFERENCE=1 npx vitest run src/engine/parser/reference.test.ts

const PAGE = 'docs/language/reference.md';

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
    for (const k of Object.keys(PARAMS)) expect(has(`${k}=`), k).toBe(true);
  });

  test(`${PAGE} is current`, () => {
    const page = renderReference();
    if (process.env.UPDATE_REFERENCE) writeFileSync(PAGE, page);
    expect(readFileSync(PAGE, 'utf8'), 'record it: UPDATE_REFERENCE=1 npx vitest run src/engine/parser/reference.test.ts').toBe(page);
  });
});
