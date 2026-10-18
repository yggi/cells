import { describe, expect, it } from 'vitest';
import { shorten } from './index';
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { PRESETS } from '../presets';

// Decision 044: a table of sections named &parts is offered as &sections, the name the examples use.
const SONG = `&bar meter("4/4") step=120bpm
&parts step=4n &keysBar &drumBar
&song over=&parts step=1m laps=1 0 [0,1]
&keys step=&keysBar/4 0 4
&kick step=&drumBar 0 ~
&v s=tri loop=C4
&out map=sample [&keys * &v, &kick * &v]`;

const migration = (src: string) => shorten(src).find((s) => s.kind === 'section');
const notes = (src: string) => {
  const r = compileSource(src);
  return eventsBetween(plan(r, codeShifts(r)), 0, 10).map((e) => `${e.at.toFixed(4)} ${e.voice} ${e.freq.toFixed(3)}`);
};

describe('a table of sections named &parts (decision 044)', () => {
  it('is offered as &sections, every reference renamed, playing the same notes', () => {
    const s = migration(SONG)!;
    expect([s.before, s.after]).toEqual(['&parts step=4n &keysBar &drumBar', '&sections step=4n &keysBar &drumBar']);
    const next = s.apply(SONG);
    expect(next).not.toMatch(/&parts\b/);
    expect(next).toMatch(/^&song over=&sections /m);
    expect(compileSource(next).sections?.get('keysBar')).toBe('sections');
    expect(notes(next)).toEqual(notes(SONG));
  });

  it('is offered for no other name, nor for a cell named &parts that is no table of sections, nor where &sections is taken', () => {
    expect(migration(SONG.replace(/&parts\b/g, '&form'))).toBeUndefined();
    expect(migration('&bar step=1\n&parts step=&bar 0 2\n&v s=tri loop=C4\n&out map=sample [&parts * &v]')).toBeUndefined();
    expect(migration(SONG + '\n&sections 0 1')).toBeUndefined();
  });

  it('leaves no example a table named &parts', () => {
    for (const [key, { source }] of Object.entries(PRESETS)) expect(migration(source), key).toBeUndefined();
  });
});
