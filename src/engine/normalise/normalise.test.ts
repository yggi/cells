import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PARAM_ALIASES } from '../attributes';
import { normalise } from './index';
import { compileSource } from '../compile';
import { samePiece, soundsIdentical } from '../sameness';
import { shorten } from '../shorten';
import { PRESETS } from '../presets';
import { LIBRARY, resolveSeed } from '../../repository/library';
import { unionOf } from '../../repository/fit';
import { holesOf } from '../../repository/holes';

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

  it('every example, and every fragment of the seed library, is normal already', () => {
    for (const [key, p] of Object.entries(PRESETS)) expect([key, normalise(p.source).steps]).toEqual([key, []]);
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

  it('a use of a retired id as the use it forwards to (#196): the core kit as 13 of gm_kit, the old gm kit as gm_kit', () => {
    const groove = '&bar meter("4/4") step=&tempo\n&tempo step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh ~\n&out map=sample [&beat]';
    const thirteen = 'use &bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit';
    for (const [old, now] of [
      ['use * from "core kit"', thirteen],
      ['use "core kit"  # the kit', `${thirteen}  # the kit`],
      ['use &bd, &hh, &sd from "core kit"', 'use &bd, &hh, &sd from gm_kit'],
      ['use * from "gm kit"', 'use * from gm_kit'],
      ['use &bd, &hh, &sd from "gm kit"', 'use &bd, &hh, &sd from gm_kit'],
    ]) {
      const { source, steps } = normalise(`${old}\n${groove}`, { resolve: resolveSeed });
      expect([old, source]).toEqual([old, `${now}\n${groove}`]);
      expect(steps.length, old).toBeGreaterThan(0);
      expect(compileSource(source, undefined, { resolve: resolveSeed }).diagnostics, old).toEqual([]);
    }
    // (a name the forward doesn't give is left as written: the compile says so)
    expect(normalise(`use &agogo from "core kit"\n${groove}`, { resolve: resolveSeed }).steps).toEqual([]);
    // (with no resolver, nothing is forwarded)
    expect(normalise(`use * from "core kit"\n${groove}`).steps).toEqual([]);
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

  it('names nothing it could name two ways, or that is taken, or that has no value of its own', () => {
    const tune = (over: string) => `&tune over=${over} step=8n 0 2 4 2\n&lead s=saw loop=C4\n&mix [&tune * &lead]`;
    // (two meters, each a clock: which is the bar? Two keys: which is the key? A key's scan is no meter)
    const two = `&a scan(1 1 1 1) step=96bpm\n&b scan(1 1 1) step=72bpm\n&x scale(major, C)\n&y scale(minor, A)\n${tune('&x')}\n&t2 over=&y step=&b 0 2`;
    expect(normalise(two).steps.filter((t) => /is the piece's|tempo|tonic/.test(t))).toEqual([]);
    // (a name taken by a cell of another job)
    const taken = `&m scan(1 1 1 1) step=96bpm\n&bar s=sine loop=C2\n&tempo s=sine loop=C3\n${tune('scale(major)')}`;
    expect(normalise(taken).steps.filter((t) => /&m is|tempo/.test(t))).toEqual([]);
    // (a rate already a cell, and a key with no tonic of its own (the voice's loop= gives it))
    const open = `&bar meter("4/4") step=&r\n&r step=96bpm\n&key scale(major)\n${tune('&key')}`;
    expect(normalise(open).steps).toEqual([]);
  });

  it('docs/language/canonical.md lists every alias it writes, and what it writes', () => {
    const page = readFileSync('docs/language/canonical.md', 'utf8');
    for (const [alias, ours] of Object.entries(PARAM_ALIASES)) expect([alias, new RegExp(`\\|[^|\\n]*\`${alias}=\`[^|\\n]*\\| \`${ours}=\``).test(page)]).toEqual([alias, true]);
  });
});
