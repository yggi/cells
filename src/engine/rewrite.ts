/**
 * A rewrite: what Migrate, Normalise and Shorten each find in a piece (decision 049), one change to its text with what it
 * does in a sentence. Shorten offers its rewrites as suggestions, measured (`shorten/harness.ts`); Migrate and Normalise
 * apply theirs, round after round (`rewriteAll`). Vary (`vary/`, decision 052) gives a fragment's variations as rewrites
 * too, each playing other notes, so `rewriteAll`, which takes only a rewrite that plays the same, never runs it. Pure.
 */
import { compileSource } from './compile';
import { soundsIdentical } from './sameness';

/** The tool a rewrite is one of. */
export type Tool = 'migrate' | 'normalise' | 'shorten' | 'vary';

export interface Rewrite<R extends string = string> {
  readonly id: string;
  readonly tool: Tool;
  /** The rule that found it (Shorten's are its suggestions' kinds). */
  readonly rule: R;
  /** In a sentence: what it does. */
  readonly title: string;
  /** What was written, and what it becomes (short excerpts). */
  readonly before: string;
  readonly after: string;
  readonly apply: (source: string) => string;
}

/** What a tool finds in a text that compiles. */
export type Find = (source: string, result: ReturnType<typeof compileSource>) => readonly Rewrite[];

/** How many rounds `rewriteAll` runs at most: a rewrite a round, so a text with more than this many is left part done. */
export const ROUNDS = 20;

/**
 * A tool's rewrites applied until none is left: each round the first that changes the text and plays the same notes
 * over the whole piece (`soundsIdentical`, S1 of decision 050), the text compiled again after it. The steps are the
 * rewrites' titles, in order.
 */
export function rewriteAll(source: string, find: Find, rounds = ROUNDS): { source: string; steps: string[] } {
  let now = source;
  const steps: string[] = [];
  for (let i = 0; i < rounds; i++) {
    const result = compileSource(now);
    if (!result.ok) break;
    let taken: { next: string; title: string } | null = null;
    for (const r of find(now, result)) {
      let next: string;
      try {
        next = r.apply(now);
      } catch {
        continue;
      }
      if (next !== now && soundsIdentical(now, next)) {
        taken = { next, title: r.title };
        break;
      }
    }
    if (!taken) break;
    steps.push(taken.title);
    now = taken.next;
  }
  return { source: now, steps };
}
