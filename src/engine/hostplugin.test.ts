/**
 * The host's runtime seam (decision 085 §6, #792 6e): a plugin-fragment's code is handed by the host
 * (`CompileOptions.plugins`), behind the interface the built-ins answer, for a stream's fills as for a braid's; cells runs
 * it in-process here, a stand-in in TypeScript (the WASM worker is Cell studio's, rung 4). `counting` is a law of its
 * own: lap n plays n, n + 1, n + 2, n + 3.
 */
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { lawAt, lawIn, type PluginFragment } from './fills';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';

const COUNTING = '&cycle from &clock\n&cycle [&notes * &level]\n&notes step=1 fill()\n&level map=amp step=1 fill()';
const resolve = (id: string) => (id === 'counting' ? COUNTING : null);
const law = (from: number): PluginFragment => ({
  id: 'counting',
  fragment: 'counting',
  fills: { notes: { lap: 4 }, level: { lap: 4 } },
  origin: 0,
  cycle: 16,
  stepSeconds: 0.5,
  fill: (name, lap) => (name === 'notes' ? [0, 1, 2, 3].map((k) => from + lap + k).join(' ') : '1 1 1 1'),
});
const PIECE = '&clock scan(1!4) loop=1min\n&cycle from counting &clock\n&v s=sine loop=C4\n&out map=sample [&cycle * &v]';
const played = (plugin: PluginFragment, from: number, to: number) => {
  const r = compileSource(PIECE, undefined, { resolve, plugins: [plugin] });
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return { r, events: eventsBetween(plan(r, codeShifts(r)), from, to) };
};

describe('a host’s plugin-fragment plays its stream (#792 6e)', () => {
  it('its laps are its code’s answers, lap by lap', () => {
    const { r, events } = played(law(0), 0, 4);
    expect(lawIn(r)?.fragment).toBe('counting');
    expect(lawAt(r, 'clock')?.fragment).toBe('counting');
    // (two laps of four notes, each a step of half a second, semitones with no key: lap 1 starts one up)
    expect(events.length).toBe(8);
    const pitches = [...events].sort((a, b) => a.at - b.at).map((e) => Math.round(12 * Math.log2(e.freq / events[0]!.freq)));
    expect(pitches).toEqual([0, 1, 2, 3, 1, 2, 3, 4]);
  });

  it('two hosts’ codes of one id never share laps', () => {
    const a = played(law(0), 0, 2).events.map((e) => Math.round(e.freq));
    const b = played(law(2), 0, 2).events.map((e) => Math.round(e.freq));
    expect(b).not.toEqual(a);
  });
});
