/**
 * A WAV file's bytes (RIFF, little-endian): the twin of `writeMidi` (decision 062). Channels interleaved, as 16- or
 * 24-bit PCM (each sample clipped to full scale and rounded) or 32-bit float (kept as it is: a stem's headroom).
 */

/** A sample's format: a mix is 24-bit PCM by default, a stem 32-bit float (decision 062). */
export type WavFormat = 'pcm16' | 'pcm24' | 'float32';

/** The channels (all one length) as a WAV file at the sample rate. */
export function writeWav(channels: readonly Float32Array[], sampleRate: number, format: WavFormat = 'pcm24'): Uint8Array {
  const chs = channels.length;
  const frames = chs ? channels[0]!.length : 0;
  if (channels.some((c) => c.length !== frames)) throw new RangeError('a WAV file’s channels are all one length');
  const bytes = format === 'pcm16' ? 2 : format === 'pcm24' ? 3 : 4;
  const data = frames * chs * bytes;
  // (a chunk of an odd size is padded to an even one, as RIFF asks; the pad isn't counted in its size)
  const out = new Uint8Array(44 + data + (data % 2));
  const view = new DataView(out.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + data + (data % 2), true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  // (1: PCM, 3: IEEE float)
  view.setUint16(20, format === 'float32' ? 3 : 1, true);
  view.setUint16(22, chs, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * chs * bytes, true);
  view.setUint16(32, chs * bytes, true);
  view.setUint16(34, bytes * 8, true);
  text(36, 'data');
  view.setUint32(40, data, true);
  let at = 44;
  const top = format === 'pcm16' ? 0x7fff : 0x7fffff;
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < chs; c++) {
      const v = channels[c]![i]!;
      if (format === 'float32') view.setFloat32(at, v, true);
      else {
        const x = Math.round(Math.max(-1, Math.min(1, v)) * top);
        if (format === 'pcm16') view.setInt16(at, x, true);
        else {
          view.setUint8(at, x & 0xff);
          view.setUint8(at + 1, (x >> 8) & 0xff);
          view.setUint8(at + 2, (x >> 16) & 0xff);
        }
      }
      at += bytes;
    }
  return out;
}
