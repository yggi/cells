// tools/open-fragments.ts: each way of filling an open fragment (#22) on the three cases, against the text written whole;
// what each does unfilled; what a fragment leaves open; and that the comparison fails when the fill is not the whole's.
import { describe, expect, it } from 'vitest';
import {
  FILLS_1,
  FUNK_BASS,
  FUNK_DRUMS,
  POP_78_COMP,
  POP_78_WHOLE,
  SECONDS,
  byDeclaration,
  byEnv,
  byImport,
  byTaps,
  compare,
  downbeats,
  layered,
  measure,
  namespaced,
  openNames,
  report,
  unfilled,
} from './open-fragments';
import { compileSource } from '../src/engine/compile';

const rows = measure();

describe('the three cases, filled, play what the text written whole plays', () => {
  it('measures every case under every option: 6 fills, 5 options', () => {
    expect(rows).toHaveLength(30);
    expect(new Set(rows.map((r) => r.case))).toEqual(new Set(['1 drums', '2 bass', '3 shared']));
  });
  it.each(['taps', 'env', 'declared', 'imported, voices kept'])('%s: every fill equal, with no error', (option) => {
    const mine = rows.filter((r) => r.option === option);
    expect(mine.map((r) => [r.case, r.fill, r.equal, r.errors])).toEqual(mine.map((r) => [r.case, r.fill, true, []]));
    expect(mine.every((r) => r.notes > 0 && r.notes === r.whole)).toBe(true);
  });
  it('imported with every cell renamed: the drums lose the note MIDI out reads off their names, the bass does not', () => {
    const mine = rows.filter((r) => r.option === 'imported');
    expect(mine.filter((r) => r.equal).map((r) => r.case)).toEqual(['2 bass', '2 bass']);
    // (E33's bar: 78 drum hits of its 137 notes)
    expect(mine.find((r) => r.case === '3 shared')).toMatchObject({ notes: 137, whole: 137, differing: 78, errors: [] });
  });
  it('7/8 plays more notes than 4/4 in the same seconds, and both 7/8s the same count', () => {
    const counts = rows.filter((r) => r.case === '1 drums' && r.option === 'taps').map((r) => r.notes);
    expect(counts).toEqual([152, 185, 185]);
  });
});

describe('two drum fragments layered over one &bar', () => {
  const by = Object.fromEntries(layered().map((r) => [r.option, r]));
  it('collide wherever the fragments are joined as they are: 8 names given twice', () => {
    for (const option of ['taps', 'env', 'declared']) {
      expect(by[option]!.errors).toHaveLength(8);
      expect(by[option]!.errors.every((e) => / is already defined on line \d+$/.test(e))).toBe(true);
    }
  });
  it('play as written whole when imported with their voices kept, and lose the drum notes when every cell is renamed', () => {
    expect(by['imported, voices kept']).toMatchObject({ equal: true, notes: 208 });
    expect(by['imported']).toMatchObject({ equal: false, notes: 208, differing: 208, errors: [] });
  });
});

describe('unfilled', () => {
  const by = Object.fromEntries(unfilled().map((u) => [u.option, u]));
  it("is an error in every option without a default: the compiler's own two, the main meter and the unknown &key", () => {
    for (const option of ['taps', 'env', 'imported', 'declared']) {
      expect(by[option]!.plays).toBe(false);
      expect(by[option]!.errors).toContain('Unknown cell &key');
      expect(by[option]!.errors.some((e) => e.includes("taps the piece's main meter, and it has none"))).toBe(true);
    }
    expect(by['declared']!.errors).toContain('&key is left to the host, and the host gave none');
  });
  it('plays the defaults a declaration states', () => {
    expect(by['declared, with defaults']).toEqual({ option: 'declared, with defaults', errors: [], plays: true });
  });
});

describe('the comparison fails when the fill is not what the whole text holds (the law of meaningful tests)', () => {
  it('a 4/4 fill against the text written whole in 7/8', () => {
    const r = compare(byTaps([FUNK_DRUMS], FILLS_1[0]!.bar), `${FILLS_1[1]!.bar}\n${FUNK_DRUMS}`, SECONDS);
    expect(r.equal).toBe(false);
    expect(r.errors).toEqual([]);
  });
  it('another key, under each option', () => {
    const host = `${FILLS_1[0]!.bar}\n&key scale(dorian, D)`;
    const whole = `${FILLS_1[0]!.bar}\n&key scale(aeolian, A)\n${FUNK_BASS}`;
    expect(compare(byTaps([FUNK_BASS], host), whole, SECONDS).equal).toBe(false);
    expect(compare(byEnv([FUNK_BASS], host), whole, SECONDS).equal).toBe(false);
    expect(compare(byDeclaration([`&key host\n${FUNK_BASS}`], host), whole, SECONDS).equal).toBe(false);
    expect(compare(byImport(`${host}\n&bassOut use="funk bass"`, true), whole, SECONDS).equal).toBe(false);
  });
  it('a fragment that declares the open cell itself shadows the host under env, and says so', () => {
    const r = byEnv([`${FILLS_1[0]!.bar}\n${FUNK_DRUMS}`], FILLS_1[1]!.bar);
    expect(r.problems).toEqual(["&bar is the fragment's own: the host's is not read"]);
  });
  it('an import of an id the library lacks, or of a fragment with two outputs', () => {
    expect(byImport('&x use="nothing"').problems).toEqual(['no fragment "nothing" in the library']);
    expect(namespaced('&a s=white\n&b s=white', 'x')).toBeNull();
  });
});

describe('what a fragment leaves open', () => {
  it('the main meter when it taps, and each cell it names without declaring', () => {
    expect(openNames(FUNK_DRUMS)).toEqual(['(the main meter)']);
    expect(openNames(FUNK_BASS)).toEqual(['(the main meter)', '&key']);
    // (its pad fails on &key first, and the compiler says nothing of the meter: the parse does)
    expect(openNames(POP_78_COMP)).toEqual(['(the main meter)', '&key']);
    expect(openNames(POP_78_WHOLE)).toEqual([]);
  });
});

describe("a fragment in 16 sixteenths doesn't re-lay itself in 7/8: its lines walk across the bar line", () => {
  it('the kick strikes every downbeat of 4/4 and 4 of 14 in 7/8 (16 against 14)', () => {
    expect(downbeats(compileSource(`${FILLS_1[0]!.bar}\n${FUNK_DRUMS}`), 'bd', 14)).toBe(1);
    expect(downbeats(compileSource(`${FILLS_1[1]!.bar}\n${FUNK_DRUMS}`), 'bd', 14)).toBeCloseTo(4 / 14, 12);
  });
});

it('reports the tables', () => {
  const text = report();
  expect(text).toContain('| case | fill | (t) taps | (a) env | (b) declared | (c) imported | (c) imported, voices kept |');
  expect(text).toContain('| 3 layered | 4/4 | 8 errors | 8 errors | 8 errors | differs: 208 of 208 notes | equal, 208 notes |');
  expect(text).toContain('| unfilled | errors | plays |');
});
