// The default band (decision 063 §1, #391): a score that ends in `* from band` played on the seed library's band, its
// five performers under `&band`, two voices reading the score's `&style`, a sound card and a MIDI card on Jambot's
// channels; and which instrument a performer plays at a style, the band's choice, read at resolution (`band.ts`).
// The bound over Jambot's twenty sections, MIDI out unchanged and the sound card rendered clean: `band.slow.test.ts`.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { bandAt, CENTRE, instrumentsAt, PERFORMER_VOICES, resolveBand, scoreStyle } from './band';
import { BAND_FRAGMENTS } from './bands';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { resolveSeed } from './library';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, LO_FI, SPOOKY, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';

const band = BAND_FRAGMENTS.find((f) => f.id === 'band')!.text;
const lineOf = (text: string, voice: string) => text.split('\n').find((l) => l.startsWith(`&${voice} `));

/** A score of the five parts, one bar each, at a style: what a conductor sends, ending in `* from band`. */
const score = (
  style: string,
  parts: Readonly<Record<string, string>> = { drumlines: '&kick', bassline: '0 ~ 2 ~', padline: '[0,2,4]@4', stabline: '~ [0,2] ~ [0,2]', leadline: '4 3 2 0' },
) =>
  [
    '&bar meter("4/4") step=120bpm',
    '&key scale(dorian, D)',
    '&harm over=&key step=1m [0,2,4]',
    '&kick step=4n &bd &bd &bd &bd',
    ...Object.entries(parts).map(([part, line]) => (part === 'drumlines' ? `&drumlines [${line}]` : `&${part} over=&harm step=4n ${line}`)),
    `&style label="a section" style=${style}`,
    '* from band',
  ].join('\n');

/** What a text sends over its first two seconds, and the voices it sounds them on: `channel note velocity at end voice`. */
function sent(text: string, resolve = resolveSeed): string[] {
  const plan = planOf(text, undefined, { resolve });
  const route = router(plan.result, channelTable(plan.result));
  const r = (x: number) => Math.round(x * 1e6) / 1e6;
  return windowAt(plan, 0, 2 - 1e-9)
    .events.flatMap((e) =>
      routesOf(route(e)).flatMap((x) => {
        const n = midiNote(e, x);
        return n ? [`${n.channel} ${n.note} ${n.velocity} ${r(n.at)} ${r(n.end)} ${e.voice}`] : [];
      }),
    )
    .sort();
}

describe('the default band (#391)', () => {
  it('is one fragment, `band`, of the facet band, at the centre of style space', () => {
    expect(BAND_FRAGMENTS.map((f) => [f.id, f.association.map((wp) => [wp.facet, wp.point, wp.weight])])).toEqual([['band', [['band', CENTRE, 1]]]]);
  });

  it('plays a score that ends in `* from band` with no diagnostic: its five performers, each by its role, under the head &band', () => {
    const r = compileSource(score('&(map=style .5 .5 .5 .5)'), undefined, { resolve: resolveSeed });
    expect(r.diagnostics).toEqual([]);
    expect(r.performers.map((p) => [p.name, p.role, p.part])).toEqual([
      ['drumsOut', 'drums', 'drumlines'],
      ['bassOut', 'bass', 'bassline'],
      ['padOut', 'pad', 'padline'],
      ['stabOut', 'stab', 'stabline'],
      ['leadOut', 'lead', 'leadline'],
    ]);
    expect(band.split('\n')[0]).toBe('&band &drums &bass &pad &stab &lead');
  });

  it('sends each performer on Jambot’s channel: 1 the lead, 2 the bass, 3 the pad and the stab, 10 the drums', () => {
    const channels = new Map<string, Set<number>>();
    for (const n of sent(score('&(map=style .5 .5 .5 .5)'))) {
      const [channel, , , , , voice] = n.split(' ');
      channels.set(voice!, (channels.get(voice!) ?? new Set()).add(Number(channel)));
    }
    expect(Object.fromEntries([...channels].map(([v, c]) => [v, [...c]]))).toEqual({ bd: [10], bassV: [2], padV: [3], keysV: [3], leadV: [1] });
  });

  it('takes the score’s levels where it writes them, and its own .8 where it doesn’t', () => {
    const velocities = (text: string) => [
      ...new Set(
        sent(text)
          .filter((n) => n.endsWith(' bassV'))
          .map((n) => Number(n.split(' ')[2])),
      ),
    ];
    const own = velocities(score('&(map=style .5 .5 .5 .5)'));
    const theirs = velocities(`${score('&(map=style .5 .5 .5 .5)')}\n&bassLevel map=amp .4`);
    expect(own).toHaveLength(1);
    expect(theirs).toHaveLength(1);
    expect(theirs[0]).toBeLessThan(own[0]!);
  });

  it('rests a part the score doesn’t write, and says so; a tacet says nothing (decision 063 §4)', () => {
    const four = { drumlines: '&kick', bassline: '0 ~ 2 ~', padline: '[0,2,4]@4', stabline: '~ [0,2] ~ [0,2]' };
    const rests = compileSource(score('&(map=style .5 .5 .5 .5)', four), undefined, { resolve: resolveSeed });
    expect(rests.diagnostics.map((d) => [d.severity, d.message])).toEqual([['info', expect.stringMatching(/^&leadOut plays &leadline, which no line writes: it rests/)]]);
    const tacet = compileSource(`${score('&(map=style .5 .5 .5 .5)', four)}\n&leadline step=1m ~`, undefined, { resolve: resolveSeed });
    expect(tacet.diagnostics).toEqual([]);
    expect(sent(`${score('&(map=style .5 .5 .5 .5)', four)}\n&leadline step=1m ~`).filter((n) => n.endsWith(' leadV'))).toEqual([]);
  });

  it('plays a score that names no style at the centre of style space, and says so; it defines no &style of its own', () => {
    const text = score('&(map=style .5 .5 .5 .5)').replace(/^&style .*$/m, '');
    const r = compileSource(text, undefined, { resolve: resolveSeed });
    expect(r.diagnostics.map((d) => [d.severity, d.message])).toEqual([['info', expect.stringMatching(/^no line writes &style: /)]]);
    expect(sent(text)).toEqual(sent(score('&(map=style .5 .5 .5 .5)')));
    expect(band.split('\n').some((l) => l.startsWith('&style '))).toBe(false);
  });
});

describe('the style moves the sound (#391)', () => {
  /** The cutoff each note of a voice starts at, in the order played. */
  const cutoffs = (style: string, voice: string) => {
    const plan = planOf(score(style), undefined, { resolve: resolveSeed });
    return windowAt(plan, 0, 2 - 1e-9)
      .events.filter((e) => e.voice === voice)
      .sort((a, b) => a.at - b.at || a.freq - b.freq)
      .map((e) => {
        const lpf = e.params?.lpf;
        return { at: e.at, freq: e.freq, lpf: lpf?.kind === 'points' ? lpf.points[0]!.value : NaN };
      });
  };

  it('the lead’s cutoff at energy .2 is lower than at .8, on the same notes: 1840 Hz and 3160 Hz, as Jambot’s timbreOf', () => {
    const low = cutoffs('&(map=style .5 .5 .5 .2)', 'leadV');
    const high = cutoffs('&(map=style .5 .5 .5 .8)', 'leadV');
    expect(low).toHaveLength(4);
    expect(low.map(({ at, freq }) => [at, freq])).toEqual(high.map(({ at, freq }) => [at, freq]));
    for (const [i, n] of low.entries()) expect(n.lpf).toBeLessThan(high[i]!.lpf);
    expect(low.map((n) => Math.round(n.lpf))).toEqual([1840, 1840, 1840, 1840]);
    expect(high.map((n) => Math.round(n.lpf))).toEqual([3160, 3160, 3160, 3160]);
  });

  it('the bass’s cutoff opens with articulation, from 450 Hz at legato to 900 Hz at staccato; energy leaves it', () => {
    const at = (style: string) => [...new Set(cutoffs(style, 'bassV').map((n) => Math.round(n.lpf)))];
    expect([at('&(map=style .5 .5 0 .5)'), at('&(map=style .5 .5 .5 .5)'), at('&(map=style .5 .5 1 .5)'), at('&(map=style .5 .5 1 0)')]).toEqual([[450], [675], [900], [900]]);
  });

  it('follows a section’s range, style=a..b: the lead brighter at the end of a section that gains energy', () => {
    const notes = cutoffs('&(map=style .5 .5 .5 .2)..&(map=style .5 .5 .5 .8)', 'leadV');
    expect(notes.length).toBe(4);
    expect(notes[0]!.lpf).toBeCloseTo(1840, 0);
    expect(notes.at(-1)!.lpf).toBeGreaterThan(notes[0]!.lpf);
  });

  it('moves no note MIDI out sends', () => {
    expect(sent(score('&(map=style 0 0 0 0)'))).toEqual(sent(score('&(map=style 1 1 1 1)')));
  });
});

describe('which instrument a performer plays at a style: the band’s choice, at resolution (#391)', () => {
  const EIGHT = { SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ };
  /** The instruments cells wrote for two presets' points (#366): elsewhere each performer plays its own. */
  const FOUND = {
    ELECTRO_SWING: [ELECTRO_SWING, { bass: 'upright bass', stab: 'brass stab', lead: 'clarinet' }],
    SPOOKY: [SPOOKY, { bass: 'round bass', pad: 'organ', stab: 'celesta', lead: 'theremin' }],
  } as const;

  it.each(Object.entries(EIGHT))('at %s, every performer plays its own instrument, as the band writes it', (_, point) => {
    expect(instrumentsAt(point)).toEqual({});
    expect(bandAt(point)).toBe(band);
  });

  it.each(Object.entries(FOUND))('at %s, the instruments found there, each in place of the band’s line for its voice or after them', (_, [point, ids]) => {
    const found = instrumentsAt(point);
    expect(Object.fromEntries(Object.entries(found).map(([part, f]) => [part, f.id]))).toEqual(ids);
    const text = bandAt(point);
    for (const [part, { voice, own }] of Object.entries(PERFORMER_VOICES)) {
      const line = lineOf(text, voice);
      const instrument = found[part as keyof typeof found];
      if (instrument) expect(line, part).toBe(instrument.line);
      else expect(line, part).toBe(lineOf(band, voice));
      // (one line a voice, holding its own instrument's register: MIDI out sends the same notes)
      expect(
        text.split('\n').filter((l) => l.startsWith(`&${voice} `)),
        part,
      ).toHaveLength(line ? 1 : 0);
      const own_ = lineOf(INSTRUMENT_FRAGMENTS.find((f) => f.id === own)!.text, voice)!;
      if (line) expect(/loop=(\S+)/.exec(line)![1], part).toBe(/loop=(\S+)/.exec(own_)![1]);
    }
  });

  it('reads the score’s style: a style cell, an unnamed one, a range’s first end, a mix, its axes by name', () => {
    expect(scoreStyle('&funk map=style 1 .12 .85 .75\n&style style=&funk')).toEqual(FUNK);
    expect(scoreStyle('&style style=&(map=style .55 .75 .6 .75)')).toEqual(ELECTRO_SWING);
    expect(scoreStyle('&style style=&(map=style .2 .9 .3 .35)..&(map=style .5 .5 .5 .5)')).toEqual(SPOOKY);
    expect(scoreStyle('&a map=style 0 0 0 0\n&b map=style 1 1 1 1\n&style style=[&a * .25, &b * .75]')).toEqual({ sync: 0.75, harm: 0.75, artic: 0.75, energy: 0.75 });
    expect(scoreStyle('&style style=&(map=style sync=.2 harm=.9 artic=.3 energy=.35)')).toEqual(SPOOKY);
    expect(scoreStyle('&bar meter("4/4")')).toBeNull();
    // (a style taken by name is read through the score's expansion: the seed library's `styles`, `styles.test.ts`)
    expect(scoreStyle('&style style=&funk\n&funk from styles')).toEqual(FUNK);
  });

  it('answers `band` with the band at the score’s style, the centre where it names none, and every other id as the library does', () => {
    const spooky = score('&(map=style .2 .9 .3 .35)');
    expect(resolveBand(spooky)('band')).toBe(bandAt(SPOOKY));
    expect(resolveBand(score('&(map=style .3 .45 .55 .55)'))('band')).toBe(band);
    expect(resolveBand('&bar meter("4/4")')('band')).toBe(bandAt(CENTRE));
    expect(resolveBand(spooky)('gm_kit')).toBe(resolveSeed('gm_kit'));
    // (a client's own library answers every other id)
    expect(resolveBand(spooky, (id) => (id === 'gm_kit' ? '&bd s=sine loop=A1' : resolveSeed(id)))('gm_kit')).toBe('&bd s=sine loop=A1');
  });

  it('plays the found instruments’ sounds and sends the notes the band’s own send', () => {
    const spooky = score('&(map=style .2 .9 .3 .35)');
    const found = sent(spooky, resolveBand(spooky));
    const own = sent(spooky);
    expect(found.map((n) => n.split(' ').slice(0, 5).join(' '))).toEqual(own.map((n) => n.split(' ').slice(0, 5).join(' ')));
    const r = compileSource(spooky, undefined, { resolve: resolveBand(spooky) });
    expect(r.diagnostics).toEqual([]);
    expect(r.cells.get('leadV')!.params.s).toBe(/ s=(\w+)/.exec(INSTRUMENT_FRAGMENTS.find((f) => f.id === 'theremin')!.text)![1]);
  });
});
