// The seed library's signatures (decision 065, rung 2: #387): each template declares what it takes, and a `from` line
// takes a copy of it over a workbench that gives its main argument, with no diagnostic (a performer, with what it says
// written out by hand: it plays on a card). A collection (a kit, an
// instrument, a groove, the envelopes) has none.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { signatureOf } from '../engine/use';
import { LIBRARY, resolveSeed } from './library';

const lines = (...xs: string[]) => xs.join('\n');
const quoted = (id: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(id) ? id : JSON.stringify(id));
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
    : lines(METER, KEY, '&line over=&key step=8n 0 2 4', `${head} from ${use} &line`, '&style style=&(map=style .5 .5 .5 .5)');

const templates = LIBRARY.filter((f) => signatureOf(f.text));
const NOTHING_PLAYS = 'Nothing plays yet — write a sound: a voice alone plays its own pitch (&a loop=A4), a melody plays on one ([&melody * &a])';

describe('the seed library’s signatures', () => {
  it('80 templates: the meters, modes, harmonies, bass lines, motifs, forms, the stabs and the performers; the rest collections', () => {
    expect(templates).toHaveLength(80);
    const collections = LIBRARY.filter((f) => !signatureOf(f.text)).map((f) => f.id);
    expect(collections).toContain('gm_kit');
    expect(collections).toContain('bass');
    expect(collections).toContain('envelopes');
  });

  it('each has one main parameter, the one it read by name before (#290, #294)', () => {
    for (const f of templates) expect(signatureOf(f.text)!.main, f.id).toMatch(/^&(tempo|tonic|key|harm|call|a|drumlines|bassline|padline|stabline|leadline)$/);
  });

  it.each(templates.map((f) => [f.id, f.text] as const))('%s: a copy over a workbench that gives its main argument compiles with no diagnostic', (id, text) => {
    const { names, main } = signatureOf(text)!;
    const head = names.length > 1 ? names.join(', ') : names[0] === '&bar' || names[0] === '&key' ? names[0] : '&x';
    const piece = /line(s)?$/.test(main!) ? PERFORMER(head, quoted(id), main!) : WORKBENCH[main!]!(head, quoted(id));
    const r = compileSource(names.includes('&bell') ? lines(piece, '* from gm_kit') : piece, undefined, { resolve: resolveSeed });
    // (a performer is a role cell over a gate: no sound of its own, so it plays on a card, as it does written out by hand)
    expect(r.diagnostics.map((d) => d.message)).toEqual(/line(s)?$/.test(main!) ? [NOTHING_PLAYS] : []);
  });
});
