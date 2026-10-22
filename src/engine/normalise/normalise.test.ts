import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PARAM_ALIASES } from '../attributes';
import { normalise } from './index';
import { compileSource } from '../compile';
import { samePiece } from '../sameness';
import { shorten } from '../shorten';
import { PRESETS } from '../presets';
import { LIBRARY } from '../../repository/library';
import { unionOf } from '../../repository/fit';
import { holesOf } from '../../repository/holes';

const BASE = `&bar scan(1 1 1 1) step=120bpm
&tune over=scale(major) step=4n 0 2 4 2
`;
const piece = (voice: string) => `${BASE}&lead loop=C4 ${voice}\n&mix [&tune * &lead]`;

/** What Normalise keeps (decision 049): every cell, its name, how many steps its braid writes, and what it reads. */
const structure = (src: string) =>
  [...compileSource(src).cells.values()]
    .filter((c) => !c.implicit)
    .map((c) => `${c.name} ${c.units.length} ${c.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : [])).join(',')}`)
    .sort();

describe('Normalise: valid spellings into the canonical one (decision 049, #28)', () => {
  it.each([
    ['s=saw cutoff=800', 's=saw lpf=800', 1],
    ['sound=saw', 's=saw', 1],
    ['s=saw resonance=2 verb=.3', 's=saw lpq=2 room=.3', 2],
    ['s=saw dt=.25 delay=.3', 's=saw delaytime=.25 delay=.3', 1],
  ])('an alias as ours, whatever its length: %s → %s', (alias, ours, n) => {
    const { source, steps } = normalise(piece(alias));
    expect(source).toBe(piece(ours));
    expect(steps).toHaveLength(n);
    expect(samePiece(piece(alias), source)).toBe(true);
    expect(structure(source)).toEqual(structure(piece(alias)));
  });

  it('clip= as legato=, its warning gone (#94: clip warns, Normalise rewrites it)', () => {
    const src = `&bar meter("4/4") step=120bpm\n&tune over=scale(major) step=8n clip=.5 0 2 4 2\n&lead s=saw loop=C4\n&mix [&tune * &lead]`;
    expect(compileSource(src).diagnostics.map((d) => d.message)).toEqual([expect.stringMatching(/^clip= is Strudel's name for legato=/)]);
    const { source } = normalise(src);
    expect(source).toBe(src.replace('clip=.5', 'legato=.5'));
    expect(compileSource(source).diagnostics).toEqual([]);
    expect(samePiece(src, source)).toBe(true);
  });

  it('leaves an alias beside its own name (one parameter given twice, which the parser says)', () => {
    expect(normalise(piece('s=saw cutoff=800 lpf=900')).steps).toEqual([]);
  });

  it('is idempotent, and Shorten still offers only the aliases that are shorter', () => {
    const once = normalise(piece('sound=saw dt=.25 delay=.3')).source;
    expect(normalise(once)).toEqual({ source: once, steps: [] });
    expect(shorten(piece('s=saw dt=.25 delay=.3')).some((s) => s.kind === 'alias')).toBe(false);
    expect(shorten(piece('s=saw cutoff=800')).find((s) => s.kind === 'alias')?.after).toBe('lpf=800');
  });

  it('every example, and every fragment of the seed library, is normal already', () => {
    for (const [key, p] of Object.entries(PRESETS)) expect([key, normalise(p.source).steps]).toEqual([key, []]);
    // (a meter compiles alone; a rhythm is open on its meter, a bass line on its meter and its harmony, and a harmony on
    // its meter and its key, so each is read on a 4/4 at a tempo, with a key and, unless it writes its own, a harmony,
    // where it fits; a mode writes its own key)
    const meter = '&bar meter("4/4") step=100bpm';
    const keyed = `${meter}\n&key scale(major, C)`;
    const bar = `${keyed}\n&harm over=key step=1m [0,2,4] [3,5,7]`;
    for (const f of LIBRARY) {
      const defines = holesOf(f.text, compileSource).defines;
      const bench = defines.includes('&key') ? meter : defines.includes('&harm') ? keyed : bar;
      // (a fragment's sound holes, the voices an instrument fills (#244), are filled by the General MIDI kit's and the bass's lines)
      const voices = [...LIBRARY.find((k) => k.id === 'gm kit')!.text.split('\n'), ...LIBRARY.find((k) => k.id === 'bass')!.text.split('\n')];
      const kit = holesOf(f.text, compileSource).sounds.map((n) => `\n${voices.find((l) => l.startsWith(`${n} `))!}`);
      const text = `${compileSource(f.text).ok ? f.text : unionOf(f.text, bench).text}${kit.join('')}`;
      expect([f.id, compileSource(text).ok, normalise(text).steps]).toEqual([f.id, true, []]);
    }
  });

  it('docs/language/canonical.md lists every alias it writes, and what it writes', () => {
    const page = readFileSync('docs/language/canonical.md', 'utf8');
    for (const [alias, ours] of Object.entries(PARAM_ALIASES)) expect([alias, new RegExp(`\\|[^|\\n]*\`${alias}=\`[^|\\n]*\\| \`${ours}=\``).test(page)]).toEqual([alias, true]);
  });
});
