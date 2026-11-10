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
const lines = (...xs: string[]) => xs.join('\n');
// (a word as it is, and a template taken with its arguments as a from line takes it, `meter(grouping=meter("7/8"))`; anything else quoted)
const quoted = (id: string) => (/^[A-Za-z_][A-Za-z0-9_]*(\(.*\))?$/.test(id) ? id : JSON.stringify(id));
const METER = '&bar meter("4/4") step=120bpm';
const KEY = '&key scale(dorian, D)';
const SOUND = lines('&v s=sine loop=C4', '&out [&heard * &v]');

/** A workbench for a template, by its main parameter: what it reads, given, and a line that plays the copy. */
const WORKBENCH: Record<string, (head: string, use: string) => string> = {
  '&tempo': (head, use) => lines(`${head} from ${use} 120bpm`, '&heard step=8n 0 2', SOUND),
  '&tonic': (head, use) => lines(METER, `${head} from ${use} D`, '&heard over=&key step=8n 0 1 2', SOUND),
  '&key': (head, use) => lines(METER, KEY, `${head} from ${use} &key`, '&heard step=8n &x', SOUND),
  '&harm': (head, use) => lines(METER, KEY, '&harm over=&key step=1m [0,2,4] [3,5,7]', `${head} from ${use} &harm`, '&heard step=8n &x', SOUND),
  '&call': (head, use) => lines(METER, KEY, '&m over=&key step=8n 0 2 4 7', `${head} from ${use} &m`, '&heard step=8n &x', SOUND),
  '&a': (head, use) => lines(METER, KEY, '&m over=&key step=8n 0 2 4 7', `${head} from ${use} &m`, '&heard step=8n &x', SOUND),
};
const PERFORMER = (head: string, use: string, main: string) =>
  main === '&drumlines'
    ? lines(METER, '&dl step=8n &bd &sd', `${head} from ${use} &dl`)
    : lines(METER, KEY, '&line over=&key step=8n 0 2 4', `${head} from ${use} &line`, '&style style=&(map=style sync=.5 harm=.5 bite=.5 mood=.5)');

// (the modules, whose main parameter is the audio they take, or none, are played in a patch of their own: modules.test.ts)
const templates = LIBRARY.filter((f) => signatureOf(f.text) && !f.association.some((wp) => wp.facet === 'module'));
const NOTHING_PLAYS = 'Nothing plays yet — write a sound: a voice alone plays its own pitch (&a loop=A4), a melody plays on one ([&melody * &a])';

describe('the seed library’s signatures', () => {
  it('156 templates (#572: ten more, two stabs, three bass lines, a harmony and four motifs; #542: ten more, three harmonies, three bass lines and four motifs, then eleven more, four beats, four bass lines, a harmony and two motifs; #637: the 26 rhythms, now 30): the meters, modes, harmonies, bass lines, motifs, forms, the stabs, the performers, the four instruments that read a style, the band and the rhythms; the rest collections', () => {
    expect(templates).toHaveLength(156);
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
    const rhythms = new Set(RHYTHM_FRAGMENTS.map((f) => f.id));
    for (const f of templates.filter((t) => !instruments.includes(t.id) && t.id !== 'band' && !rhythms.has(t.id)))
      expect(signatureOf(f.text)!.main, f.id).toMatch(/^&(tempo|tonic|key|harm|call|a|drumlines|bassline|padline|stabline|leadline)$/);
  });

  it.each(templates.map((f) => [f.id, f.text] as const))('%s: a copy over a workbench that gives its main argument compiles with no diagnostic', (id, text) => {
    const { names, main } = signatureOf(text)!;
    const head = names.length > 1 ? names.join(', ') : names[0] === '&bar' || names[0] === '&key' ? names[0] : '&x';
    // (an instrument, which takes no main argument: its voice playing a line)
    const piece =
      id === 'band'
        ? lines(METER, KEY, '&bassline over=&key step=4n 0 2', '* from band(bassline=&bassline)')
        : RHYTHM_FRAGMENTS.some((f) => f.id === id)
          ? lines(METER, `* from ${quoted(id)}`, `&out map=sample [${names.at(-1)}]`)
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
