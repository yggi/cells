// A variation's reference (#293): over the 14 seed rhythms and the 5 bass lines (each on both of the bass seeds'
// workbenches), every reference Vary gives plays the same notes as its variation (S2) when a text reads it where it read
// the line, and is no longer than the line written out by the folder's `bare`; the counts, by operator, are named here.
// A text that uses a fragment and writes one of its variations by its reference is recognised as that path, with no search.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { bare } from '../fold/score';
import { playsSameNotes } from '../sameness';
import { BASS_FRAGMENTS } from '../../repository/bass';
import { unionOf } from '../../repository/fit';
import { heard } from '../../repository/heard';
import { INSTRUMENT_FRAGMENTS } from '../../repository/instruments';
import { resolveSeed } from '../../repository/library';
import { expand } from '../use';
import { createRecogniser } from '../../repository/recognise';
import { MOTIF_FRAGMENTS } from '../../repository/motifs';
import { RHYTHM_FRAGMENTS } from '../../repository/rhythms';
import { declWords } from '../edit';
import { PITCHED_OPERATORS, variations, type Variation, type VaryOptions } from '.';

const KIT = { resolve: resolveSeed };
/** Jambot's reading of a drum bar (`rhythm.test.ts`), with 13 of the General MIDI kit's voices to strike. */
const DRUMS = `&bar meter("4/4") step=120bpm\n${expand('use &bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit', resolveSeed).trim()}`;
const DRUM_OPTIONS: VaryOptions = { workbench: DRUMS, keep: ['&fill'], fewest: 3 };
/** The bass seeds' workbenches (`pitched.test.ts`): 4/4 at 120 bpm in C major, one chord a bar, over two progressions. */
const HOST = `&bar meter("4/4") step=120bpm\n&key scale(major, C)\n${INSTRUMENT_FRAGMENTS.find((f) => f.id === 'bass')!.text}`;
const HARMS = ['&harm over=&key step=1m [0,2,4] [5,7,9] [3,5,7] [4,6,8]', '&harm over=&key step=1m [1,3,5,7] [4,6,8,10] [0,2,4,6]'];

/** Every seed on its workbench: its text, the workbench with the card that hears it (#291), Vary's options, and how long to compare. */
const CASES = [
  ...RHYTHM_FRAGMENTS.map((f) => ({ id: f.id, fragment: f.text, bench: `${DRUMS}\n${heard(f.text)}`, options: DRUM_OPTIONS, seconds: 8 })),
  ...HARMS.flatMap((harm) =>
    BASS_FRAGMENTS.map((f) => {
      const workbench = `${HOST}\n${harm}`;
      return { id: `${f.id}, ${harm.split(' ')[3]}`, fragment: f.text, bench: `${workbench}\n${heard(f.text)}`, options: { workbench, operators: PITCHED_OPERATORS }, seconds: 16 };
    }),
  ),
];

/** The text read with the reference where the line was: the entry that read the line reads a cell that plays it. */
const referred = (text: string, v: Variation) => `${text.replace(new RegExp(`(\\[|, )${v.line}(?=[,\\] *])`), '$1&referred')}\n${v.reference!.line('referred')}`;

const ALL = CASES.flatMap((c) => variations(c.fragment, c.options).map((v) => ({ ...c, v })));
const WITH = ALL.filter(({ v }) => v.reference);
const byOperator = (list: typeof ALL) => Object.fromEntries([...new Set(ALL.map(({ v }) => v.rule))].map((op) => [op, list.filter(({ v }) => v.rule === op).length]));

describe("the seeds' variations by reference", () => {
  it('gives 490 of the 559 a reference: every operator has a form, but on a Euclid, a last run, or where the line written out is shorter', () => {
    expect(ALL.length).toBe(559);
    expect(WITH.length).toBe(490);
    expect(byOperator(ALL)).toEqual({ rotate: 27, drop: 114, add: 312, transpose: 56, reverse: 6, bend: 34, trim: 8, invert: 2 });
    expect(byOperator(WITH)).toEqual({ rotate: 17, drop: 90, add: 279, transpose: 56, reverse: 4, bend: 34, trim: 8, invert: 2 });
    // (the four operators with a form before #293: 79 of their 91)
    expect(['rotate', 'transpose', 'invert', 'reverse'].reduce((n, op) => n + byOperator(WITH)[op]!, 0)).toBe(79);
  });

  it.each(WITH.map((c) => [`${c.id}: ${c.v.by}`, c] as const))('%s plays the notes of its reference (S2)', (_, { fragment, bench, v, seconds }) => {
    const varied = unionOf(v.apply(fragment), bench).text;
    const reference = referred(unionOf(fragment, bench).text, v);
    expect(compileSource(reference, undefined, KIT).diagnostics.map((d) => d.message)).toEqual([]);
    expect(playsSameNotes(varied, reference, seconds, KIT)).toBe(true);
  });

  it('each is no longer than its line written out by `bare`, and all but 2 shorter', () => {
    const sizes = WITH.map(({ fragment, v }) => {
      const written = declWords(v.apply(fragment), v.line.slice(1))!;
      return [bare(v.reference!.line(v.line.slice(1))), bare([...written.head, ...written.attrs, ...written.braid].join(' '))] as const;
    });
    expect(sizes.filter(([ref, line]) => ref > line)).toEqual([]);
    expect(sizes.filter(([ref, line]) => ref < line).length).toBe(488);
  });

  it('writes each operator in a form the language has', () => {
    const forms = (id: string, options: VaryOptions = DRUM_OPTIONS) =>
      Object.fromEntries(
        variations(RHYTHM_FRAGMENTS.find((f) => f.id === id)?.text ?? BASS_FRAGMENTS.find((f) => f.id === id)!.text, options).map((v) => [v.by, v.reference?.form ?? null]),
      );
    const swing = forms('Electro swing drums');
    expect(swing['rotate &hats']).toBe('&hats[<<]');
    expect(swing['drop &hats 3']).toBe('base=&hats =!3 ~');
    expect(swing['add &hats 0']).toBe('base=&hats &oh:0:.4');
    // (the claves end on a run, `~!7`, that a turn by one step would split: no reference)
    expect(forms('son clave 3-2')['rotate &clave']).toBeNull();
    expect(forms('son clave 3-2')['drop &clave 6']).toBe('base=&clave =!6 ~');
    // (a Euclid of one token, with its cell of levels: none)
    expect(forms('Funk drums')['rotate &euclid']).toBeNull();
    const bass = { workbench: `${HOST}\n${HARMS[0]!}`, operators: PITCHED_OPERATORS };
    expect(forms('pumping bass', bass)['transpose &bassline -1']).toBe('&bassline^-1');
    expect(forms('pumping bass', bass)['reverse &bassline']).toBe('&bassline[::-1]');
    // (the root on the downbeat is anchored: the copy moved, the root written as it is)
    expect(forms('walking bass', bass)['transpose &bassline 2']).toBe('base=&bassline^2 0');
    expect(forms('walking bass', bass)['invert &bassline']).toBe('inverse(&bassline)');
    expect(forms('funk bass', bass)['reverse &bassline']).toBe('&bassline[0] &bassline[:0:-1]');
    expect(forms('funk bass', bass)['bend &bassline 1']).toBe('base=&bassline =!14 &bassNext^1');
    expect(forms('funk bass', bass)['trim &bassline 14']).toBe('base=&bassline =!14 ~');
  });
});

describe('recognition reads a reference as its path (#293, decision 055)', () => {
  const library = RHYTHM_FRAGMENTS;
  const uses = 'use &kick, &clap, &hats, &ticks from "Electro swing drums"';

  it('a line that is a reference: the fragment, by that one operator, at distance 0', () => {
    for (const [line, by] of [
      ['&hats2 base=&hats =!3 ~', 'drop &hats 3'],
      ['&drumlines [&kick, &clap, &hats[<<], &ticks]', 'rotate &hats'],
      ['&late base=&clap &cp:0:.6', 'add &clap 0'],
    ] as const) {
      const found = createRecogniser().recognise(`${uses}\n${line}`, library, DRUM_OPTIONS);
      expect(found.map((r) => [r.fragment.id, r.path.map((p) => p.by), r.distance])).toEqual([['Electro swing drums', [by], 0]]);
    }
  });

  it("a motif moved: Electro swing's gypsy two degrees down, as a line of its own, is its transposition", () => {
    const workbench = '&bar meter("4/4") step=124bpm\n&key scale(harmonic, D)';
    const found = createRecogniser().recognise('use &gypsy\n&late step=8n &gypsy^-2', MOTIF_FRAGMENTS, { workbench });
    expect(found.map((r) => [r.fragment.id, r.path.map((p) => p.by), r.distance])).toEqual([['gypsy', ['transpose &gypsy -2'], 0]]);
  });

  it('none where the text takes no such line from it, or writes no reference: then it searches, as before', () => {
    const r = createRecogniser();
    expect(r.recognise('use &kick from "Electro swing drums"\n&hats2 base=&hats =!3 ~', library, DRUM_OPTIONS)).toEqual([]);
    const plain = `${uses}\n&drumlines [&kick, &clap, &hats, &ticks]`;
    expect(r.recognise(plain, library, DRUM_OPTIONS).filter((x) => x.path.length)).toEqual([]);
  });
});
