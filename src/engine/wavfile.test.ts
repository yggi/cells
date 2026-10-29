// A WAV file's bytes (decision 062): the RIFF header, its formats, and a chunk of an odd size padded.
import { describe, expect, it } from 'vitest';
import { writeWav } from './wavfile';

const view = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);
const text = (b: Uint8Array, at: number) => String.fromCharCode(...b.subarray(at, at + 4));

describe('writeWav', () => {
  it('writes a RIFF header that says its format, its channels and its rate', () => {
    const b = writeWav([Float32Array.of(0, 0.5), Float32Array.of(-0.5, 1)], 48000);
    expect([text(b, 0), text(b, 8), text(b, 12), text(b, 36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    const v = view(b);
    expect([v.getUint16(20, true), v.getUint16(22, true), v.getUint32(24, true), v.getUint16(34, true), v.getUint32(40, true)]).toEqual([1, 2, 48000, 24, 12]);
    // interleaved, 24-bit: the second frame's left is .5 of full scale, its right full scale
    const s24 = (at: number) => v.getUint8(at) | (v.getUint8(at + 1) << 8) | (v.getInt8(at + 2) << 16);
    expect([s24(44 + 6), s24(44 + 9)]).toEqual([Math.round(0.5 * 0x7fffff), 0x7fffff]);
  });

  it('keeps a float as it is, and clips PCM to full scale', () => {
    const f = view(writeWav([Float32Array.of(1.5)], 44100, 'float32'));
    expect([f.getUint16(20, true), f.getFloat32(44, true)]).toEqual([3, 1.5]);
    expect(view(writeWav([Float32Array.of(1.5, -2)], 44100, 'pcm16')).getInt16(46, true)).toBe(-0x7fff);
  });

  it('pads a data chunk of an odd size to an even one, as RIFF asks, without counting the pad', () => {
    const b = writeWav([Float32Array.of(0.25)], 48000, 'pcm24');
    expect(b.length).toBe(48);
    expect([view(b).getUint32(4, true), view(b).getUint32(40, true)]).toEqual([40, 3]);
  });

  it('refuses channels of different lengths', () => {
    expect(() => writeWav([new Float32Array(2), new Float32Array(3)], 48000)).toThrow(/one length/);
  });
});
