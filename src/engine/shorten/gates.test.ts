import { describe, expect, it } from 'vitest';
import { shorten } from './index';

const BASE = `&bar scan(1 1 1 1) step=120bpm
&major scale(major)
&lead s=tri loop=C5
&bell s=sine loop=C6
&tune over=&major step=&bar*2 0 2 4 2
&accent map=amp step=&bar*2 1 .5 .8 .5
&duck map=amp step=&bar 1 .25
`;

describe('Shorten: a gate written the old way (decision 023)', () => {
  it('play= for trigger=, one level= for velocity= gate= gain=, its voices a chord', () => {
    const src = BASE + '&leadOut trigger=&tune velocity=&accent gate=&duck gain=.4 &lead &bell\n&out map=sample &leadOut';
    const s = shorten(src).find((x) => x.kind === 'gate');
    expect(s?.after).toBe('&leadOut play=&tune level=&accent*&duck*.4 [&lead, &bell]');
    expect(s!.apply(src)).toBe(BASE + '&leadOut play=&tune level=&accent*&duck*.4 [&lead, &bell]\n&out map=sample &leadOut');
  });
  it('one voice stays as it is; no levels, no level=', () => {
    const src = BASE + '&leadOut trigger=&tune &lead\n&out map=sample &leadOut';
    expect(shorten(src).find((x) => x.kind === 'gate')?.after).toBe('&leadOut play=&tune &lead');
  });
  it('nothing to offer for a gate written the new way', () => {
    expect(shorten(BASE + '&leadOut play=&tune level=.4 [&lead, &bell]\n&out map=sample &leadOut').some((x) => x.kind === 'gate')).toBe(false);
  });
});
