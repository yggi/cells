import { describe, expect, it } from 'vitest';
import { FAMILIES, coreFold, meaningfulNames, minify, probe } from './compileprobe';
import { soundsIdentical } from '../src/engine/sameness';
import { resolveSeed } from '../src/repository/library';
import { PRESETS } from '../src/engine/presets';

// The compile tool's probe (#441): each family's rewrite of a small text, sounding identical; what minify keeps.
const O = { resolve: resolveSeed };
const family = (key: string) => FAMILIES.find((f) => f.key === key)!.rewrite;
const BAR = '&bar meter("4/4") step=&tempo\n&tempo step=120bpm';

describe('the probe’s families: each rewrite plays the same (S1)', () => {
  const cases: [string, string, string][] = [
    ['units', `${BAR}\n&t step=8n 0 2\n&v s=sine loop=C4\n&out map=sample [&t * &v]`, '&tempo step=2'],
    ['note names', '&t step=2 0 2\n&v s=sine loop=C4\n&out map=sample [&t * &v]', 'loop=261.6255653005986'],
    ['unnamed cells', '&t step=2 0 2\n&v s=sine loop=C4 env=&(map=adsr .01 .2 0 0)\n&out map=sample [&t * &v]', '&_c1 map=adsr .01 .2 0 0'],
    ['repeats', '&t step=4 0!3 2\n&v s=sine loop=C4\n&out map=sample [&t * &v]', '&t step=4 0 0 0 2'],
    ['scans', '&major scan(2 2 1 2 2 2 1)\n&t over=&major step=2 0 2 4 6\n&v s=sine loop=C4\n&out map=sample [&t * &v]', '&major 0 2 4 5 7 9 11'],
    ['from', `${BAR}\n&bd from gm_kit\n&t step=8n &bd ~ &bd ~\n&out map=sample [&t]`, '&bd s=sine'],
  ];
  it.each(cases)('%s', (key, text, written) => {
    const after = family(key)(text);
    expect(after).toContain(written);
    expect(soundsIdentical(text, after, undefined, O)).toBe(true);
    // (and a second time finds nothing more)
    expect(family(key)(after)).toBe(after);
  });

  it('a slider keeps its unit, a label its words, and a cell read by its units its repeats', () => {
    const slider = `&tempo step=free(100bpm, 70..140)`;
    expect(family('units')(slider)).toBe(slider);
    const label = '&n label="&( … ) is a cell without a name"';
    expect(family('unnamed cells')(label)).toBe(label);
    const turned = '&a 0 2\n&j step=4 &a!2 4\n&v s=sine loop=C4\n&out map=sample [&j * &v, &j[<<] * &v]';
    expect(family('repeats')(turned)).toBe(turned);
  });
});

describe('minify: the names that mean something besides themselves are kept', () => {
  it('a drum’s name, a cell that draws, and a cell that splices one that draws', () => {
    const text = `${BAR}\n&a1 0 2? 4\n&arp step=8n &a1 &a1\n&hh s=white\n&kick s=sine loop=A1\n&hat step=8n &hh ~ &kick ~\n&v s=sine loop=C4\n&out map=sample [&arp * &v, &hat]`;
    expect([...meaningfulNames(text)].sort()).toEqual(['a1', 'arp', 'hh', 'kick']);
    const min = minify(text);
    expect(min).not.toMatch(/&hat\b|&v\b|&out\b/);
    for (const kept of ['&a1', '&arp', '&hh', '&kick']) expect(min).toContain(kept);
    expect(soundsIdentical(text, min, undefined, O)).toBe(true);
  });
});

describe('the probe over an example', () => {
  it('Canon: every family alone and all of them in order play the same, idempotent; the core fold too', () => {
    const r = probe('canon', PRESETS.canon!.source, false);
    expect(Object.values(r.families).every((f) => f === null || f.same)).toBe(true);
    expect(r.core).toMatchObject({ same: true, idempotent: true });
    expect(r.minified.same).toBe(true);
    expect(r.context).toContain('unit reads');
  });

  it('the core fold takes only Shorten’s core kinds, each checked: it writes no run back', () => {
    const text = '&t step=4 0 0 0 0 2 2 2 2\n&v s=sine loop=C4\n&out map=sample [&t * &v]';
    const { source, steps } = coreFold(text);
    expect(source).not.toContain('!');
    expect(steps.every((s) => !s.startsWith('Runs'))).toBe(true);
  });
});
