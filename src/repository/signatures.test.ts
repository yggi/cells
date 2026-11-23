// The seed library's signatures (decision 065, rung 2: #387): each template declares what it takes, and a `from` line
// takes a copy of it over a workbench that gives its main argument, with no diagnostic (a performer, with what it says
// written out by hand: it plays on a card). A collection (a kit, an
// instrument, a groove, the envelopes) has none.
import { seedFragments } from './seed';
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { signatureOf } from '../engine/use';
import { LIBRARY, resolveSeed } from './library';

const RHYTHM_FRAGMENTS = seedFragments('rhythms');
// (the layers of a drum track a form places by the bar, #718: taken as a rhythm is; a count takes the meter, &bar, #720)
const LAYER_FRAGMENTS = seedFragments('fills');
const lines = (...xs: string[]) => xs.join('\n');
// (a word as it is, and a template taken with its arguments as a from line takes it, `meter(grouping=meter("7/8"))`; anything else quoted)
const quoted = (id: string) => (/^[A-Za-z_][A-Za-z0-9_]*(\(.*\))?$/.test(id) ? id : JSON.stringify(id));
const METER = '&bar meter("4/4") step=120bpm';
const KEY = '&key scale(dorian, D)';
const SOUND = lines('&v s=sine loop=C4', '&out [&heard * &v]');

/** A workbench for a template, by its main parameter: what it reads, given, and a line that plays the copy. */
const WORKBENCH: Record<string, (head: string, use: string) => string> = {
  '&tempo': (head, use) => lines(`${head} from ${use} 120bpm`, '&heard step=8n 0 2', SOUND),
  // (a key read from its tonic, or a melodic scale on it, #719: a line over what it defines)
  '&tonic': (head, use) => lines(METER, `${head} from ${use} D`, `&heard over=${head.includes('&key') ? '&key' : head} step=8n 0 1 2`, SOUND),
  // (a count, #720: the meter it clicks, and its click heard)
  '&bar': (head, use) => lines(METER, `${head} from ${use} &bar`, `&out map=sample [${head.split(',')[0]}]`),
  // (a template of several heads, an ending's, #720: its first played)
  '&key': (head, use) => lines(METER, KEY, `${head} from ${use} &key`, `&heard step=8n ${head.split(',')[0]}`, SOUND),
  '&harm': (head, use) => lines(METER, KEY, '&harm over=&key step=1m [0,2,4] [3,5,7]', `${head} from ${use} &harm`, '&heard step=8n &x', SOUND),
  '&call': (head, use) => lines(METER, KEY, '&m over=&key step=8n 0 2 4 7', `${head} from ${use} &m`, '&heard step=8n &x', SOUND),
  '&a': (head, use) => lines(METER, KEY, '&m over=&key step=8n 0 2 4 7', `${head} from ${use} &m`, '&heard step=8n &x', SOUND),
  // (a law, decision 085: the day it reads, and a voice it plays on)
  '&day': (head, use) => lines('&day scan(1!24) loop=1d', `${head} from ${use} &day`, '&glass s=tri loop=C4', `&out map=sample [${head} * &glass * .3]`),
  // (a section kind, #810: the song's intensity in, its own read where a moving parameter reads a value)
  '&song': (head, use) =>
    lines(METER, '&song .55', `${head} from ${use} &song`, '&line step=8n 0 2 4', `&v s=saw loop=C4 lpf=300..2400 * ${head.split(',')[0]}`, '&out map=sample [&line * &v * .3]'),
};
const PERFORMER = (head: string, use: string, main: string) =>
  main === '&drumlines'
    ? lines(METER, '&dl step=8n &bd &sd', `${head} from ${use} &dl`)
    : lines(METER, KEY, '&line over=&key step=8n 0 2 4', `${head} from ${use} &line`, '&style style=&(map=style sync=.5 harm=.5 bite=.5 mood=.5)');

// (the modules, whose main parameter is the audio they take, or none, are played in a patch of their own: modules.test.ts)
const templates = LIBRARY.filter((f) => signatureOf(f.text) && !f.association.some((wp) => wp.facet === 'module'));
const NOTHING_PLAYS = 'Nothing plays yet — write a sound: a voice alone plays its own pitch (&a loop=A4), a melody plays on one ([&melody * &a])';

describe('the seed library’s signatures', () => {
  it('200 templates (#720: the ending, finale; #718 and #720: the eight fills and the four counts; #719: the melodic scales, the pentatonic two; #799: the metric accent and the breathing pulse; #810: the nine section kinds and the seven song forms; #772: the law five_to_twelve; #572: ten more, two stabs, three bass lines, a harmony and four motifs; #542: ten more, three harmonies, three bass lines and four motifs, then eleven more, four beats, four bass lines, a harmony and two motifs; #540: five harmonies; #637: the 26 rhythms, now 32 with #646’s two): the meters, modes, harmonies, bass lines, motifs, forms, section kinds, song forms, the stabs, the performers, the four instruments that read a style, the band and the rhythms; the rest collections', () => {
    expect(templates).toHaveLength(200);
    const collections = LIBRARY.filter((f) => !signatureOf(f.text)).map((f) => f.id);
    expect(collections).toContain('gm_kit');
    expect(collections).toContain('upright_bass');
    expect(collections).toContain('envelopes');
  });

  it('each has one main parameter, the one it read by name before (#290, #294); an instrument none, its style optional (#560)', () => {
    const instruments = ['bass', 'keys', 'pad', 'lead'];
    for (const id of instruments) expect(signatureOf(LIBRARY.find((f) => f.id === id)!.text), id).toMatchObject({ optional: ['&style'], main: null });
    // (the band: every input optional, the score's parts, levels and style, #560)
    expect(signatureOf(LIBRARY.find((f) => f.id === 'band')!.text)!.main).toBeNull();
    // (a rhythm: its drums optional, each the kit's own line by default, #637)
    for (const f of RHYTHM_FRAGMENTS) expect(signatureOf(f.text)!.main, f.id).toBeNull();
    // (a fill: its drums optional, #718)
    for (const f of LAYER_FRAGMENTS) expect(signatureOf(f.text)!.main, f.id).toBeNull();
    const rhythms = new Set([...RHYTHM_FRAGMENTS, ...LAYER_FRAGMENTS].map((f) => f.id));
    // (a built-in braid fill: its arguments all optional, #799)
    expect(signatureOf(LIBRARY.find((f) => f.id === 'metric_accent')!.text)!.main).toBeNull();
    for (const f of templates.filter((t) => !instruments.includes(t.id) && t.id !== 'band' && t.id !== 'metric_accent' && !rhythms.has(t.id)))
      expect(signatureOf(f.text)!.main, f.id).toMatch(/^&(bar|tempo|tonic|key|harm|call|a|drumlines|bassline|padline|stabline|leadline|day|song)$/);
  });

  it.each(templates.map((f) => [f.id, f.text] as const))('%s: a copy over a workbench that gives its main argument compiles with no diagnostic', (id, text) => {
    const { names, main } = signatureOf(text)!;
    const head = names.length > 1 ? names.join(', ') : names[0] === '&bar' || names[0] === '&key' ? names[0] : '&x';
    // (an instrument, which takes no main argument: its voice playing a line)
    const piece =
      id === 'band'
        ? lines(METER, KEY, '&bassline over=&key step=4n 0 2', '* from band(bassline=&bassline)')
        : [...RHYTHM_FRAGMENTS, ...LAYER_FRAGMENTS].some((f) => f.id === id)
          ? lines(METER, `* from ${quoted(id)}`, `&out map=sample [${names.at(-1)}]`)
          : id === 'metric_accent'
            ? lines(METER, KEY, '&line over=&key step=16n 0 2 4 2', `&x from ${quoted(id)}`, '&v s=sine loop=C4', '&out map=sample [&line * &x * &v]')
            : main === null
              ? lines(METER, KEY, '&line over=&key step=8n 0 2 4', `&x from ${quoted(id)}`, '&out map=sample [&line * &x]')
              : /line(s)?$/.test(main)
                ? PERFORMER(head, quoted(id), main)
                : WORKBENCH[main]!(head, quoted(id));
    const r = compileSource(names.includes('&bell') ? lines(piece, '* from gm_kit') : piece, undefined, { resolve: resolveSeed });
    // (a performer is a role cell over a gate: no sound of its own, so it plays on a card, as it does written out by hand)
    expect(r.diagnostics.map((d) => d.message)).toEqual(main !== null && /line(s)?$/.test(main) ? [NOTHING_PLAYS] : []);
  });
});
