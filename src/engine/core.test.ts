/**
 * The core grammar's sugar, checked (#418, `docs/notes/core-grammar.md`): each row of the syntax reference the note calls
 * sugar, its rewrite into core forms sounds identical (S1, `soundsIdentical`) on the reference's own example. Each example
 * is played the least way that sounds it: a sine voice and a card (`&v`, `&out`), the tables it reads (`&major`, `&motif`)
 * and a clock where it taps one. A waveform or a rate the reference shows at audio rate is stepped slowly here, so it starts
 * notes S1 can compare. Each check also asks that the written form plays something, so no check passes on silence. The
 * rows whose rewrite is not exact (`off`, `pitch=`, `loop=` as `step=`) are in the note, with why.
 */
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { soundsIdentical } from './sameness';
import { resolveSeed } from '../repository/library';

const BAR = '&bar meter("4/4") step=120bpm';
const V = '&v s=sine loop=C4';
const MAJOR = '&major scan(2 2 1 2 2 2 1)';
const MOTIF = '&motif 0 2 4 5';
const DRUMS = ['&bd s=sine loop=A1', '&sd s=white', '&hh s=pink'];
const KEYS = '&keys 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15';
const DIAL = '"1 2 3 A 4 5 6 B 7 8 9 C * 0 # D"';
const piece = (...lines: string[]) => lines.join('\n');
/** The cell `name` played on a sine, on the card. */
const out = (name: string) => piece(V, `&out map=sample [&${name} * &v]`);

/** [the reference's row (section · form), the written text, its rewrite]. */
type Check = readonly [row: string, written: string, rewrite: string];
/** A line and its rewrite, after the same context, the line `name` played. */
const line = (row: string, written: string, rewrite: string, name: string, ...context: string[]): Check => [
  row,
  piece(...context, written, out(name)),
  piece(...context, rewrite, out(name)),
];
/** A table (or clock) line and its rewrite, read by the same line `body`, the cell `name` played. */
const table = (row: string, written: string, rewrite: string, body: string, name: string): Check => [row, piece(written, body, out(name)), piece(rewrite, body, out(name))];
/** Two texts that differ in their mix, the card playing `&mix`. */
const mix = (row: string, context: string[], written: string, rewrite: string): Check => [
  row,
  piece(...context, written, '&out map=sample [&mix]'),
  piece(...context, rewrite, '&out map=sample [&mix]'),
];

const GTM = (s: string) => `&tune step=2 0 2 4\n&lead s=saw loop=C4\n${s}`;

const SUGAR: Check[] = [
  // Lines
  line('Lines · # …', '&tune step=2 0 2 4  # the opening', '&tune step=2 0 2 4', 'tune'),
  [
    'Lines · … +',
    piece('&a step=2 0 2', '&b step=2 4 5', V, '&out map=sample [&a * &v +', '  &b * &v]'),
    piece('&a step=2 0 2', '&b step=2 4 5', V, '&out map=sample [&a * &v + &b * &v]'),
  ],
  [
    'Lines · &x from id',
    piece('&bd, &sd from gm_kit', '&g step=4 &bd ~ &sd ~', '&out map=sample [&g]'),
    piece(
      '&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&(map=adsr 0 .3 0 .05)',
      '&sd s=white hpf=1500 env=&(map=adsr 0 .12 0 .05)',
      '&g step=4 &bd ~ &sd ~',
      '&out map=sample [&g]',
    ),
  ],
  // Steps
  line('Steps · _', '&tune step=2 0 _ _ 2 4 _', '&tune step=2 0@3 2 4@2', 'tune'),
  line('Steps · =', '&answer base=&subject^$7 =!3 12@2', '&answer step=2 7 9 11 12@2 14', 'answer', '&subject step=2 0 2 4 5 7'),
  line('Steps · [a b c]', '&tune step=1 0 [2 4] [5 [7 9]] [0 2@2]', '&tune step=12 0@12 2@6 4@6 5@6 7@3 9@3 0@4 2@8', 'tune'),
  line('Steps · [a b c]', '&tune step=1 [0 ~ 4]!2 [0 2]*2 [0 2, 7]', '&tune step=1 [0 ~ 4] [0 ~ 4] [0 2 0 2] [0 2, 7]', 'tune'),
  line('Steps · <a b c>', '&tune step=2 0 <2 4 7> 4 <5 [7 9]>', '&tune step=2 0 [2 4 7]/3 4 [5 [7 9]]/2', 'tune'),
  [
    'Steps · &voice (stepped)',
    piece(...DRUMS, '&groove step=4 &bd ~ &hh [&bd, &sd] &hh*2 ~', '&out map=sample [&groove]'),
    piece(...DRUMS, '&b step=4 0 ~ ~ 0 ~ ~', '&s step=4 ~ ~ ~ 0 ~ ~', '&h step=4 ~ ~ 0 ~ [0 0] ~', '&out map=sample [&b * &bd, &s * &sd, &h * &hh]'),
  ],
  // Modifiers
  line('Modifiers · x!n', '&beat step=4 0!4 2!2', '&beat step=4 0 0 0 0 2 2', 'beat'),
  line('Modifiers · x*n', '&hats step=2 0 0*2 0 0*3', '&hats step=2 0 [0 0] 0 [0 0 0]', 'hats'),
  [
    'Modifiers · x(k,n,r)',
    piece(...DRUMS, '&groove step=1 &bd(3,8) &hh(5,8,2)', '&out map=sample [&groove]'),
    piece(...DRUMS, '&groove step=1 [&bd ~ ~ &bd ~ ~ &bd ~] [&hh ~ &hh ~ &hh &hh ~ &hh]', '&out map=sample [&groove]'),
  ],
  line(
    'Modifiers · x(k,n,r)',
    '&tune step=1 0(3,8) <0 2>(3,8,2) <0 [2 4]>(5,8)',
    '&tune step=1 [0 ~ ~ 0 ~ ~ 0 ~] <[0 ~ 0 ~ ~ 0 ~ ~] [2 ~ 2 ~ ~ 2 ~ ~]> <[0 ~ 0 0 ~ 0 0 ~] [2 ~ 2 2 ~ 4 4 ~]>',
    'tune',
  ),
  [
    'Modifiers · &x:0:gain',
    piece(...DRUMS, '&beat step=8 [&bd,&hh] &hh:0:.4 [&sd,&hh] &hh:0:.4', '&out map=sample [&beat]'),
    piece(...DRUMS, '&b step=8 0 ~ ~ ~', '&s step=8 ~ ~ 0 ~', '&h step=8 0 0 0 0', '&acc map=amp step=8 1 .4 1 .4', '&out map=sample [&b * &bd, &h * &hh * &acc, &s * &sd]'),
  ],
  // References
  line('References · &name[a:b:s]', '&tune step=2 &motif[1:3] &motif[:-1] &motif[::-1] &motif[::2]', '&tune step=2 2 4 0 2 4 5 4 2 0 0 4', 'tune', MOTIF),
  line('References · &name[slot]', '&held step=4n &level[sustain] &level[attack]', '&held step=4n &level[$2] &level[$0]', 'held', BAR, '&level map=adsr .01 .3 .5 .4'),
  [
    'References · &( … )',
    piece('&lead s=saw loop=C4 env=&(map=adsr .01 .3 .5 .4)', '&t step=2 0 2', '&out map=sample [&t * &lead]'),
    piece('&lead s=saw loop=C4 env=&e', '&e map=adsr .01 .3 .5 .4', '&t step=2 0 2', '&out map=sample [&t * &lead]'),
  ],
  // Generators
  table('Generators · scan(i …)', MAJOR, '&major cycle=12 0 2 4 5 7 9 11', '&tune over=&major step=2 0 2 4 7 -1 9', 'tune'),
  table('Generators · scan(i …)', '&tempo scan(1!4 .5!2) step=120bpm', '&tempo scan(1 1 1 1 .5 .5) step=120bpm', '&t step=&tempo 0 2 4', 't'),
  table('Generators · scan(i …)', '&series scan(geo(5, 25, 0 10 5))', `&series scan(1 ${5 ** (10 / 25)} ${5 ** (5 / 25)})`, '&t over=&series step=2 0 1 2 3 4', 't'),
  line('Generators · euclid(k, n)', '&tresillo step=4 euclid(3, 8)', '&tresillo step=4 0 ~ ~ 0 ~ ~ 0 ~', 'tresillo'),
  line('Generators · euclid(k, n)', '&clave step=4 euclid(5, 16, 2)', '&clave step=4 ~ ~ 0 ~ ~ 0 ~ ~ 0 ~ ~ 0 ~ ~ 0 ~', 'clave'),
  line('Generators · sin(n) …', '&sine step=2 sin(12)', `&sine step=2 ${Array.from({ length: 12 }, (_, k) => Math.sin((2 * Math.PI * k) / 12).toFixed(15)).join(' ')}`, 'sine'),
  line('Generators · sin(n) …', '&ramp step=2 saw(8)', '&ramp step=2 -1 -.75 -.5 -.25 0 .25 .5 .75', 'ramp'),
  line('Generators · sin(n) …', '&swell step=2 tri(4)', '&swell step=2 -1 0 1 0', 'swell'),
  line('Generators · sin(n) …', '&pulse step=2 square(2)', '&pulse step=2 -1 1', 'pulse'),
  table('Generators · scale(name)', '&scale scale(minor, D)', '&k shift=2\n&scale over=&k scan(2 1 2 2 1 2 2)', '&t over=&scale step=2 0 2 4 7 -1 9', 't'),
  table('Generators · scale(name)', '&scale scale("D:minor")', '&scale scale(minor, D)', '&t over=&scale step=2 0 2 4 7 -1 9', 't'),
  table('Generators · scale(name)', '&blues scale(blues)', '&blues scan(3 2 1 1 3 2)', '&t over=&blues step=2 0 2 4 7 -1 9', 't'),
  table('Generators · fifths()', '&circle fifths()', '&circle 0 7 2 9 4 11 6 1 8 3 10 5', '&t over=&circle step=2 0 1 2 3 11 12', 't'),
  table('Generators · fifths()', '&circleG fifths(G)', '&circleG fifths(1)', '&t over=&circleG step=2 0 1 2 3 11 12', 't'),
  table('Generators · meter("sig")', '&bar meter("4/4", 2) step=100bpm', '&bar meter("*.+.+.+.") step=100bpm', '&t step=&bar 0 2 4', 't'),
  line(
    'Generators · spell(…)',
    `&dial step=8 spell("867 5309", &keys, ${DIAL})`,
    '&dial step=8 &keys[9] ~ &keys[6] ~ &keys[8] ~ ~ ~ &keys[5] ~ &keys[2] ~ &keys[13] ~ &keys[10] ~',
    'dial',
    KEYS,
  ),
  // step= and loop=
  [
    'step= and loop= · loop=NAME',
    piece('&lead s=saw loop=C4', '&t step=2 0 2', '&out map=sample [&t * &lead]'),
    piece('&lead s=saw loop=261.6255653005986', '&t step=2 0 2', '&out map=sample [&t * &lead]'),
  ],
  line('step= and loop= · step=cycle(&x)', '&key step=cycle(&theme) 0 2', '&key step=&theme/4 0 2', 'key', '&theme step=2 0 2 4 5'),
  line('step= and loop= · step=pulse', '&tune step=pulse 0 2 4', '&tune step=&bar 0 2 4', 'tune', BAR),
  line('step= and loop= · step=pulse', '&hats step=pulse*2 0!8', '&hats step=&bar*2 0!8', 'hats', BAR),
  line('step= and loop= · step=pulse', '&chords step=beat [0,2,4]', '&chords step=&bar [0,2,4]', 'chords', BAR),
  line('step= and loop= · step=16n', '&drums step=16n 0 ~ 1 ~', '&drums step=&bar*4 0 ~ 1 ~', 'drums', BAR),
  line('step= and loop= · step=16n', '&tresillo step=4n. 0 0 0', '&tresillo step=&bar*2 0@3 0@3 0@2', 'tresillo', BAR),
  line('step= and loop= · step=16n', '&roots step=1m 0 5 7', '&roots step=cycle(&bar) 0 5 7', 'roots', BAR),
  line('step= and loop= · step=&m:16n', '&comp step=&bar2:8n 0 2', '&comp step=&bar2*2 0 2', 'comp', BAR, '&bar2 meter("3/4") step=90bpm'),
  table('step= and loop= · nbpm', '&bar scan(4 4 4 4) step=84bpm', '&bar scan(4 4 4 4) step=1.4', '&t step=&bar 0 2', 't'),
  ['step= and loop= · nhz', piece('&a s=sine loop=440hz', '&t step=2 0 2', '&out map=sample [&t * &a]'), piece('&a s=sine loop=440', '&t step=2 0 2', '&out map=sample [&t * &a]')],
  table('step= and loop= · nmin', '&tick scan(1!60) loop=1min', `&tick scan(1!60) loop=${1 / 60}`, '&t step=&tick 0 2', 't'),
  table('step= and loop= · nh', '&hour scan(1!60) loop=1h', `&hour scan(1!60) loop=${1 / 3600}`, '&t step=&hour 0 2', 't'),
  table('step= and loop= · nd', '&day scan(1!24) loop=1d anchor=11.55', `&day scan(1!24) loop=${1 / 86400} anchor=11.55`, '&t step=&day 0 2', 't'),
  table('step= and loop= · nwk', '&week scan(1!7) loop=1wk', `&week scan(1!7) loop=${1 / 604800}`, '&t step=&week 0 2', 't'),
  ['step= and loop= · nk', piece('&t step=2 0 2', V, '&out loop=44.1k map=sample [&t * &v]'), piece('&t step=2 0 2', V, '&out loop=44100 map=sample [&t * &v]')],
  // map=
  [
    'map= · map=db',
    piece(BAR, '&fade map=db step=&bar 0 -6 -12', '&t step=&bar 0 2 4', V, '&out map=sample [&t * &v * &fade]'),
    piece(BAR, `&fade map=amp step=&bar 1 ${10 ** (-6 / 20)} ${10 ** (-12 / 20)}`, '&t step=&bar 0 2 4', V, '&out map=sample [&t * &v * &fade]'),
  ],
  table('map= · map=edo', '&edo19 cycle=19 map=edo', '&edo19 cycle=19 map=ed(2)', '&t over=&edo19 step=2 0 3 19 -2', 't'),
  table(
    'map= · map=ed(r)',
    '&fifths cycle=7 map=ed(3/2)',
    `&fifths map=ratios ${Array.from({ length: 8 }, (_, k) => 1.5 ** (k / 7)).join(' ')}`,
    '&t over=&fifths step=2 0 3 7 -2',
    't',
  ),
  ['map= · map=midi(c)', piece('&groove step=2 0 2', V, '&drums map=midi(10) [&groove * &v]'), piece('&groove step=2 0 2', V, '&drums map=midi ~!9 [&groove * &v]')],
  // Attributes
  line('Attributes · base=', '&last base=&subject =!3 3@2', '&last step=2 0 2 4 3@2 7', 'last', '&subject step=2 0 2 4 5 7'),
  // Mixes
  mix(
    'Mixes · a - b',
    ['&theme step=2 0 2 4', '&vibrato loop=5 0 .1 -.1', '&lead s=saw loop=C4'],
    '&mix [(&theme + &vibrato - 12) * &lead]',
    '&mix [(&theme + &vibrato + -12) * &lead]',
  ),
  mix(
    'Mixes · ( … )',
    ['&theme step=2 0 2 4', '&lead s=saw loop=C4', '&organ s=square loop=C3'],
    '&mix [&theme * (&lead + &organ) * 0.5]',
    '&mix [&theme * &lead * 0.5 + &theme * &organ * 0.5]',
  ),
  // Gates
  ['Gates · play=&x', GTM('&leadOut play=&tune &lead\n&out map=sample [&leadOut]'), GTM('&out map=sample [&tune * &lead]')],
  [
    'Gates · level=',
    GTM('&accent map=amp step=2 1 .5\n&duck map=amp step=1 1 .3\n&leadOut play=&tune level=&accent*&duck*.4 &lead\n&out map=sample [&leadOut]'),
    GTM('&accent map=amp step=2 1 .5\n&duck map=amp step=1 1 .3\n&out map=sample [&tune * &accent * &duck * &lead * .4]'),
  ],
  [
    'Gates · [&a, &b]',
    GTM('&bell s=sine loop=C5\n&leadOut play=&tune [&lead, &bell]\n&out map=sample [&leadOut]'),
    GTM('&bell s=sine loop=C5\n&out map=sample [&tune * &lead, &tune * &bell]'),
  ],
];

/** Spellings inside rows that are core or outside: one form, two ways to write it (the note's "spellings"). */
const SPELLINGS: Check[] = [
  line('Steps · n (a note name)', '&tune step=2 C E G C5', '&tune step=2 0 4 7 12', 'tune'),
  line('Steps · n# (s and f)', '&tune over=&major step=2 0 4 6# 7 3b', '&tune over=&major step=2 0 4 6s 7 3f', 'tune', MAJOR),
  [
    'Steps · [a, b, c] (a mix of lines)',
    piece('&chords step=1 [0,2,4] [3, 5, 7]', out('chords')),
    piece('&c1 step=1 0 3', '&c2 step=1 2 5', '&c3 step=1 4 7', V, '&out map=sample [&c1 * &v, &c2 * &v, &c3 * &v]'),
  ],
  line('Steps · [a, b, c] (names)', '&chords step=1 [C, E, G] [F, A, C5]', '&chords step=1 [0,4,7] [5,9,12]', 'chords'),
  line('Steps · &x (written in)', '&theme step=2 &motif &motif^$7 0', '&theme step=2 0 2 4 5 7 9 11 12 0', 'theme', MOTIF),
  line('Modifiers · x/n (as <…>)', '&tune step=2 [0 2]/2 4 [5 7 9]/3', '&tune step=2 <0 2> 4 <5 7 9>', 'tune'),
  line('Modifiers · x? (bare)', '&hats step=4 0 0? 0?.3 0', '&hats step=4 0 0?.5 0?.3 0', 'hats'),
  line('Modifiers · x? (chance=)', '&ghost chance=.8 step=4 0? 0? 0? 0?', '&ghost step=4 0?.8 0?.8 0?.8 0?.8', 'ghost'),
  line('References · &name[i] (negative)', '&tune step=2 &motif[0] &motif[-1]', '&tune step=2 &motif[0] &motif[3]', 'tune', MOTIF),
  line('References · &name[<<n] (n left out)', '&mode over=&major[<<] step=2 0 2 4', '&mode over=&major[<<1] step=2 0 2 4', 'mode', MAJOR),
  line(
    'References · &name^n (as degree)',
    '&tune over=&major step=2 &motif &motif^1 &motif^-2',
    '&tune over=&major step=2 &motif degree(&motif, 1) degree(&motif, -2)',
    'tune',
    MAJOR,
    MOTIF,
  ),
  line('References · &name^n (written)', '&tune over=&major step=2 &motif &motif^1 &motif^-2', '&tune over=&major step=2 0 2 4 5 1 3 5 6 -2 0 2 3', 'tune', MAJOR, MOTIF),
  line('References · &name^$n (written)', '&answer step=2 &subject^$7 &subject^$-12', '&answer step=2 7 9 11 12 -12 -10 -8 -7', 'answer', '&subject 0 2 4 5'),
  line(
    'References · inverse (written)',
    '&tune over=&major step=2 &motif inverse(&motif) degree(inverse(&motif), 4)',
    '&tune over=&major step=2 0 2 4 5 0 -2 -4 -5 4 2 0 -1',
    'tune',
    MAJOR,
    MOTIF,
  ),
  line('step= and loop= · step=&x*n/d', '&trip step=&bar*3/2 0 2 4', '&trip step=&bar*1.5 0 2 4', 'trip', BAR),
  table('free() · free(v, lo..hi)', '&bar scan(4 4 4 4) step=free(90bpm, 60..240)', '&bar scan(4 4 4 4) step=90bpm', '&t step=&bar 0 2', 't'),
  table('free() · free(marking)', '&bar scan(4 4 4 4) step=free(andante)', '&bar scan(4 4 4 4) step=92bpm', '&t step=&bar 0 2', 't'),
  line('free() · free(0 2 4 ~ …)', '&riff step=4 free(0 2 4 ~ 4 2 0 ~)', '&riff step=4 0 2 4 ~ 4 2 0 ~', 'riff'),
  line('free() · free("text")', `&dial step=8 spell(free("867 5309"), &keys, ${DIAL})`, `&dial step=8 spell("867 5309", &keys, ${DIAL})`, 'dial', KEYS),
  ['Mixes · free(v, lo..hi)', GTM('&out map=sample [&tune * &lead * free(.8, 0..1)]'), GTM('&out map=sample [&tune * &lead * .8]')],
  line('Attributes · over= (scale(…) unnamed)', '&tune over=scale(minor, A) step=2 0 2 4', '&s scale(minor, A)\n&tune over=&s step=2 0 2 4', 'tune'),
  line('Attributes · show= label= size= tags= (inert)', '&tune show=notes label="the theme" size=2 tags="melody" step=2 0 2 4', '&tune step=2 0 2 4', 'tune'),
];

const OPTIONS = { resolve: resolveSeed };
/** How many events the text plays in its first 8 s, as the host plans it; it compiles with no error. */
const heard = (text: string) => {
  const r = compileSource(text, undefined, OPTIONS);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, 8).length;
};

describe('the sugar rewrites into the core, sounding identical on the reference’s own example (#418)', () => {
  it.each(SUGAR)('%s', (_, written, rewrite) => {
    expect(heard(written)).toBeGreaterThan(0);
    expect(soundsIdentical(written, rewrite, undefined, OPTIONS)).toBe(true);
  });

  it('at least 40 of them, each its own row (the issue’s bound)', () => expect(new Set(SUGAR.map(([row]) => row)).size).toBeGreaterThanOrEqual(40));
});

describe('the spellings inside a core or outside row, sounding identical (#418)', () => {
  it.each(SPELLINGS)('%s', (_, written, rewrite) => {
    expect(heard(written)).toBeGreaterThan(0);
    expect(soundsIdentical(written, rewrite, undefined, OPTIONS)).toBe(true);
  });
});
