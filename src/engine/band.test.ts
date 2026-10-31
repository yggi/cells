import { describe, expect, it } from 'vitest';
import { compileSource as compiledWithOldUse } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { resolveSeed } from '../repository/library';

// (these texts take fragments the old way, `use`, which still reads for a release and warns that it is the old way,
// decision 065: what is tested here is what it reads, so that warning is set aside; `from.test.ts` tests the new way)
const OLD_USE = /^use is the old way/;
const compileSource = (...args: Parameters<typeof compiledWithOldUse>): ReturnType<typeof compiledWithOldUse> => {
  const r = compiledWithOldUse(...args);
  const diagnostics = r.diagnostics.filter((d) => !OLD_USE.test(d.message));
  return { ...r, diagnostics, ok: !diagnostics.some((d) => d.severity === 'error') };
};

// Decision 061: a band is a table of performers, gates or role cells; a selector reading it switches their sound, and
// their parts keep their time on the meter (restart=free, a performer's default), so they swing as they did.
const PIECE = `&bar meter("4/4") step=120bpm swing=8n:2/3
&key scale(major, G)
&violinV s=saw loop=G4
&secondV s=saw loop=G4
&violaV s=saw loop=D4
&celloV s=saw loop=G2
&melody over=&key step=8n 0 2 4 5 4 2 0 1
&harmony over=&key step=4n -3 0 -1 0
&walk over=&key step=4n 0 1 2 3 4 5 6 7 8 9 10 11
&violin play=&melody level=.8 &violinV
&violin2 play=&harmony^$-12 level=.5 &secondV
&viola play=&harmony level=.5 &violaV
&cellist play=&walk &celloV
&out map=sample [&violin, &violin2, &viola, &cellist]
`;
const BAND = '&lead map=role &violin\n&comp map=role &violin2 &viola\n&band &lead &comp &cellist\n';
// (a bar is two seconds)
const BAR = 2;

const compiled = (src: string) => compileSource(PIECE + src, undefined, { resolve: resolveSeed });
const played = (src: string, bars = 4) => {
  const r = compiled(src);
  // (each note as its voice, one a player, its onset and its pitch)
  return eventsBetween(plan(r, codeShifts(r)), 0, bars * BAR - 1e-9).map((e) => `${e.voice} ${Math.round(e.at * 1e4) / 1e4} ${Math.round(e.freq * 100) / 100}`);
};
/** What the piece plays unswitched, in the bars each part is given (by voice, the bars it plays in). */
const within = (on: Record<string, readonly number[]>, bars = 4) =>
  played('', bars).filter((e) => {
    const [part, at] = e.split(' ');
    return (on[part] ?? []).includes(Math.floor(Number(at) / BAR + 1e-9));
  });
const bar = (e: string) => Math.floor(Number(e.split(' ')[1]) / BAR + 1e-9);
const messages = (src: string) => compiled(src).diagnostics.map((d) => `${d.severity}: ${d.message}`);

describe('a band: a selector over the performers (decision 061)', () => {
  it('compiles: a table of performers is a band, and nothing warns', () => {
    expect(messages(BAND + '&form over=&band step=1m [0,2] [0,1,2] ~ 1')).toEqual([]);
  });

  it('plays each performer in the bars its entry is picked, as it plays unswitched there: its swing, its place in its part', () => {
    // (bar 0: the lead and the cellist; bar 1: all; bar 2: no one; bar 3: the comp, its two players)
    expect(played(BAND + '&form over=&band step=1m [0,2] [0,1,2] ~ 1')).toEqual(within({ violinV: [0, 1], celloV: [0, 1], secondV: [1, 3], violaV: [1, 3] }));
  });

  it('a role switches all its players, and a gate named itself is switched alone', () => {
    const roles = played('&comp map=role &violin2 &viola\n&band &comp &violin\n&form over=&band step=1m 0 1');
    // (the comp, the violin's second player and the viola, in bars 0 and 2; the violin itself in bars 1 and 3; the cellist,
    // in no band, all the time)
    const parts = (b: number) => [...new Set(roles.filter((e) => bar(e) === b).map((e) => e.split(' ')[0]))].sort();
    expect([0, 1, 2, 3].map(parts)).toEqual([
      ['celloV', 'secondV', 'violaV'],
      ['celloV', 'violinV'],
      ['celloV', 'secondV', 'violaV'],
      ['celloV', 'violinV'],
    ]);
  });

  it('runs a part on while it sits out (restart=free, the default): it comes back where an unswitched copy is', () => {
    // (the walk is three bars long: in bar 3 it is at its top again, and in bar 2, back in, at its third bar)
    const free = played('&band &cellist\n&form over=&band step=1m 0 ~ 0 0');
    expect(free.filter((e) => e.startsWith('celloV'))).toEqual(within({ celloV: [0, 2, 3] }));
  });

  it('restart=restart starts it from its top at each switch, and resume where it stopped', () => {
    const notes = (src: string) => played(src).filter((e) => e.startsWith('celloV'));
    const all = notes('');
    // (bar 2, back in: the walk's first bar again, restarted; where bar 1 would have been, resumed)
    const restart = notes('&band &cellist\n&form over=&band step=1m restart=restart 0 ~ 0 ~');
    const resume = notes('&band &cellist\n&form over=&band step=1m restart=resume 0 ~ 0 ~');
    const freqs = (xs: string[]) => xs.map((x) => x.split(' ')[2]);
    expect(freqs(restart)).toEqual([...freqs(all.slice(0, 4)), ...freqs(all.slice(0, 4))]);
    expect(freqs(resume)).toEqual([...freqs(all.slice(0, 4)), ...freqs(all.slice(4, 8))]);
  });

  it('warns where a performer restarted or resumed is switched off the bar, and not where it runs on', () => {
    const off =
      "&form switches &cellist with restart=restart off the bar: its part starts where the switch falls, not on a bar line, so its notes move in the bar. Switch on whole bars (step=1m), or let it run on (restart=free, a performer's default)";
    expect(messages('&band &cellist\n&form over=&band step=2n restart=restart 0 ~')).toEqual([`warning: ${off}`]);
    expect(messages('&band &cellist\n&form over=&band step=2n 0 ~')).toEqual([]);
    expect(messages('&band &cellist\n&form over=&band step=1m/2 restart=resume 0 ~')).toEqual([]);
  });

  it('refuses a gate in a band twice, and says a band needs no step=', () => {
    expect(messages('&comp map=role &violin2 &viola\n&band &comp &viola\n&form over=&band step=1m 0 1')).toEqual([
      'error: &viola is in &band twice, as &comp and as &viola: a performer is one entry of a band',
    ]);
    expect(messages('&band step=1m &violin &cellist\n&form over=&band step=1m 0 1')).toEqual([
      'warning: &band is a band, a table of performers: it needs no step=, the selector reading it steps (their parts keep their time)',
    ]);
  });

  it('arranges a part a text uses as it is used: the bass player, its walk from the library, out for the second bar', () => {
    const score = (form: string) =>
      [
        'use * from "bass performer"',
        'use &bassline from "walking bass"',
        '&bar meter("4/4") step=120bpm swing=8n:2/3',
        '&key scale(dorian, D)',
        '&harm over=&key step=1m [0,2,4] [3,5,7]',
        '&bassLevel map=amp .8',
        '&style style=&(map=style .5 .5 .5 .5)',
        form,
        '&out map=midi ~ &bassOut',
        // (heard on a sound card too: the bass has a sound of its own, which MIDI doesn't send, #391)
        '&hear map=sample [&bassOut]',
      ].join('\n');
    const at = (src: string) => {
      const r = compileSource(src, undefined, { resolve: resolveSeed });
      expect(r.diagnostics.map((d) => d.message)).toEqual([]);
      return eventsBetween(plan(r, codeShifts(r)), 0, 4 * BAR - 1e-9).map((e) => `${Math.round(e.at * 1e4) / 1e4} ${Math.round(e.freq * 100) / 100}`);
    };
    const all = at(score(''));
    expect(at(score('&band &bass\n&form over=&band step=1m 0 ~'))).toEqual(all.filter((e) => Math.floor(Number(e.split(' ')[0]) / BAR) % 2 === 0));
  });
  it('keeps a part a section steps as the section plays it, where a band only keeps it on (the section restarts it)', () => {
    const song = `&bar scan(1 1 1 1) step=120bpm
&major scale(major)
&sections step=4n &keysBar &tuneBar &drumBar
&song over=&sections step=1m/4 laps=1 0 [0,1] [0,2] [0,1,2] 0
&chords over=&major step=&keysBar/4 [0,2,4] [3,5,7] [4,6,8] [0,2,4]
&tune over=&major step=&tuneBar*2 4 4 5 7 9
&kick step=&drumBar 0 ~ 0 ~
&keys s=tri loop=C4
&lead s=square loop=C5
&bd s=sine loop=A1
&player play=&tune &lead
&out map=sample [&chords * &keys * .15, &player * .2, &kick * &bd * .6]
`;
    const notes = (src: string) => {
      const r = compileSource(src);
      expect(r.diagnostics.map((d) => d.message)).toEqual([]);
      return eventsBetween(plan(r, codeShifts(r)), 0, 40).map((e) => `${e.voice} ${Math.round(e.at * 1e4) / 1e4} ${Math.round(e.freq)}`);
    };
    expect(notes(song + '&band &player\n&form over=&band step=1m 0')).toEqual(notes(song));
  });
});
