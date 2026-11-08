import { describe, expect, it } from 'vitest';
import { shortenAll } from './index';
import { soundsIdentical } from '../sameness';

describe('Shorten never folds a sign away (#193: a negative gain is phase inversion)', () => {
  it('a mix of a voice and its inversion keeps sounding as written, whatever it rewrites', () => {
    const src = `&bar scan(1 1 1 1) step=120bpm
&tune over=scale(major) step=8n 0 2 4 2
&lead s=tri loop=C5
&left [&tune * &lead * .4]
&right [&tune * &lead * -.4]
&out map=sample [&left, &right * 2]
`;
    const { source } = shortenAll(src);
    expect(soundsIdentical(src, source)).toBe(true);
    expect(source).toMatch(/-\.4|-0\.4|-\.8/);
  });
});
