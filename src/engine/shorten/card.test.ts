import { describe, expect, it } from 'vitest';
import { shorten, shortenAll } from './index';
import { movedCard } from './card';
import { compileSource } from '../compile';
import { readPiece } from '../piecefile';
import { PRESETS } from '../presets';

// Decision 047 (#146): a card that says what the piece is (title= tags= tier=) is written the old way; the compiler
// says where they go, and Shorten's migration writes the piece as a file, those in its frontmatter, the rest byte for byte.
const OLD = `# Frère Jacques, in a round
&piece title="A round" tags="tutorial, canon" tier=2 label="Three voices, one tune." about=&out
&tune step=4 0 2 4 0
&v s=sine loop=C4
&out map=sample [&tune * &v]`;

const migration = (src: string) => shorten(src).find((s) => s.kind === 'card');
const warnings = (src: string) => compileSource(src).diagnostics.map((d) => d.message);

describe('a card written the old way (decision 047)', () => {
  it('compiles, with a warning on the card that says where its title, tags and tier go', () => {
    expect(compileSource(OLD).ok).toBe(true);
    expect(compileSource(OLD).diagnostics).toEqual([
      {
        severity: 'warning',
        message: 'title=, tags= and tier= on the piece’s card go in its file’s frontmatter now (title: tags: tier:): Shorten moves them there (decision 047)',
        span: { line: 2, col: 8, len: 15 },
      },
    ]);
    expect(warnings('&piece title="A round" label="x"\n&a loop=A4')).toEqual([
      'title= on the piece’s card goes in its file’s frontmatter now (title:): Shorten moves it there (decision 047)',
    ]);
  });

  it('warns on the card only: a cell’s own tags= are its clusters, and a text without a title has no card', () => {
    expect(warnings('&piece label="x" about=&a\n&a tags="low" loop=A4')).toEqual([]);
    expect(warnings('&piece tags="a, b" label="x"\n&a loop=A4')).toEqual([]);
    // (a title= on a cell that plays is no card: it does nothing, and says so)
    expect(warnings('&a title="x" loop=A4')).toEqual(['title= acts on a note (a label= and nothing else): on &a it does nothing']);
  });

  it('is migrated to a file: the frontmatter says them, the text keeps every other byte', () => {
    const s = migration(OLD)!;
    expect([s.before, s.after]).toEqual([
      '&piece title="A round" tags="tutorial, canon" tier=2 label="Three voices, one tune." about=&out',
      '&piece label="Three voices, one tune." about=&out',
    ]);
    const file = s.apply(OLD);
    expect(file).toBe(
      ['---', 'title: A round', 'tags: [tutorial, canon]', 'tier: 2', '---', '', '```cells', OLD.replace(' title="A round" tags="tutorial, canon" tier=2', ''), '```', ''].join(
        '\n',
      ),
    );
    const read = readPiece(file);
    expect('problems' in read ? read.problems : compileSource(read.text).diagnostics).toEqual([]);
  });

  it('moves what the card says, and only that: a title alone, quotes and colons in it', () => {
    expect(movedCard('&piece title="Acid: a 303" label="x"\n&a loop=A4')).toEqual({ frontmatter: { title: 'Acid: a 303' }, text: '&piece label="x"\n&a loop=A4' });
    // (a card that said nothing else goes; a comment on it stays)
    expect(movedCard('&piece title="x"\n&a loop=A4')?.text).toBe('&a loop=A4');
    expect(movedCard('&piece title="x"   # the card\n&a loop=A4')?.text).toBe('# the card\n&a loop=A4');
  });

  it('is offered for no text whose card says nothing, nor for a file, and shortenAll never takes it', () => {
    expect(migration('&piece label="x" about=&a\n&a loop=A4')).toBeUndefined();
    expect(movedCard(PRESETS.steps.file)).toBeNull();
    expect(movedCard(PRESETS.steps.source)).toBeNull();
    expect(shortenAll(OLD).source).toBe(OLD);
  });

  it('is offered for no example: every one is a file', () => {
    for (const [key, { source }] of Object.entries(PRESETS)) expect(migration(source), key).toBeUndefined();
  });
});
