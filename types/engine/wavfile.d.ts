/**
 * A WAV file's bytes (RIFF, little-endian): the twin of `writeMidi` (decision 062). Channels interleaved, as 16- or
 * 24-bit PCM (each sample clipped to full scale and rounded) or 32-bit float (kept as it is: a stem's headroom).
 */
/** A sample's format: a mix is 24-bit PCM by default, a stem 32-bit float (decision 062). */
export type WavFormat = 'pcm16' | 'pcm24' | 'float32';
/** The channels (all one length) as a WAV file at the sample rate. */
export declare function writeWav(channels: readonly Float32Array[], sampleRate: number, format?: WavFormat): Uint8Array;
