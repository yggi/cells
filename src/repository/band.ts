/**
 * The band a score is played on, at the score's style (decision 063 §1; #391): which instrument each performer plays
 * is the band's choice, made by a query at resolution. A voice reads a style as a moving parameter (`lpf=450..900 *
 * &style[artic]`), and a wave or a set of envelopes is no such parameter, so a line can't choose a clarinet over the
 * lead's square; the resolver does, from the score's `&style`.
 *
 * `bandAt(point)` is the default band's text with each pitched voice replaced by the first instrument the library ranks
 * at the point, on the facet `instrument`, that defines it, where that isn't the performer's own instrument: at
 * Jambot's eight presets none is (each performer plays its own, as the band writes it), at Electro swing's and Spooky's
 * points the instruments cells wrote for them (#350, #366). Each holds its default's register, so MIDI out sends the
 * same notes. `resolveBand(score)` is a resolver that answers `band` so, at the style the score's `&style` starts on.
 *
 * Lifted from yggi/jambot packages/engine/src/instruments.ts @ 227aa74 (`instrumentsAt`, `PERFORMER_VOICES`): the
 * rule that found a preset's instruments in Jambot's composer (yggi/jambot#497, #527), moved into the band.
 * Pure.
 */
import { parse } from '../engine/parser';
import { expand } from '../engine/use';
import type { Resolve } from '../engine/program';
import { AXES, CENTRE as CENTRE_VALUES } from '../engine/style';
import type { CellDecl, StylePoint as WrittenStyle } from '../engine/ast';
import { createRepository, type Fragment, type Repository, type StylePoint } from './fragments';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { resolveSeed } from './library';

/** The voice each pitched performer plays (the seed performers, decision 058), and the instrument it takes it from. */
export const PERFORMER_VOICES = {
  bass: { voice: 'bassV', own: 'bass' },
  pad: { voice: 'padV', own: 'pad' },
  stab: { voice: 'keysV', own: 'keys' },
  lead: { voice: 'leadV', own: 'lead' },
} as const;

/** A pitched performer: one of `PERFORMER_VOICES`. */
export type VoicedPart = keyof typeof PERFORMER_VOICES;

/** An instrument a performer plays in place of its own: the fragment's id and the line that defines the voice. */
export interface FoundInstrument {
  readonly id: string;
  readonly line: string;
}

/** The centre of style space as a point (the language's, `CENTRE` in `engine/style.ts`), where a score that names no style is played. */
export const CENTRE: StylePoint = Object.fromEntries(AXES.map((a, i) => [a.name, CENTRE_VALUES[i]!]));

const repositories = new WeakMap<readonly Fragment[], Repository>();

/** The line of a fragment's text that defines a voice, if any. */
const lineOf = (text: string, voice: string) => text.split('\n').find((l) => l.startsWith(`&${voice} `));

/**
 * The instrument each pitched performer plays at a style's point, where it isn't the performer's own: the first that
 * defines the performer's voice in the ranking on the facet `instrument`. A performer whose own instrument ranks first
 * is left out, and plays as the band writes it.
 */
export function instrumentsAt(point: StylePoint, fragments: readonly Fragment[] = INSTRUMENT_FRAGMENTS): Partial<Record<VoicedPart, FoundInstrument>> {
  let repository = repositories.get(fragments);
  if (!repository) repositories.set(fragments, (repository = createRepository(fragments)));
  const ranked = repository.query(point, fragments.length, {}, { facet: 'instrument' });
  const found: Partial<Record<VoicedPart, FoundInstrument>> = {};
  for (const [part, { voice, own }] of Object.entries(PERFORMER_VOICES) as [VoicedPart, (typeof PERFORMER_VOICES)[VoicedPart]][]) {
    for (const { fragment } of ranked) {
      const line = lineOf(fragment.text, voice);
      if (line === undefined) continue;
      if (fragment.id !== own) found[part] = { id: fragment.id, line };
      break;
    }
  }
  return found;
}

/**
 * A band's text at a style's point: each pitched voice the found instrument's line (`instrumentsAt`), in place of the
 * band's own line for it, or after the band's lines where it writes none; the band as it is where nothing is found.
 */
export function bandAt(point: StylePoint, band: string = resolveSeed('band')!, fragments: readonly Fragment[] = INSTRUMENT_FRAGMENTS): string {
  const found = Object.values(instrumentsAt(point, fragments));
  if (!found.length) return band;
  const voiceOf = (line: string) => /^&(\w+)\s/.exec(line)?.[1];
  const by = new Map(found.map((f) => [voiceOf(f.line)!, f.line]));
  const lines = band.split('\n').map((l) => {
    const v = voiceOf(l);
    const line = v === undefined ? undefined : by.get(v);
    if (line === undefined) return l;
    by.delete(v!);
    return line;
  });
  return [...lines, ...by.values()].join('\n');
}

/** A style as `style=` writes it, read off the parsed text: a style cell's values, an unnamed one's, or a mix's weighted sum. */
function pointOf(p: WrittenStyle, decls: ReadonlyMap<string, CellDecl>): number[] | null {
  const valuesOf = (name: string): number[] | null => {
    const d = decls.get(name);
    if (d?.map?.kind !== 'style' || d.braid.kind !== 'list') return null;
    const v = d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN));
    return v.length === AXES.length && v.every((x) => Number.isFinite(x)) ? v : null;
  };
  if (p.kind === 'cell') return valuesOf(p.ref.name);
  const terms = p.terms.map((t) => ({ v: valuesOf(t.ref.name), w: t.weight }));
  if (terms.some((t) => !t.v)) return null;
  return AXES.map((_, i) => terms.reduce((a, t) => a + t.w * t.v![i]!, 0));
}

/**
 * The style a score starts on: where its `&style` note's `style=` starts (a range's first end), as a point on the axes;
 * null where the score names no style. A style it takes from elsewhere (`&funk from styles`, `&style style=&funk`) is
 * read through its expansion by `resolve` (the seed library by default), its band left out: a band reads the style, it
 * never sets it.
 */
export function scoreStyle(score: string, resolve: Resolve = resolveSeed): StylePoint | null {
  const { cells } = parse(expand(score, (id, hash) => (id === 'band' ? null : resolve(id, hash))));
  const decls = new Map(cells.map((c) => [c.name, c]));
  const style = decls.get('style')?.style;
  const v = style ? pointOf(style.from, decls) : null;
  return v ? Object.fromEntries(AXES.map((a, i) => [a.name, v[i]!])) : null;
}

/**
 * A resolver that answers `band` with the default band at the score's style (`bandAt` at `scoreStyle`, the centre where
 * it names none), and every other id as `resolve` does (the seed library by default, or a client's own library): what
 * a client hands the compile of a score that ends in `* from band`. A client with a band of its own answers `band`
 * with that instead, its own lines its choice of instruments.
 */
export function resolveBand(score: string, resolve: Resolve = resolveSeed): Resolve {
  const text = bandAt(scoreStyle(score, resolve) ?? CENTRE);
  return (id, hash) => (id === 'band' ? text : resolve(id, hash));
}
