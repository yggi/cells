import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { normaliseFile } from './normalise';

const PIECE = `&bar scan(1 1 1 1) step=120bpm
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

  it('every example file is normal', () => {
    for (const f of readdirSync('examples').filter((x) => x.endsWith('.md'))) {
      const text = readFileSync(`examples/${f}`, 'utf8');
      expect([f, normaliseFile(f, text).steps]).toEqual([f, []]);
    }
  });
});
