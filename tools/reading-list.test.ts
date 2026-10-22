// Lifted from yggi/jambot tooling/reading-list.test.ts @ 8871429.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALARM, BOOT_SET, CEILING, bootBytes } from './reading-list';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('the boot set', () => {
  it('is shown firing: a set past the ceiling is over it', () => {
    expect(bootBytes(() => 'x'.repeat(CEILING))).toBeGreaterThan(CEILING);
    expect(bootBytes(() => 'x'.repeat(CEILING / BOOT_SET.length))).toBeLessThanOrEqual(CEILING);
  });

  it('counts bytes, not characters', () => {
    expect(bootBytes(() => '♭')).toBe(3 * BOOT_SET.length);
  });

  it(`stays under ${CEILING / 1024} KB`, () => {
    const bytes = bootBytes((path) => readFileSync(`${root}/${path}`, 'utf8'));
    // Over the ceiling: open an issue and condense the boot set as a change of its own
    // (docs/MEMORY.md moves facts to the pages it points to, and to the modules).
    expect(bytes).toBeLessThanOrEqual(CEILING);
    // The alarm, before the ceiling (#242: #235 found the set 58 B under it): verify's output says so from 90 %.
    if (bytes >= ALARM * CEILING)
      console.warn(`the boot set is ${bytes} B, ${Math.round((100 * bytes) / CEILING)} % of its ceiling: condense it, as a change of its own`);
  });

  it('warns from 90 % of the ceiling', () => {
    expect(ALARM).toBe(0.9);
  });
});
