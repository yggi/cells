// Lifted from yggi/jambot tooling/reading-list.test.ts @ 8871429.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALARM, alarm, BOOT_SET, CEILING, bootBytes } from './reading-list';

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
    const said = alarm(bytes);
    if (said) console.warn(said);
  });

  it('is shown firing: the alarm speaks from 90 % of the ceiling, and not below', () => {
    expect(ALARM).toBe(0.9);
    expect(alarm(Math.ceil(ALARM * CEILING))).toMatch(/^the boot set is \d+ B, 90 % of its ceiling/);
    expect(alarm(Math.ceil(ALARM * CEILING) - 1)).toBeUndefined();
  });
});
