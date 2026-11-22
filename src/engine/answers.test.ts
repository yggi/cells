/**
 * A fill as an argument, and each braid fill's answer in the lockfile (decision 085 §8.2, §8.3; #749, #792 6d). The
 * stand-in, `echo`, answers its subject (its fill's fuel 1, never refused).
 */
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import type { PluginFragment } from './fills';
import { answersOf, readPiece, withLockfile, writePiece, type PieceFile } from './piecefile';
import { resolveSeed } from '../repository/library';

const ECHO = '&out from &subject\n&out fill()';
const resolve = (id: string) => (id === 'echo' ? ECHO : resolveSeed(id));
let asked = 0;
const echo: PluginFragment = {
  id: 'echo',
  fragment: 'echo',
  fills: { out: { fuel: 1 } },
  origin: 0,
  cycle: 0,
  stepSeconds: 0,
  fill: (_name, _lap, args) => {
    asked++;
    return args.subject ?? '';
  },
};
const said = (r: ReturnType<typeof compileSource>) =>
  r.diagnostics.filter((d) => d.severity === 'error' || d.message.includes('refused')).map((d) => `${d.span.line}: ${d.message}`);
/** A cell's steps as compiled, without where they are written. */
const steps = (r: ReturnType<typeof compileSource>, name: string) => JSON.stringify(r.cells.get(name)?.units, (k, v) => (k === 'span' ? undefined : v));

describe('a fill as an argument (085 §8.3)', () => {
  it('is handed as its answer, its line taken first wherever it is written', () => {
    const r = compileSource('&x from echo [&h &h^1]\n&h from echo 0 2 4', undefined, { resolve, plugins: [echo] });
    expect(said(r)).toEqual([]);
    // (&h's answer, 0 2 4, and a degree up, in one step: the steps it plays)
    expect(r.takes![0]!.answers?.[0]?.text).toBe('0@1/6 2@1/6 4@1/6 1@1/6 3@1/6 5@1/6');
  });

  it('two that read each other’s fills: an error on each, naming both', () => {
    const r = compileSource('&a from echo &b\n&b from echo &a', undefined, { resolve, plugins: [echo] });
    expect(said(r).filter((m) => m.includes('each other'))).toEqual([
      '1: "echo" and "echo" read each other\'s fills: neither can be answered first (decision 085 §8.3)',
      '2: "echo" and "echo" read each other\'s fills: neither can be answered first (decision 085 §8.3)',
    ]);
  });

  it('a stream is refused as a braid fill’s argument', () => {
    const r = compileSource('&day scan(1!24) loop=1d\n&cycle from five_to_twelve &day\n&x from echo &cycle_notes', undefined, { resolve, plugins: [echo] });
    expect(said(r)).toEqual([
      '3: "echo" refused: its subject= &cycle_notes is a fill with no answer to hand (a stream\'s, or one refused): a braid fill is handed answers (wire 1)',
    ]);
  });
});

describe('each braid fill’s answer in the lockfile (085 §8.2)', () => {
  const piece = '&x from echo [0 2 4]';

  it('is recorded by its arguments’ core, and plays without the code', () => {
    const made = compileSource(piece, undefined, { resolve, plugins: [echo] });
    const answers = made.takes![0]!.answers!;
    expect(answers).toEqual([{ id: 'echo', fill: 'out', args: expect.stringMatching(/^a1:/), text: '0@1/3 2@1/3 4@1/3' }]);
    // (no code: the recorded answer plays)
    const kept = compileSource(piece, undefined, { resolve, answers });
    expect(steps(kept, 'x')).toBe(steps(made, 'x'));
    // (with the code: the recorded answer plays, the code not asked)
    asked = 0;
    compileSource(piece, undefined, { resolve, plugins: [echo], answers });
    expect(asked).toBe(0);
    // (arguments changed and no code: unanswered, as any fill with no code)
    const changed = compileSource('&x from echo [0 2 5]', undefined, { resolve, answers });
    expect(changed.cells.get('x')?.fill?.fragment).toBe('echo');
  });

  it('a renamed text keeps its answer (L1): the key is the arguments’ core, not their names', () => {
    const a = compileSource('&m 0 2 4\n&x from echo &m', undefined, { resolve, plugins: [echo] }).takes![0]!.answers;
    const b = compileSource('&motif 0 2 4\n&x from echo &motif', undefined, { resolve, plugins: [echo] }).takes![0]!.answers;
    expect(a).toHaveLength(1);
    expect(b).toEqual(a);
  });

  it('a piece file holds them beside its uses, and reads them back', () => {
    const file = readPiece(`---\ntitle: "Echo"\n---\n\n\`\`\`cells\n${piece}\n\`\`\`\n`) as PieceFile;
    const r = compileSource(file.text, undefined, { resolve, plugins: [echo] });
    const written = writePiece(withLockfile(file, r.takes!));
    expect(written).toMatch(/\nanswers:\n/);
    const back = readPiece(written) as PieceFile;
    expect(answersOf(back)).toEqual(r.takes![0]!.answers);
    expect(steps(compileSource(back.text, undefined, { resolve, answers: answersOf(back) }), 'x')).toBe(steps(r, 'x'));
  });
});
