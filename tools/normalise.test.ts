import { describe, expect, it } from 'vitest';
import { KEPT } from '../src/engine/normalise/kept';
import { readdirSync, readFileSync } from 'node:fs';
import { normaliseFile } from './normalise';

const PIECE = `&bar from meter 120bpm
&tune over=scale(major) step=4n 0 2 4 2
&lead s=saw loop=C4 cutoff=800
&mix [&tune * &lead]
`;

describe('npm run normalise: files in the canonical spelling (#28)', () => {
  it('a .cells file whole, a Markdown file in its cells block, the rest byte for byte', () => {
    expect(normaliseFile('x.cells', PIECE).text).toBe(PIECE.replace('cutoff=', 'lpf='));
    const file = `---\ntitle: A\n---\n\n\`\`\`cells\n${PIECE}\`\`\`\n\nWhy cutoff=800 is here.\n`;
    const { text, steps } = normaliseFile('x.md', file);
    expect(text).toBe(file.replace('loop=C4 cutoff=', 'loop=C4 lpf='));
    expect(steps).toHaveLength(1);
  });

  it('a fragment of the library is normalised against the others, never as a use of itself (#196)', () => {
    const vibrato = readFileSync('fragments/expression/01-vibrato.md', 'utf8');
    expect(normaliseFile('fragments/expression/01-vibrato.md', vibrato)).toEqual({ text: vibrato, steps: [] });
  });

  it('--blocks: each cells block of a page a piece of its own; --rules: only those rules (#196)', () => {
    const block = (text: string) => `\`\`\`cells\n${text}\`\`\``;
    const page = `# A page\n\n${block('&bar scan(1 1 1 1) step=96bpm\n&lead s=saw loop=C4 cutoff=800\n&mix [&lead]\n')}\n\nBetween.\n\n${block('&tune step=4n 0 2\n&v s=sine loop=C4\n&mix [&tune * &v]\n')}\n`;
    const { text, steps } = normaliseFile('page.md', page, { blocks: true, rules: new Set(['meter', 'tempo']) });
    expect(text).toBe(page.replace('&bar scan(1 1 1 1) step=96bpm', '&bar meter("4/4") step=&tempo\n&tempo step=96bpm'));
    expect(steps).toHaveLength(2);
    expect(normaliseFile('page.md', page, { blocks: true }).text).toContain('lpf=800');
  });

  it('every example file is normal', () => {
    for (const f of readdirSync('examples').filter((x) => x.endsWith('.md'))) {
      const text = readFileSync(`examples/${f}`, 'utf8');
      // (an example whose point is the form a rule would rewrite is kept as written: src/engine/normalise/kept.ts)
      const kept = KEPT[f.replace(/\.md$/, '')];
      expect([f, normaliseFile(f, text).steps.filter((s) => !kept?.test(s))]).toEqual([f, []]);
    }
  });
});

describe('a negative gain is phase inversion (#193)', () => {
  it('Normalise keeps its sign: a piece with gain=-1 and * -.5 is normal as written', () => {
    const text = `${PIECE}&inv s=saw loop=C4 gain=-1\n&out map=sample postgain=-.5 [&tune * &inv * -.5]\n`;
    expect(normaliseFile('x.cells', text).text).toBe(text.replace('cutoff=', 'lpf='));
  });
});
