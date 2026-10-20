// Decision 052's examples (#208): the ladder's variations as operators over a fragment's text. This holds what each of
// the decision's ```cells blocks claims, and that Vary (`vary/`, rung 1: the rhythm operators) gives the drum bar's
// variations as written there; the bass's wait for the pitched operators (rung 2). A block is a label (`# source: …`, or `# by: <operator>
// <line> [<amount>]` for a variation of the source before it), the workbench's lines, a blank line, and the fragment.
// Each compiles; each variation plays other notes than its source and the others (S2), keeps its anchors (the anchored
// lines' notes, S3, and each anchored note) and its holes, changes only the line it names, and does to it what its
// operator says.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileSource } from './compile';
import { flatten } from './flatten';
import { codeShifts } from './program';
import { playsSameNotes, sameNotes } from './sameness';
import { holesOf } from '../repository/holes';
import { anchorsOf, variations } from './vary';

const DECISION = resolve(import.meta.dirname, '../../docs/decisions/052-variations-as-operators.md');
const blocks = [...readFileSync(DECISION, 'utf8').matchAll(/^```cells\n([\s\S]*?)^```/gm)].map((m) => m[1]);

interface Example {
  readonly label: string;
  readonly text: string;
  readonly fragment: string;
}

interface Variation extends Example {
  readonly operator: string;
  readonly line: string;
  readonly amount: number | null;
}

const example = (text: string): Example => {
  const [label, ...rest] = text.trimEnd().split('\n');
  return { label, text, fragment: rest.slice(rest.indexOf('') + 1).join('\n') };
};

/** The decision's examples: each source, and the variations written after it. */
const groups: { source: Example; variations: Variation[] }[] = [];
for (const text of blocks) {
  const e = example(text);
  const by = /^# by: (\w+) &(\w+)(?: (-?\d+))?$/.exec(e.label);
  if (e.label.startsWith('# source:')) groups.push({ source: e, variations: [] });
  else if (by) groups.at(-1)!.variations.push({ ...e, operator: by[1], line: by[2], amount: by[3] === undefined ? null : Number(by[3]) });
  else throw new Error(`a block labelled neither source nor by: ${e.label}`);
}

/** What the decision says each source's anchors are, and its lines' lap in steps. */
const SOURCES = [
  { lap: 16, lines: ['kick', 'backbeat'], notes: [] as number[] },
  { lap: 8, lines: [], notes: [0, 4] },
];

/** A line's notes as the parser reads them: step, length, value (a degree, or a kit member's place), level. */
const notesOf = (text: string, line: string) => {
  const r = compileSource(text);
  return flatten(r, line, codeShifts(r)).map((e) => ({ step: e.step, duration: e.duration, value: e.value, level: e.level }));
};
type Note = ReturnType<typeof notesOf>[number];
const key = (n: Note) => `${n.step}:${n.duration}:${n.value}:${n.level ?? ''}`;
const keys = (notes: readonly Note[]) => notes.map(key).sort();

/** What the operator does to a line's notes, as the decision's table says, the anchored steps kept. */
function expected(v: Variation, before: readonly Note[], lap: number, anchored: readonly number[]): Note[] {
  const free = (n: Note) => !anchored.includes(n.step);
  switch (v.operator) {
    case 'rotate':
      return before.map((n) => ({ ...n, step: (n.step + 1) % lap }));
    case 'drop':
      return before.filter((n) => n.step !== v.amount);
    case 'add': {
      const first = [...before].sort((a, b) => a.step - b.step)[0];
      return [...before, { ...first, step: v.amount!, level: Math.max(...before.map((n) => n.level ?? 1)) }];
    }
    case 'transpose':
      return before.map((n) => (free(n) ? { ...n, value: n.value + v.amount! } : n));
    case 'invert': {
      const first = [...before].sort((a, b) => a.step - b.step)[0].value;
      return before.map((n) => (free(n) ? { ...n, value: 2 * first - n.value } : n));
    }
    case 'reverse': {
      // within each span between two anchored steps (the whole lap where there are none), each note's place mirrored
      const starts = [...anchored, lap];
      return before.map((n) => {
        if (!free(n)) return n;
        const end = starts.find((s) => s > n.step)!;
        const start = Math.max(0, ...anchored.filter((s) => s < n.step));
        const from = anchored.includes(start) ? start + 1 : start;
        return { ...n, step: from + end - n.step - n.duration };
      });
    }
    default:
      throw new Error(`no operator ${v.operator}`);
  }
}

describe("decision 052's examples", () => {
  it('are two sources with three variations each, as the decision says', () => {
    expect(groups.map((g) => [g.source.label, g.variations.map((v) => `${v.operator} &${v.line}`)])).toEqual([
      ["# source: a drum bar, the host's meter first", ['rotate &hat', 'drop &hat', 'add &hat']],
      ["# source: a bass over the chord in force, the host's meter, key and harmony first", ['transpose &bass', 'invert &bass', 'reverse &bass']],
    ]);
  });

  for (const [g, { source, variations }] of groups.entries()) {
    const { lap, lines, notes: anchored } = SOURCES[g];

    it(`${source.label}: compiles with no diagnostic`, () => {
      const r = compileSource(source.text);
      expect(r.diagnostics.map((d) => d.message)).toEqual([]);
      expect(r.ok).toBe(true);
    });

    if (anchored.length)
      it(`${source.label}: its anchored notes are the chord's root where the chord in force changes`, () => {
        // &harm steps on 2n and &bass on 8n: the harmony's step k is the bass's step 4k
        const r = compileSource(source.text);
        const changes = [...new Set(flatten(r, 'harm', codeShifts(r)).map((e) => e.step * 4))];
        expect(changes).toEqual(anchored);
        expect(
          notesOf(source.text, 'bass')
            .filter((n) => anchored.includes(n.step))
            .map((n) => n.value),
        ).toEqual(anchored.map(() => 0));
      });

    for (const [i, v] of variations.entries())
      describe(v.label, () => {
        it('compiles with no diagnostic', () => {
          const r = compileSource(v.text);
          expect(r.diagnostics.map((d) => d.message)).toEqual([]);
          expect(r.ok).toBe(true);
        });

        it('plays other notes than its source and than the variations before it (S2)', () => {
          for (const other of [source, ...variations.slice(0, i)]) expect(playsSameNotes(other.text, v.text), other.label).toBe(false);
        });

        it('keeps its anchors', () => {
          if (lines.length) expect(sameNotes(source.text, v.text, lines)).toBe(true);
          const at = (text: string) => keys(notesOf(text, v.line).filter((n) => anchored.includes(n.step)));
          expect(at(v.text)).toEqual(at(source.text));
        });

        it("keeps its source's holes: what it uses, defines and its clock needs", () => {
          expect(holesOf(v.fragment, compileSource)).toEqual(holesOf(source.fragment, compileSource));
        });

        it('changes only the line it names', () => {
          const before = source.text.split('\n').slice(1);
          const after = v.text.split('\n').slice(1);
          expect(after.length).toBe(before.length);
          const changed = after.flatMap((l, k) => (l === before[k] ? [] : [l.split(' ')[0]]));
          expect(changed).toEqual([`&${v.line}`]);
        });

        it(`does what ${v.operator} says`, () => {
          const before = notesOf(source.text, v.line);
          expect(keys(notesOf(v.text, v.line))).toEqual(keys(expected(v, before, lap, anchored)));
        });
      });
  }
});

describe("Vary gives the decision's drum variations (rung 1)", () => {
  const { source, variations: written } = groups[0]!;
  const [workbench, fragment] = [source.text.split('\n').slice(1, source.text.split('\n').indexOf('')).join('\n'), source.fragment];
  const all = variations(fragment, { workbench });

  it('its anchors are the kick’s line and the backbeat’s, as the decision says', () => {
    expect(anchorsOf(fragment, workbench).map((a) => a.line.slice(1))).toEqual(SOURCES[0]!.lines);
  });

  it('17 of them: 1 rotation, 4 drops, 12 adds', () => {
    expect(['rotate', 'drop', 'add'].map((rule) => all.filter((v) => v.rule === rule).length)).toEqual([1, 4, 12]);
  });

  for (const v of written)
    it(`${v.label}: the one Vary gives by that name, word for word`, () => {
      const found = all.filter((x) => x.by === v.label.replace('# by: ', ''));
      expect(found).toHaveLength(1);
      expect(found[0]!.apply(fragment)).toBe(v.fragment);
    });
});
