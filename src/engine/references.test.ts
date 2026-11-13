// A text's references (#638): each `from` line that takes from a fragment, read as the parser reads it, with its id's span.
import { describe, expect, it } from 'vitest';
import { splitComment } from './edit';
import { EXAMPLES } from './examples';
import { readFrom } from './parser/use';
import { fromLine, references } from './references';
import { SEED } from '../repository/seed';

describe('references', () => {
  it('reads each kind of from line, with the span of its id', () => {
    const text = ['&bar from meter(swing=&swing) &tempo', '  &bd, &sd from gm_kit', '* from band', '&riff from "my riff" &key', '&key from diatonic(mode=ionian) C'].join('\n');
    const refs = references(text);
    expect(refs.map((r) => r.id)).toEqual(['meter', 'gm_kit', 'band', 'my riff', 'diatonic']);
    expect(refs[0]).toMatchObject({ names: ['&bar'], args: [{ name: 'swing', value: '&swing' }], main: '&tempo', span: { line: 1, col: 11, len: 5 } });
    expect(refs[1]).toMatchObject({ names: ['&bd', '&sd'], args: null, main: null, span: { line: 2, col: 17, len: 6 } });
    expect(refs[2]).toMatchObject({ names: null, span: { line: 3, col: 8, len: 4 } });
    expect(refs[3]!.span).toEqual({ line: 4, col: 12, len: 9 });
    const lines = text.split('\n');
    for (const r of refs) expect(lines[r.span.line - 1]!.slice(r.span.col - 1, r.span.col - 1 + r.span.len).replace(/"/g, '')).toBe(r.id);
  });

  it('leaves out a signature, a comment and a label that says from', () => {
    const text = ['&twinkle from &key', '# &x from gm_kit', '&note label="taken from the library"', '&bar from meter &tempo # from here'].join('\n');
    expect(references(text).map((r) => r.id)).toEqual(['meter']);
  });

  it("agrees with the parser on every line of every example and seed file, each id's span the id", () => {
    const texts = [...Object.values(EXAMPLES).map((e) => e.source), ...SEED.map((f) => f.fragment.text)];
    let n = 0;
    for (const text of texts) {
      const lines = text.split('\n');
      const parsed = lines.flatMap((l, i) => {
        const f = readFrom(splitComment(l)[0].trim());
        return f && f.kind === 'use' ? [{ id: f.id, line: i + 1 }] : [];
      });
      const refs = references(text);
      expect(refs.map((r) => ({ id: r.id, line: r.span.line }))).toEqual(parsed);
      for (const r of refs) expect(lines[r.span.line - 1]!.slice(r.span.col - 1, r.span.col - 1 + r.span.len).replace(/^"|"$/g, '')).toBe(r.id);
      n += refs.length;
    }
    expect(texts).toHaveLength(Object.keys(EXAMPLES).length + SEED.length);
    expect(n).toBeGreaterThan(150);
  });

  it('reads the names a line renames and the head it writes', () => {
    const [r] = references('&kick=bd, &sd label="snare" off from gm_kit');
    expect(r).toMatchObject({ names: ['&kick', '&sd'], takes: ['&bd', '&sd'], head: ['label="snare"', 'off'] });
  });
});

describe('fromLine', () => {
  it('writes each part of a from line: renamed names, the head, a quoted id, named arguments and the main one', () => {
    expect(fromLine({ names: ['&bassline'], id: 'funk_bass', main: '&harm' })).toBe('&bassline from funk_bass &harm');
    expect(fromLine({ names: null, id: 'band', args: [{ name: 'style', value: '&style' }] })).toBe('* from band(style=&style)');
    expect(fromLine({ names: ['&bar'], id: 'meter', args: [{ name: 'grouping', value: 'meter("7/8")' }], main: '104bpm' })).toBe('&bar from meter(grouping=meter("7/8")) 104bpm');
    expect(fromLine({ names: ['&kick', '&sd'], takes: ['&bd', '&sd'], head: ['off'], id: 'gm_kit' })).toBe('&kick=bd, &sd off from gm_kit');
    expect(fromLine({ names: ['&drumlines'], id: 'funk_drums~2' })).toBe('&drumlines from "funk_drums~2"');
    expect(fromLine({ names: ['&tw'], takes: ['&wonder'], id: 'kinderlied', main: '&key' })).toBe('&tw=wonder from kinderlied &key');
  });

  it('is read back as it was written: every from line of every example and seed file, its span aside', () => {
    const texts = [...Object.values(EXAMPLES).map((e) => e.source), ...SEED.map((f) => f.fragment.text)];
    const bare = ({ span: _span, ...rest }: ReturnType<typeof references>[number]) => rest;
    let n = 0;
    for (const text of texts)
      for (const r of references(text)) {
        const written = fromLine(r);
        expect(references(written).map(bare), written).toEqual([bare(r)]);
        n++;
      }
    expect(n).toBeGreaterThan(150);
  });
});
