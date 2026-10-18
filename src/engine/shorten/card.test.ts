import { describe, expect, it } from 'vitest';
import { shorten, shortenAll } from './index';
import { movedCard } from './card';
import { compileSource } from '../compile';
import { readPiece } from '../piecefile';
import { PRESETS } from '../presets';

// Decision 047 (#146): a card that says what the piece is (title= tags= tier=) is written the old way; the compiler
// says where they go, and Shorten's migration writes the piece as a file, those in its frontmatter, the rest byte for byte.
// Since #196 the card's label goes too, as the file's description, and with it the card.
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

  it('is migrated to a file: the frontmatter says them and the description, the card goes, the text keeps every other byte', () => {
    const s = migration(OLD)!;
    expect([s.before, s.after]).toEqual(['&piece title="A round" tags="tutorial, canon" tier=2 label="Three voices, one tune." about=&out', '']);
    const file = s.apply(OLD);
    expect(file).toBe(
      [
        '---',
        'title: A round',
        'tags: [tutorial, canon]',
        'tier: 2',
        'description: Three voices, one tune.',
        '---',
        '',
        '```cells',
        OLD.split('\n')
          .filter((l) => !l.startsWith('&piece'))
          .join('\n'),
        '```',
        '',
      ].join('\n'),
    );
    const read = readPiece(file);
    expect('problems' in read ? read.problems : compileSource(read.text).diagnostics).toEqual([]);
  });

  it('moves what the card says, and only that: a title alone, quotes and colons in it, the label as plain text', () => {
    expect(movedCard('&piece title="Acid: a 303" label="x"\n&a loop=A4')).toEqual({ frontmatter: { title: 'Acid: a 303', description: 'x' }, text: '&a loop=A4' });
    expect(movedCard('&piece title="x" label="A **303**, *slowly*." about=(&a &b)\n&a loop=A4')?.frontmatter.description).toBe('A 303, slowly.');
    // (the card goes; a comment on it stays)
    expect(movedCard('&piece title="x"\n&a loop=A4')?.text).toBe('&a loop=A4');
    expect(movedCard('&piece title="x"   # the card\n&a loop=A4')?.text).toBe('# the card\n&a loop=A4');
    // (a card that says more than that is a note the graph draws: it keeps its label and its links)
    expect(movedCard('&piece title="x" label="y" show=do about=&a\n&a loop=A4')).toEqual({ frontmatter: { title: 'x' }, text: '&piece label="y" show=do about=&a\n&a loop=A4' });
  });

  it('moves a card with no title too: the note &piece, its label the description (a file written before #196)', () => {
    expect(movedCard('# a round\n&piece label="Three voices." about=&a\n&a loop=A4')).toEqual({ frontmatter: { description: 'Three voices.' }, text: '# a round\n&a loop=A4' });
    expect(migration('&piece label="x" about=&a\n&a loop=A4')?.apply('&piece label="x" about=&a\n&a loop=A4')).toBe('---\ndescription: x\n---\n\n```cells\n&a loop=A4\n```\n');
    // (any other note is a note, not the card; and a card that says more, with no title, is left as it is)
    expect(movedCard('&hint label="x" about=&a\n&a loop=A4')).toBeNull();
    expect(movedCard('&piece label="x" show=do\n&a loop=A4')).toBeNull();
  });

  it('is offered for no text with no card, nor for a file, and shortenAll never takes it', () => {
    expect(migration('&hint label="x" about=&a\n&a loop=A4')).toBeUndefined();
    expect(movedCard(PRESETS.steps.file)).toBeNull();
    expect(movedCard(PRESETS.steps.source)).toBeNull();
    expect(shortenAll(OLD).source).toBe(OLD);
  });

  it('is offered for no example: every one is a file', () => {
    for (const [key, { source }] of Object.entries(PRESETS)) expect(migration(source), key).toBeUndefined();
  });
});
