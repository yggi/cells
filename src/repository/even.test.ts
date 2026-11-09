// The even rhythms (decision 072, #507): the timelines of the library that are maximally even necklaces are even(k, n, p)'s
// places, struck as written. Each stays written out, and this states the identity. The bell is the major scale stepped
// over a bar, even(7, 12, 5); the tresillo's durations even(3, 8, 2); the cinquillo even(5, 8, 2); the bossa nova clave
// even(5, 16, 2), in one bar of sixteenths and over two of eighths. The son and rumba claves are not even: no phase of
// even(5, 16) is theirs, which is what makes them the claves they are. Striking even's places by phase is #531's.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { even } from '../theory/modes';
import { resolveSeed } from './library';

/** 4/4 at 120 bpm: a bar is two seconds. */
const BAR = 2;
const host = '&bar meter("4/4") step=120bpm\n&v s=sine loop=C4';

/** A fragment's onsets over `bars` bars, as places on a grid of `n` per that span, and what its compiler said. */
function onsets(lines: string, bars: number, n: number): { places: number[]; diagnostics: string[] } {
  const r = compileSource(`${host}\n${lines}`, undefined, { resolve: resolveSeed });
  const at = eventsBetween(plan(r, codeShifts(r)), 0, bars * BAR - 1e-9).map((e) => (e.at / (bars * BAR)) * n);
  return { places: [...new Set(at.map((x) => Math.round(x * 1e6) / 1e6))].sort((a, b) => a - b), diagnostics: r.diagnostics.map((d) => d.message) };
}

const clave = (id: string) => `&clave, &percussion from ${id}\n&claves note=75 s=sine loop=C6\n&out map=sample [&percussion]`;

/** Each timeline: how it is taken, over how many bars, its grid, and its necklace (k, n) with the phase that is it, or none. */
const TIMELINES: Record<string, { text: string; bars: number; k: number; n: number; phase: number | null }> = {
  bell_and_scale: { text: '&key, &bell, &agogo from bell_and_scale C\n&highagogo note=67 s=sine loop=C6\n&out map=sample [&agogo]', bars: 1, k: 7, n: 12, phase: 5 },
  tresillo: { text: '&tresillo from tresillo &key\n&key scale(major, C)\n&out map=sample [&tresillo * &v]', bars: 1, k: 3, n: 8, phase: 2 },
  cinquillo: { text: clave('cinquillo'), bars: 1, k: 5, n: 8, phase: 2 },
  bossa_nova_clave_one_bar: { text: clave('bossa_nova_clave_one_bar'), bars: 1, k: 5, n: 16, phase: 2 },
  bossa_nova_clave: { text: clave('bossa_nova_clave'), bars: 2, k: 5, n: 16, phase: 2 },
  son_clave_3_2: { text: clave('son_clave_3_2'), bars: 2, k: 5, n: 16, phase: null },
  son_clave_2_3: { text: clave('son_clave_2_3'), bars: 2, k: 5, n: 16, phase: null },
  rumba_clave_3_2: { text: clave('rumba_clave_3_2'), bars: 2, k: 5, n: 16, phase: null },
};

describe('the even rhythms: even(k, n, p)’s places, struck as written', () => {
  it.each(Object.entries(TIMELINES))('%s', (_, { text, bars, k, n, phase }) => {
    const { places, diagnostics } = onsets(text, bars, n);
    expect(diagnostics).toEqual([]);
    expect(places).toHaveLength(k);
    // (every phase of a necklace, each starting on 0: the timeline is one of them, or, not even, none)
    const phases = Array.from({ length: k }, (_, p) => p).filter((p) => even(k, n, p).join() === places.join());
    expect(phases).toEqual(phase === null ? [] : [phase]);
  });
});
