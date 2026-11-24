import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PARAM_ALIASES } from '../attributes';
import { normalise, normalisations } from './index';
import { libraryCells, takenArguments } from './library';
import { FAMILIES } from '../core';
import { rewriteAll, ROUNDS } from '../rewrite';
import { KEPT } from './kept';
import { compileSource } from '../compile';
import { samePiece, soundsIdentical } from '../sameness';
import { shorten } from '../shorten';
import { EXAMPLES } from '../examples';
import { LIBRARY, resolveSeed } from '../../repository/library';
import { fitsAs } from '../../repository/fit';
import { holesOf } from '../../repository/holes';
import type { Resolve } from '../program';
import { bodyOf } from '../use';

/** A fragment's lines on a workbench by hand, its signature aside (`bodyOf`): judged as a collection's are, by its lines (`fitsAs`, read as the fragment `x`, #587). */
const unionOf = (text: string, workbench: string) => {
  const body = bodyOf(text);
  const resolve: Resolve = (id) => (id === 'x' ? body : resolveSeed(id));
  return fitsAs('x', workbench, { resolve }).union!;
};

const BASE = `&bar meter("4/4") step=&tempo
&tempo step=120bpm
&tune over=scale(major) step=4n 0 2 4 2
`;
const piece = (voice: string) => `${BASE}&lead loop=C4 ${voice}\n&mix [&tune * &lead]`;

/** What Normalise keeps (decision 049): every cell, its name, how many steps its braid writes, and what it reads. */
const structure = (src: string) =>
  [...compileSource(src).cells.values()]
    .filter((c) => !c.implicit)
    .map((c) => `${c.name} ${c.units.length} ${c.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : [])).join(',')}`)
    .sort();

describe('Normalise: valid spellings into the canonical one (decision 049, #28)', () => {
  it.each([
    ['s=saw cutoff=800', 's=saw lpf=800', 1],
    ['sound=saw', 's=saw', 1],
    ['s=saw resonance=2 verb=.3', 's=saw lpq=2 room=.3', 2],
    ['s=saw dt=.25 delay=.3', 's=saw delaytime=.25 delay=.3', 1],
    // (ftype='s numbers, superdough's, as its words: decision 074; and bandf= as bpf=)
    ['s=saw lpf=800 ftype=2', 's=saw lpf=800 ftype=24db', 1],
    ['s=saw bandf=900 bandq=3', 's=saw bpf=900 bpq=3', 2],
  ])('an alias as ours, whatever its length: %s → %s', (alias, ours, n) => {
    const { source, steps } = normalise(piece(alias));
    expect(source).toBe(piece(ours));
    expect(steps).toHaveLength(n);
    expect(samePiece(piece(alias), source)).toBe(true);
    expect(structure(source)).toEqual(structure(piece(alias)));
  });

  it('clip= as legato=, its warning gone (#94: clip warns, Normalise rewrites it)', () => {
    const src = `&bar meter("4/4") step=&tempo\n&tempo step=120bpm\n&tune over=scale(major) step=8n clip=.5 0 2 4 2\n&lead s=saw loop=C4\n&mix [&tune * &lead]`;
    expect(compileSource(src).diagnostics.map((d) => d.message)).toEqual([expect.stringMatching(/^clip= is Strudel's name for legato=/)]);
    const { source } = normalise(src);
    expect(source).toBe(src.replace('clip=.5', 'legato=.5'));
    expect(compileSource(source).diagnostics).toEqual([]);
    expect(samePiece(src, source)).toBe(true);
  });

  it('leaves an alias beside its own name (one parameter given twice, which the parser says)', () => {
    expect(normalise(piece('s=saw cutoff=800 lpf=900')).steps).toEqual([]);
  });

  it('is idempotent, and Shorten still offers only the aliases that are shorter', () => {
    const once = normalise(piece('sound=saw dt=.25 delay=.3')).source;
    expect(normalise(once)).toEqual({ source: once, steps: [] });
    expect(shorten(piece('s=saw dt=.25 delay=.3')).some((s) => s.kind === 'alias')).toBe(false);
    expect(shorten(piece('s=saw cutoff=800')).find((s) => s.kind === 'alias')?.after).toBe('lpf=800');
  });

  // law L4
  it('every example, and every fragment of the seed library, is normal already', () => {
    // (an example read as Cell studio reads it, its `use` lines resolved, and the seed library's lines taken by `use`: #196)
    // (but an example whose point is the form a rule would rewrite, kept as written: the examples teach, and a rewrite that
    // sounds the same can still teach less — the owner on #668, 2026-11-09)
    for (const [key, p] of Object.entries(EXAMPLES)) {
      const steps = normalise(p.source, { resolve: resolveSeed, library: LIBRARY }).steps;
      expect([key, steps.filter((s) => !KEPT[key]?.test(s))]).toEqual([key, []]);
    }
    // (a meter is open on its tempo, a mode on its tonic (#290); a rhythm on its meter, a bass line on its meter and its
    // harmony, and a harmony on its meter and its key, so each is read on a 4/4 at a tempo, with a key and, unless it
    // writes its own, a harmony, where it fits; a mode writes its own key)
    const meter = '&bar meter("4/4") step=&tempo\n&tempo step=100bpm';
    const keyed = `${meter}\n&key scale(major, &tonic)\n&tonic C`;
    const bar = `${keyed}\n&harm over=&key step=1m [0,2,4] [3,5,7]`;
    // (a performer's part and its levels, the score's holes (decision 058), and a form's, filled by a line each; its `use` lines resolved)
    const compiled = (t: string) => compileSource(t, undefined, { resolve: resolveSeed });
    const parts = Object.fromEntries([
      ...['bass', 'pad', 'stab', 'lead'].flatMap((n) => [
        [`&${n}line`, `&${n}line over=&harm step=4n 0 2`],
        [`&${n}Level`, `&${n}Level map=amp .8`],
      ]),
      ['&drumlines', '&kick step=4n &bd ~ &bd ~\n&drumlines [&kick]'],
      // (a form's hole, a motif in eighths over the key: #294)
      ['&call', '&call over=&key step=8n 0 2 4@2 2 0 ~ ~'],
      ['&a', '&a over=&key step=8n 0 2 4@2 2 0 ~ ~'],
      // (the band's, the score's style: #391)
      ['&style', '&style style=&(map=style sync=.5 harm=.5 bite=.5 mood=.5)'],
      // (a module's audio in, a filter's or an amp's: an oscillator, decision 067 §3)
      ['&in', '&in s=saw loop=C3'],
      // (a law's day, decision 085)
      ['&day', '&day scan(1!24) loop=1d'],
      // (a section kind's song, its intensity: #810)
      ['&song', '&song .55'],
    ]);
    for (const f of LIBRARY) {
      const holes = holesOf(f.text, compiled, resolveSeed);
      const bench = holes.defines.includes('&bar') ? '&tempo step=100bpm' : holes.defines.includes('&key') ? `${meter}\n&tonic C` : holes.defines.includes('&harm') ? keyed : bar;
      // (a fragment's sound holes, the voices an instrument fills (#244), are filled by the General MIDI kit's and the bass's lines)
      const voices = [...LIBRARY.find((k) => k.id === 'gm_kit')!.text.split('\n'), ...LIBRARY.find((k) => k.id === 'bass')!.text.split('\n')];
      // (a form's hole is read as a splice alone, as a sound is: a part fills it, not a voice)
      const kit = holes.sounds.filter((n) => !parts[n]).map((n) => `\n${voices.find((l) => l.startsWith(`${n} `))!}`);
      const part = holes.uses.filter((n) => parts[n]).map((n) => `\n${parts[n]}`);
      // (a form is a braid of splices, its head no sound until a voice plays it: #294)
      const form = f.association.some((wp) => wp.facet === 'form') ? `\n&formV loop=C4\n&formOut [&${/^&(\w+)/.exec(f.text)![1]} * &formV]` : '';
      const text = `${compiled(f.text).ok ? f.text : unionOf(f.text, bench).text}${kit.join('')}${part.join('')}${form}`;
      expect([f.id, compiled(text).ok, normalise(text).steps]).toEqual([f.id, true, []]);
    }
  });

  it('names the interface where the piece names it unambiguously (#196): its meter &bar, its rate &tempo, its key &key, its tonic &tonic', () => {
    const tune = '&tune over=&scale step=8n 0 2 4 2\n&lead s=saw loop=C4\n&mix [&tune * &lead]';
    const written = `&time scan(1 1 1 1) step=96bpm\n&scale scale(dorian, D)\n${tune}`;
    const { source, steps } = normalise(written);
    expect(source).toBe(`&bar meter("4/4") step=&tempo\n&tempo step=96bpm\n&key scale(dorian, &tonic)\n&tonic D\n${tune.replace('&scale', '&key')}`);
    expect(steps).toHaveLength(5);
    expect(soundsIdentical(written, source)).toBe(true);
    expect(normalise(source)).toEqual({ source, steps: [] });
    // (a slider is the tempo's, and a scan of another meter stays as written)
    expect(normalise(`&bar scan(3 3) step=free(90bpm, 60..120)\n${tune.replace('&scale', 'scale(major)')}`).source).toBe(
      `&bar scan(3 3) step=&tempo\n&tempo step=free(90bpm, 60..120)\n${tune.replace('&scale', 'scale(major)')}`,
    );
  });

  describe('a meter built by hand, as the meter it is (#645)', () => {
    const lines = '&tune over=scale(minor) step=8n 0 2 4 2 3 1 0 ~\n&lead s=saw loop=C4\n&mix [&tune * &lead]';
    it.each([
      ['scan(1 1 1)', 'meter("3/4")'],
      ['scan(4 4 4 4)', 'meter("4/4")'],
      ['scan(1!5)', 'meter("5/4")'],
      ['scan(1 1 1 1 1 1 1)', 'meter("7/4")'],
    ])('even beats as a signature: %s → %s', (scan, sig) => {
      const written = `&bar ${scan} step=&tempo\n&tempo step=100bpm\n${lines}`;
      const { source, steps } = normalise(written);
      expect(source).toBe(written.replace(scan, sig));
      expect(steps).toHaveLength(1);
      expect(soundsIdentical(written, source)).toBe(true);
    });

    it('leaves a scan that isn’t even beats, or isn’t the main meter, as written', () => {
      // (a bent bar, groups, one entry, and a scan of 3s, which may be 6/8's or 3/16's)
      for (const scan of ['scan(27 23 26 24)', 'scan(3 2 2)', 'scan(4)', 'scan(3 3)', 'scan(2 2 2 2)'])
        expect(normalise(`&bar ${scan} step=&tempo\n&tempo step=100bpm\n${lines}`).steps, scan).toEqual([]);
      // (a scale's scan is no meter)
      expect(normalise(`&bar meter("4/4") step=&tempo\n&tempo step=100bpm\n&major scan(2 2 2 2)\n${lines}`).steps).toEqual([]);
    });

    const swung = (clock: string, extra = '') =>
      `&bar meter("4/4") step=&tempo${extra}\n&tempo step=120bpm\n${clock}\n&ride step=&swing:pulse 0 ~ 0 0 0 ~ 0 0  # ding, ding-a\n&tune over=scale(minor) step=&swing:pulse 0 2 4 2\n&lead s=saw loop=C4\n&mix [&tune * &lead, &ride * &lead]`;
    it.each([
      ['&swing scan(2 1) step=8n', '&swing swing=8n:2/3'],
      ['&swing scan(3 1) step=8n', '&swing swing=8n:3/4'],
      ['&swing scan(1.5 1) step=8n', '&swing swing=8n:3/5'],
      ['&swing scan(free(2, 1..3) 1) step=8n', '&swing swing=8n:free(2/3, 1/2..3/4)'],
      ['&swing scan(2 1) step=16n', '&swing swing=16n:2/3'],
    ])('a swing clock as the meter’s swing: %s → %s', (clock, lean) => {
      const written = swung(clock);
      const { source, steps } = normalise(written);
      const tap = /step=(\w+)/.exec(clock)![1]!;
      expect(source).toBe(
        swung(lean, ' swing=&swing')
          // (the comment keeps its column)
          .replace('&ride step=&swing:pulse 0 ~ 0 0 0 ~ 0 0  # ding', `${`&ride step=${tap} 0 ~ 0 0 0 ~ 0 0`.padEnd('&ride step=&swing:pulse 0 ~ 0 0 0 ~ 0 0  '.length)}# ding`)
          .replace('step=&swing:pulse 0 2', `step=${tap} 0 2`),
      );
      expect(steps).toHaveLength(1);
      expect(soundsIdentical(written, source)).toBe(true);
      expect(normalise(source)).toEqual({ source, steps: [] });
    });

    it('keeps a note about the clock pointing at it', () => {
      const written = swung('&swing scan(2 1) step=8n').replace('&tempo step=120bpm', '&tempo step=120bpm\n&swingNote label="The swing." about=&swing');
      const { source, steps } = normalise(written);
      expect(steps).toHaveLength(1);
      expect(source).toContain('&swingNote label="The swing." about=&swing\n&swing swing=8n:2/3');
    });

    it('leaves a clock as written where a line reads it as more than a pulse, the meter swings already, or its pairs are threes', () => {
      // (read as a table, or by its own steps)
      expect(normalise(`${swung('&swing scan(2 1) step=8n')}\n&walk over=&swing step=4n 0 1`).steps).toEqual([]);
      // (a meter with a swing of its own)
      expect(normalise(swung('&swing scan(2 1) step=8n', ' swing=16n:.6')).steps).toEqual([]);
      // (6/8's eighths are threes, which a swing keeps straight (decision 071): the clock's lean isn't the meter's)
      expect(normalise(swung('&swing scan(2 1) step=8n').replace('meter("4/4")', 'meter("6/8")')).steps).toEqual([]);
      // (no line taps it)
      expect(normalise(`&bar meter("4/4") step=&tempo\n&tempo step=120bpm\n&swing scan(2 1) step=8n\n${lines}`).steps).toEqual([]);
    });
  });

  it('names nothing it could name two ways, or that is taken, or that has no value of its own', () => {
    const tune = (over: string) => `&tune over=${over} step=8n 0 2 4 2\n&lead s=saw loop=C4\n&mix [&tune * &lead]`;
    // (two keys: which is the key? A key's scan is no meter)
    const two = `&a scan(1 1 1 1) step=96bpm\n&x scale(major, C)\n&y scale(minor, A)\n${tune('&x')}\n&t2 over=&y step=8n 0 2`;
    expect(normalise(two).steps.filter((t) => /is the piece's key|tonic/.test(t))).toEqual([]);
    // (a name taken by a cell of another job)
    const taken = `&m scan(1 1 1 1) step=96bpm\n&bar s=sine loop=C2\n&tempo s=sine loop=C3\n${tune('scale(major)')}`;
    expect(normalise(taken).steps.filter((t) => /&m is|tempo/.test(t))).toEqual([]);
    // (a rate already a cell, and a key with no tonic of its own (the voice's loop= gives it))
    const open = `&bar meter("4/4") step=&r\n&r step=96bpm\n&key scale(major)\n${tune('&key')}`;
    expect(normalise(open).steps).toEqual([]);
  });

  describe('a template’s line with its parameters filled in, as a from line of it with those arguments (#524)', () => {
    const seed = { resolve: resolveSeed, library: LIBRARY };
    const tune = '&tune over=scale(minor) step=8n 0 2 4 2 3 1 0 ~\n&lead s=saw loop=C4\n&mix [&tune * &lead]';
    const keyed = '&bar meter("4/4") step=&tempo\n&tempo step=100bpm\n&tune over=&key step=8n 0 2 4 2\n&lead s=saw loop=C4\n&mix [&tune * &lead]';
    it.each([
      ['&bar meter("4/4") step=&tempo', '&bar from bar &tempo'],
      ['&bar meter("7/8") step=&tempo', '&bar from bar(meter="7/8") &tempo'],
      // (a swing on the line is no parameter of bar's since decision 103: the line is no template's, and stays)
      ['&bar meter("7/8") step=&tempo swing=8n:2/3', '&bar meter("7/8") step=&tempo swing=8n:2/3'],
      ['&bar meter("4/4 in 2") step=&tempo', '&bar from bar(meter="4/4 in 2") &tempo'],
      // (two arguments are no text bar's meter= takes: the line stays)
      ['&bar meter("2/2", 2) step=&tempo', '&bar meter("2/2", 2) step=&tempo'],
    ])('the meter: %s → %s', (line, use) => {
      const written = `${line}\n&tempo step=100bpm\n${tune}`;
      const { source } = normalise(written, seed);
      expect(source.split('\n')[0]).toBe(use);
      expect(soundsIdentical(written, source, undefined, seed)).toBe(true);
      expect(normalise(source, seed).steps).toEqual([]);
    });

    it.each([
      ['&key scale(minor, &tonic)', '&key from diatonic(mode=minor) &tonic'],
      ['&key scale(dorian, &tonic)', '&key from diatonic(mode=dorian) &tonic'],
      ['&key scale(major, &tonic)', '&key from diatonic &tonic'],
    ])('the key: %s → %s', (line, use) => {
      const written = `${keyed}\n${line}\n&tonic D`;
      const { source } = normalise(written, seed);
      expect(source).toContain(`\n${use}\n`);
      expect(soundsIdentical(written, source, undefined, seed)).toBe(true);
    });

    it('leaves a line with anything the template doesn’t write, or a parameter of another kind, as it is', () => {
      for (const line of [
        '&bar meter("4/4") step=&tempo motor=4 mass=1 friction=.2', // (an attribute the template doesn't write)
        '&bar meter("4/4") step=&tempo label="the bar"',
        '&bar scan(27 23 26 24) step=&tempo', // (a bent bar, decision 080: a grouping is a meter(…), not a scan(…))
      ])
        expect(
          normalise(`${line}\n&tempo step=100bpm\n${tune}`, seed).steps.filter((t) => /"meter"'s/.test(t)),
          line,
        ).toEqual([]);
      // (a key with no tonic of its own: the template's main argument is its tonic)
      expect(normalise(`${keyed}\n&key scale(major)`, seed).steps.filter((t) => /"diatonic"'s/.test(t))).toEqual([]);
    });
  });

  it('writes a line that is a library fragment’s word for word as a from line of it (#196): one a fragment, where its first line was', () => {
    const seed = { resolve: resolveSeed, library: LIBRARY };
    const beat = '&beat step=8n &bd ~ &hh ~ &sd ~ &hh ~\n&out map=sample [&beat]';
    const kit = LIBRARY.find((f) => f.id === 'gm_kit')!.text.split('\n');
    const line = (name: string) => kit.find((l) => l.startsWith(`&${name} `))!;
    const written = `&bar meter("4/4") step=&tempo  # four beats\n&tempo step=100bpm\n${line('bd')}\n${line('sd')}\n${line('hh')}\n${beat}`;
    const { source, steps } = normalise(written, seed);
    // (written as a from line, decision 065, in one step; and the bar as the meter template with its defaults, #524)
    expect(source).toBe(`&bar from bar &tempo           # four beats\n&tempo step=100bpm\n&bd, &sd, &hh from gm_kit\n${beat}`);
    expect(steps).toHaveLength(2);
    expect(soundsIdentical(written, source, undefined, seed)).toBe(true);
    expect(normalise(source, seed)).toEqual({ source, steps: [] });
    // (a use of the fragment already written takes the names too)
    expect(normalise(`&bd from gm_kit\n&bar meter("4/4") step=&tempo\n&tempo step=100bpm\n${line('sd')}\n${line('hh')}\n${beat}`, seed).source).toBe(
      `&bd, &sd, &hh from gm_kit\n&bar from bar &tempo\n&tempo step=100bpm\n${beat}`,
    );
    // (a line that differs by a word stays the piece's; with no library given, nothing is taken)
    const own = written.replace(line('hh'), line('hh').replace('hpf=8000', 'hpf=7000'));
    expect(normalise(own, seed).source).toContain(line('hh').replace('hpf=8000', 'hpf=7000'));
    expect(normalise(written, { resolve: resolveSeed }).steps).toEqual([]);
  });

  it('writes a fragment cell written inline as the cell by name, and a from line of it (#196): every place, once', () => {
    const seed = { resolve: resolveSeed, library: LIBRARY };
    const vib = '&(map=lin loop=5 0 .1 0 -.1 0)';
    // (the bar the meter fragment's: the from line goes before the first line that reads the cell, #729)
    const base = BASE.replace('&bar meter("4/4") step=&tempo', '&bar from bar &tempo');
    const written = `${base}&lead s=saw loop=C4 pitch=${vib}\n&pad s=tri loop=C3 pitch=${vib}\n&mix [&tune * &lead, &tune * &pad]`;
    const { source, steps } = normalise(written, seed);
    expect(source).toBe(written.replace('&lead s=saw', '&vibrato from vibrato\n&lead s=saw').replaceAll(vib, '&vibrato'));
    expect(steps).toHaveLength(1);
    expect(soundsIdentical(written, source, undefined, seed)).toBe(true);
    // (a vibrato a word off is the piece's own; a piece that names &vibrato itself keeps its inline cell)
    expect(normalise(written.replaceAll('.1 0 -.1', '.12 0 -.12'), seed).steps.filter((step) => !step.includes('decision 065'))).toEqual([]);
    expect(normalise(`${written}\n&vibrato 0`, seed).source).toContain(`pitch=${vib}`);
  });

  it('docs/language/canonical.md lists every alias it writes, and what it writes', () => {
    const page = readFileSync('docs/language/canonical.md', 'utf8');
    for (const [alias, ours] of Object.entries(PARAM_ALIASES)) expect([alias, new RegExp(`\\|[^|\\n]*\`${alias}=\`[^|\\n]*\\| \`${ours}=\``).test(page)]).toEqual([alias, true]);
  });
});

describe('Normalise’s rules reach one text in any order (#729, law L15)', () => {
  const OLD = { resolve: resolveSeed, library: LIBRARY };
  /** Normalise with each round's rewrites tried last first. */
  const backwards = (text: string) => rewriteAll(text, (s, r) => [...normalisations(OLD)(s, r)].reverse(), ROUNDS, OLD);
  const forwards = (text: string) => normalise(text, OLD);

  it('an inline cell in a line that is the library’s is left in it: the line is the fragment’s to take whole', () => {
    const text = [
      '&bar meter("4/4") step=120bpm',
      '&sd note=38 s=white hpf=1500 env=&(map=adsr 0 .12 0 .05)',
      '&kit &sd',
      '&beat over=&kit step=4n 0!4',
      '&lead s=saw loop=C4 env=&(map=adsr 0 .12 0 .05)',
      '&tune step=4n 0 2 4 5',
      '&out map=sample [&beat, &tune * &lead]',
    ].join('\n');
    // (the rule alone: the voice's envelope is named, the kit's line is as it was)
    const named = libraryCells(text, LIBRARY).map((r) => r.apply(text));
    expect(named).toHaveLength(1);
    expect(named[0]).toContain('&sd note=38 s=white hpf=1500 env=&(map=adsr 0 .12 0 .05)');
    expect(named[0]).toContain('&lead s=saw loop=C4 env=&snap');
    // (and either way round, the same text: the snare from the kit, the envelope by name)
    const a = forwards(text).source;
    expect(a).toContain('&sd from gm_kit');
    expect(a).toContain('env=&snap');
    expect(backwards(text).source).toBe(a);
  });

  it('an argument that names a cell the library gives is left out, where the line plays the same', () => {
    // (Funk's drums, their kit taken from the library by name and passed by name: what Migrate wrote where the piece
    // had the kit's lines, once Normalise has made those lines the library's)
    const funk = EXAMPLES.funk.source;
    expect(funk).toMatch(/ from funk_drums$/m);
    const explicit = funk.replace(/^(.*) from funk_drums$/m, '&bd, &rim, &sd, &hh, &oh from gm_kit\n$1 from funk_drums(bd=&bd, rim=&rim, sd=&sd, hh=&hh, oh=&oh)');
    const { source, steps } = forwards(explicit);
    expect(steps).toEqual([expect.stringContaining('as the library gives them')]);
    expect(source).toBe(funk.replace(/^(.*) from funk_drums$/m, '&bd, &rim, &sd, &hh, &oh from gm_kit\n$1 from funk_drums'));
    expect(backwards(explicit).source).toBe(source);
    // (an argument the piece's own line fills stays: the piece's kick is not the library's)
    const own = '&bd note=36 s=sine loop=A1\n&kick from funk_drums(bd=&bd)';
    expect(takenArguments(own)).toEqual([]);
  });

  it('a template waits for a second clock to be folded and the tempo named: breve, forwards and backwards', () => {
    // (breve's bar written as bar's template writes it, meter("2/2") a text: its own meter("2/2", 2) is no template's line, decision 103)
    const text = EXAMPLES.breve.source.replace('meter("2/2", 2)', 'meter("2/2")');
    const breve = FAMILIES.find((f) => f.key === 'from')!.rewrite(text, { resolve: resolveSeed });
    const a = forwards(breve).source;
    expect(a).toContain('&tempo step=60bpm');
    expect(backwards(breve).source).toBe(a);
  });
});
