// A given cell taken into the piece (#639, C2 of yggi/cell-studio#621), and where each given cell came from (`origins`):
// cell-studio#610's cases, each playing the same events after the edit, over 3 s.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { setAttr } from './edit';
import { EXAMPLES } from './examples';
import { readFrom } from './parser/use';
import { soundsIdentical } from './sameness';
import { takeIn } from './takein';
import { resolveSeed } from '../repository/library';

const O = { resolve: resolveSeed };
const plays = (a: string, b: string) => soundsIdentical(a, b, 3, O);
const written = (r: ReturnType<typeof takeIn>) => {
  if ('why' in r) throw new Error(r.why);
  return r.text;
};

describe('takeIn', () => {
  it("leaves a one-head from line as it is: an edit writes the head's attribute before from (cell-studio#610's clock)", () => {
    const src = EXAMPLES.clock.source;
    expect(written(takeIn(src, 'bar', O))).toBe(src);
    expect(plays(src, setAttr(src, 'bar', 'show', 'mix'))).toBe(true);
  });

  it("writes a head * takes from a template into the piece, and the piece plays the same, an edit through it too (radio's band)", () => {
    const src = EXAMPLES.radio.source;
    const text = written(takeIn(src, 'drumsOut', O));
    expect(text).not.toBe(src);
    expect(text).toMatch(/^&drumsOut /m);
    expect(plays(src, text)).toBe(true);
    expect(plays(src, setAttr(text, 'drumsOut', 'show', 'mix'))).toBe(true);
  });

  it("writes a collection's cell into the piece, and the line that named it stops asking for it", () => {
    const kit = '&bar meter("4/4") step=120bpm\n&bd, &sd from gm_kit\n&g step=8n &bd ~ &sd ~\n&out map=sample [&g]';
    const text = written(takeIn(kit, 'bd', O));
    expect(text.split('\n')).toContain('&sd from gm_kit');
    expect(text).toMatch(/^&bd note=36 /m);
    expect(plays(kit, text)).toBe(true);
    const all = '&bar meter("4/4") step=120bpm\n* from gm_kit\n&g step=8n &bd ~ &hh ~\n&out map=sample [&g]';
    const hh = written(takeIn(all, 'hh', O));
    expect(hh.split('\n')).toContain('* from gm_kit');
    expect(plays(all, hh)).toBe(true);
  });

  it('says why for a head among several on one line, and for a cell a copy keeps to itself', () => {
    expect(takeIn(EXAMPLES.electroswing.source, 'drumsOut', O)).toEqual({ why: expect.stringMatching(/^&drumsOut is one of &drums, &drumsOut/) });
    expect(takeIn(EXAMPLES.clock.source, 'bar_grouping', O)).toEqual({ why: expect.stringMatching(/copy's own/) });
    expect(takeIn('&a 0 2', 'b', O)).toEqual({ why: expect.stringMatching(/not a cell this piece is given/) });
  });
});

describe('where a given cell came from (origins)', () => {
  it("chains Electroswing's &hh through drums_performer to the kit's line", () => {
    const r = compileSource(EXAMPLES.electroswing.source, undefined, O);
    expect(r.origins?.get('hh')).toEqual([
      { id: null, line: 1 },
      { id: 'drums_performer', line: expect.any(Number) },
      { id: 'gm_kit', line: expect.any(Number) },
    ]);
    const last = r.origins!.get('hh')!.at(-1)!;
    expect(resolveSeed(last.id!)!.split('\n')[last.line - 1]).toMatch(/^&hh /);
  });

  it("gives every given cell of every example a chain: from one of the piece's from lines to a line of the fragment that defines it", () => {
    let n = 0;
    for (const ex of Object.values(EXAMPLES)) {
      const r = compileSource(ex.source, undefined, O);
      const lines = ex.source.split('\n');
      for (const [name, origin] of r.origins ?? []) {
        expect(origin[0], name).toMatchObject({ id: null });
        expect(readFrom(lines[origin[0]!.line - 1]!.trim().replace(/\s+#.*$/, ''))?.kind, `${name}: ${lines[origin[0]!.line - 1]}`).toBe('use');
        const last = origin.at(-1)!;
        if (last.id === null) continue;
        expect(resolveSeed(last.id)!.split('\n')[last.line - 1], `${name} at ${last.id}:${last.line}`).toMatch(/^\s*&\w/);
        n++;
      }
    }
    // (404 at the commit that built it)
    expect(n).toBeGreaterThanOrEqual(400);
  });
});
