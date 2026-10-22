// A fragment's holes (decision 047, point 1): what it uses and doesn't define, what it defines, and what its clock needs,
// read off its declarations and its compile alone.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { setTiming } from '../engine/edit';
import { holesOf, lapMeets, meterMeets, type ClockNeed } from './holes';
import { RHYTHM_FRAGMENTS } from './rhythms';

const holes = (text: string) => holesOf(text, compileSource);
const need = (cell: string, tap: string, bars: number, steps: number, rate: number, bar: number): ClockNeed => ({ cell, meter: null, tap, bars, steps, rate, bar });

describe('what a fragment uses and defines', () => {
  it('uses the names its compile finds declared nowhere, and defines its lines’ names', () => {
    expect(holes('&line step=8n 0 2 4 over=&harm\n&out [&line * &lead]\n&lead s=saw loop=C3')).toEqual({
      uses: ['&harm'],
      sounds: [],
      defines: ['&line', '&out', '&lead'],
      clock: [],
    });
  });

  it('uses the main key where a line reads it and the text has none, as `key`', () => {
    expect(holes('&line step=8n 0 2 4 over=key').uses).toEqual(['key']);
    expect(holes('&key scale(major, C)\n&line step=8n 0 2 4 over=key').uses).toEqual([]);
  });

  it('uses a meter it names and doesn’t define; a tap of the main meter is a clock need, not a name', () => {
    expect(holes('&x step=&bar:16n 0 2').uses).toEqual(['&bar']);
    expect(holes('&x step=16n 0!16').uses).toEqual([]);
  });

  it('an unnamed cell is part of its line, not a name it defines', () => {
    expect(holes('&x step=1m &( 0 1 )').defines).toEqual(['&x']);
  });

  it('every rhythm uses nothing but a sound: the five claves’ `&claves`, which an instrument fills (#244)', () => {
    for (const f of RHYTHM_FRAGMENTS) {
      const h = holes(f.text);
      expect(h.uses, f.id).toEqual(f.id.includes('clave') ? ['&claves'] : []);
      expect(h.sounds, f.id).toEqual(h.uses);
    }
  });
});

describe('what its clock needs', () => {
  it('a braid of 32 sixteenths on cycle=2 needs bars of 16 sixteenths', () => {
    expect(holes(RHYTHM_FRAGMENTS.find((f) => f.id === 'son clave 3-2')!.text).clock).toEqual([need('&clave', '16n', 2, 32, 1, 16)]);
  });

  it('a one-bar line of 16 sixteenths needs bars of 16; one step on 1m, bars of one', () => {
    expect(holes('&x step=16n 0!16').clock).toEqual([need('&x', '16n', 1, 16, 1, 16)]);
    expect(holes('&x step=1m &rim(5,16,4)\n&rim s=white').clock).toEqual([need('&x', '1m', 1, 1, 1, 1)]);
  });

  it('a braid that comes round within the bar needs bars of a multiple of it; a rate takes its steps faster', () => {
    expect(holes('&x step=8n 0 2 4').clock).toEqual([need('&x', '8n', 1, 3, 1, 3)]);
    expect(holes('&x step=16n*2 0!16').clock).toEqual([need('&x', '16n', 1, 16, 2, 8)]);
    expect(holes('&x step=8n cycle=4 0!6').clock).toEqual([need('&x', '8n', 4, 6, 1, 3)]);
  });

  it('a tap of a meter the fragment brings itself needs nothing of the workbench', () => {
    expect(holes('&bar meter("3/4") step=90bpm\n&x step=8n 0!6').clock).toEqual([]);
    expect(holes('&m meter("3/4") step=90bpm\n&x step=&m:8n 0!6').clock).toEqual([]);
  });

  it('a need is met by a lap whose taps times its rate are a multiple of its steps', () => {
    const clave = need('&clave', '16n', 2, 32, 1, 16);
    expect([28, 32, 40, 48, 64].map((taps) => lapMeets(clave, taps))).toEqual([false, true, false, false, true]);
    const meter = (signature: string) => compileSource(setTiming(`&bar meter("${signature}")`, 'bar', 'step', '90bpm')).cells.get('bar')!.meter!;
    const sixteenth = { written: '16n', kind: 'note', whole: 1 / 16 } as const;
    expect(['4/4', '7/8', '5/4', '12/8', '2/4'].map((s) => meterMeets(clave, meter(s), sixteenth))).toEqual([true, false, false, false, false]);
  });
});
