/**
 * Shorten: read the code like a linter, find what's written out longhand, and
 * offer it shorter — the measure is the code's length, the promise that it
 * sounds the same. One rule a file:
 *
 *  - runs.ts:      0 0 0 0 → 0!4
 *  - phrases.ts:   a phrase written twice or more becomes a cell of its own, used where it was
 *  - fractions.ts: every step's length shares a factor — divide it out, slow the clock
 *  - same.ts:      two cells written exactly alike — one, used by both names' users
 *  - defaults.ts:  an attribute that says what would be so anyway (loop=SAMPLE_RATE, cycle= its length, pan=.5)
 *  - progressions.ts: a transposing loop=&x/N with the bars multiplied out — step=&x/(N/k)
 *  - stereo.ts:    a sound card's two chords that differ only in gains — one chord, and pan= on each voice
 *  - wrappers.ts:  a cell that only reads motifs through a shifted table — &motif^k where it's used
 *  - aliases.ts:   Strudel's or dough's name for a parameter where ours is shorter: cutoff= → lpf= (decision 027)
 *  - gates.ts:     a migration: a gate written the old way (trigger=, velocity=, gate=, gain=) as play= and level= (decision 023)
 *  - taps.ts:      a migration: a line stepped by a meter cell's own steps (step=&bar*2) as a tap of the meter (step=8n, decision 040)
 *  - swing.ts:     a migration: a bare swing=.67 on a meter as the level it leans (swing=8n:.67, #18)
 *  - sections.ts:  a migration: a table of sections named &parts as &sections (decision 044)
 *  - card.ts:      a migration: a card that says what the piece is (title= tags= tier=) as a piece file, those in its
 *                  frontmatter (decision 047); its rewrite is a file, not a text, so shortenAll never takes it
 *
 * Each rule returns rewrites (../rewrite.ts), each one checked by the rule; a rewrite is offered as a suggestion, its
 * saving measured on the result (harness.ts: the cells a rule may touch, the measure). The note-for-note check is the
 * tools' own (../sameness.ts).
 */
import { compileSource } from '../compile';
import type { CompileOptions } from '../program';
import { candidates, size, suggestion, type ShortenRewrite, type Suggestion } from './harness';
import { runs } from './runs';
import { phrases } from './phrases';
import { fractions } from './fractions';
import { sameCells } from './same';
import { defaults } from './defaults';
import { progressions } from './progressions';
import { wrappers } from './wrappers';
import { stereo } from './stereo';
import { gates } from './gates';
import { aliases } from './aliases';
import { taps } from './taps';
import { swings } from './swing';
import { sections } from './sections';
import { card } from './card';

export type { Suggestion } from './harness';

/**
 * Everything that could be written shorter, the largest saving first. A piece's `use` lines read through `options`
 * (decision 054, #241): what is offered is what the piece written out would be offered, less any rewrite of a used line
 * (one the piece would then define over its fragment's).
 */
export function shorten(source: string, options: CompileOptions = {}): Suggestion[] {
  const { result, cells } = candidates(source, options);
  if (!result.ok) return [];
  const found = [
    ...runs(source, cells),
    ...phrases(source, cells, result, options),
    ...fractions(source, cells, result),
    ...sameCells(source, result),
    ...defaults(source, result, options),
    ...progressions(source, result, options),
    ...wrappers(source, result, options),
    ...stereo(source, result, options),
    ...gates(source, result, options),
    ...aliases(source, result),
    ...taps(source, result, options),
    ...swings(source, result, options),
    ...sections(source, result, options),
    ...card(source, options),
  ];
  const kept = result.uses?.length ? found.filter((r) => r.rule === 'card' || keepsUsed(r, source, options, overridden(result))) : found;
  return kept.map((r) => suggestion(source, r)).sort((a, b) => b.saving - a.saving);
}

const overridden = (r: ReturnType<typeof compileSource>) =>
  (r.uses ?? [])
    .flatMap((u) => u.overrode)
    .sort()
    .join(' ');

/** Does a rewrite of a piece with `use` lines leave them as they were: it compiles, and overrides no more of their lines? */
function keepsUsed(r: ShortenRewrite, source: string, options: CompileOptions, before: string): boolean {
  try {
    const next = compileSource(r.apply(source), undefined, options);
    return next.ok && overridden(next) === before;
  } catch {
    return false;
  }
}

/** Shorten again and again — the best each time — until nothing more pays. */
export function shortenAll(source: string, rounds = 60, options: CompileOptions = {}): { source: string; steps: string[] } {
  let now = source;
  const steps: string[] = [];
  for (let i = 0; i < rounds; i++) {
    // (the card's migration rewrites the text as a file: the text is shortened, the file is the frontend's to make)
    const best = shorten(now, options).find((s) => s.kind !== 'card');
    if (!best) break;
    const next = best.apply(now);
    if (size(next) >= size(now)) break;
    steps.push(`−${best.saving}: ${best.title}`);
    now = next;
  }
  return { source: now, steps };
}
