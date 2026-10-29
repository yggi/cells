import { describe, expect, it } from 'vitest';
import { readArgs, render } from './render';

// The renderer itself is src/engine/render.ts's, tested there; this is the tool's reading of its command line and input.
describe('tools/render.ts: npm run render', () => {
  it('reads its input and flags, with a mix at 48 kHz, 24-bit, named for the input by default', () => {
    expect(readArgs(['example:electroswing'])).toEqual({ input: 'example:electroswing', out: 'electroswing.wav', rate: 48000, format: 'pcm24', seconds: undefined, stems: false });
    expect(readArgs(['--rate', '44100', 'x.cells', '--bits', '32f', '--seconds', '2', '--stems', '--out', 'y.wav'])).toEqual({
      input: 'x.cells',
      out: 'y.wav',
      rate: 44100,
      format: 'float32',
      seconds: 2,
      stems: true,
    });
  });
  it('refuses an unknown flag, a bit depth it doesn’t write, and no input', () => {
    expect(() => readArgs(['example:acid', '--loud'])).toThrow(/unknown flag --loud/);
    expect(() => readArgs(['example:acid', '--bits', '8'])).toThrow(/16, 24 or 32f/);
    expect(() => readArgs([])).toThrow(/npm run render/);
  });
  it('renders an example with its uses read from the seed library, at the rate asked', () => {
    const a = render(readArgs(['example:electroswing', '--seconds', '1', '--rate', '44100', '--stems']));
    expect(a.sampleRate).toBe(44100);
    expect(a.mix[0].length).toBe(44100 * 3);
    expect(a.diagnostics).toEqual([]);
    expect(a.stems.length).toBeGreaterThan(5);
  });
});
