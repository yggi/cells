/**
 * A piece rendered to WAV (decision 062), in Node, with no browser: for a review's preview and an example's loudness.
 *
 *   npm run render -- <input> [--out file.wav] [--rate 48000] [--bits 24|16|32f] [--seconds n] [--stems voices|entries]
 *
 * An input is `example:<key>`, a piece or fragment file (`.md`) or a `.cells` text (as `npm run structure` reads it). The
 * mix is written to `--out` (`<key>.wav` in the working directory by default); `--stems voices` writes a stem a voice beside
 * it, `--stems entries` a stem an entry of the card (`<name>.<stem>.wav`, 32-bit float); the stems sum to the mix. It prints the span, the loudness and what the render
 * couldn't sound.
 */
import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pieceAudio, type PieceAudio } from '../src/engine/audioexport';
import { compileSource } from '../src/engine/compile';
import { codeShifts, DEFAULT_ENV } from '../src/engine/program';
import type { Tracks } from '../src/engine/render';
import { writeWav, type WavFormat } from '../src/engine/wavfile';
import { resolveSeed } from '../src/repository/library';
import { textOf } from './structure';

export interface RenderArgs {
  readonly input: string;
  readonly out: string;
  readonly rate: number;
  readonly format: WavFormat;
  readonly seconds?: number;
  readonly tracks: Tracks;
}

/** The command line, read: an unknown flag or a missing input is an error. */
export function readArgs(argv: readonly string[]): RenderArgs {
  const flag = (name: string) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const known = new Set(['--out', '--rate', '--bits', '--seconds', '--stems']);
  for (const a of argv) if (a.startsWith('--') && !known.has(a)) throw new Error(`unknown flag ${a}`);
  const values = new Set(['--out', '--rate', '--bits', '--seconds', '--stems'].map((f) => argv.indexOf(f) + 1).filter((i) => i > 0));
  const input = argv.find((a, i) => !a.startsWith('--') && !values.has(i));
  if (!input) throw new Error('npm run render -- <example:key | file.md | file.cells> [--out file.wav] [--rate n] [--bits 24|16|32f] [--seconds n] [--stems voices|entries]');
  const bits = flag('--bits') ?? '24';
  const format: WavFormat | undefined = ({ '16': 'pcm16', '24': 'pcm24', '32f': 'float32' } as const)[bits as '16' | '24' | '32f'];
  if (!format) throw new Error(`--bits is 16, 24 or 32f, not ${bits}`);
  const stems = flag('--stems');
  if (argv.includes('--stems') && stems !== 'voices' && stems !== 'entries') throw new Error(`--stems is voices or entries, not ${stems ?? 'nothing'}`);
  const seconds = flag('--seconds');
  const name = input.startsWith('example:') ? input.slice('example:'.length) : basename(input).replace(/\.(md|cells)$/, '');
  return {
    input,
    out: flag('--out') ?? `${name}.wav`,
    rate: Number(flag('--rate') ?? 48000),
    format,
    seconds: seconds === undefined ? undefined : Number(seconds),
    tracks: stems ?? 'mix',
  };
}

/** The input rendered: compiled at the render's rate (`SAMPLE_RATE`), its uses read from the seed library. */
export function render(args: RenderArgs): PieceAudio {
  const r = compileSource(textOf(args.input), { ...DEFAULT_ENV, SAMPLE_RATE: args.rate }, { resolve: resolveSeed });
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length) throw new Error(`${args.input} doesn't compile: ${errors.map((d) => d.message).join('; ')}`);
  return pieceAudio(r, codeShifts(r), { sampleRate: args.rate, seconds: args.seconds, tracks: args.tracks });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = readArgs(process.argv.slice(2));
  const a = render(args);
  writeFileSync(args.out, writeWav([...a.mix], a.sampleRate, args.format));
  for (const s of a.stems) writeFileSync(args.out.replace(/\.wav$/, `.${s.name.replace(/[^\w.-]/g, '_')}.wav`), writeWav([...s.channels], a.sampleRate, 'float32'));
  const db = (x: number) => (Number.isFinite(x) ? `${x.toFixed(2)} dB` : 'silent');
  console.log(`${args.out}: ${(a.span.to - a.span.from).toFixed(2)} s (${a.span.why}${a.span.capped ? ', capped' : ''}) and a ${a.span.tail} s tail, ${a.sampleRate} Hz`);
  console.log(`loudness ${db(a.loudness.rms)}, peak ${db(a.loudness.peak)}${a.loudness.clipped ? `, ${a.loudness.clipped} samples at full scale` : ''}`);
  if (a.stems.length) console.log(`stems: ${a.stems.map((s) => s.name).join(', ')}`);
  for (const d of a.diagnostics) console.log(`not sounded: ${d.message}`);
}
