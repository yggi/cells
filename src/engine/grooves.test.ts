import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { eventsBetween, plan } from './realize';
import { codeShifts } from './program';
import { buildGraph } from '../layout/drawn';
import { shorten } from './shorten';
import { liveAt } from './live';
import { cellId } from './ids';

const voices =
  '&bar scan(1 1 1 1) step=120bpm\n&bd s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)\n&hh s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)\n&sd s=white hpf=1500 env=&(map=adsr 0 .1 0 .04)\n';
const plays = (src: string) => {
  const r = compileSource(src);
  expect(r.diagnostics).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, 8)
    .map((e) => `${e.voice} ${e.at.toFixed(4)} ${e.dur.toFixed(4)} ${e.freq.toFixed(2)} ${e.gains}`)
    .sort();
};

describe('a stepped braid of voices plays them (#10 F4)', () => {
  it('plays what the same pattern read by number through a kit plays: chords, ratchets, rests, chance', () => {
    const groove = plays(voices + '&groove step=&bar*2 &bd &hh [&bd,&sd] &hh*2 ~ &hh &sd? &hh!2\n&out map=sample [&groove * .6]');
    const kit = plays(voices + '&kit &bd &hh &sd\n&groove over=&kit step=&bar*2 0 1 [0,2] 1*2 ~ 1 2? 1!2\n&out map=sample [&groove * .6]');
    expect(groove).toEqual(kit);
    expect(groove.some((e) => e.startsWith('sd '))).toBe(true);
  });
  it('is a signal: mixed as it is, with volumes acting on it', () => {
    const r = compileSource(voices + '&acc map=amp step=&bar*2 1 .5\n&groove step=&bar*2 &bd &hh\n&out map=sample [&groove * &acc * .5]');
    expect(r.diagnostics).toEqual([]);
    expect(r.outputs).toHaveLength(1);
    expect(r.outputs[0].levels.map((l) => l.cell)).toEqual(['acc']);
  });
  it("draws what is written: a wire from each voice named to the pattern, from its piece on the drums' kit", () => {
    const r = compileSource(voices + '&groove step=&bar*2 &bd &hh &bd &sd\n&out map=sample [&groove]');
    const g = buildGraph(r);
    // (the kit the grooves read is drawn, the voices only they play its pieces: no node of their own)
    expect(g.nodes.some((n) => n.id === 'cell:kit:voices')).toBe(true);
    expect(['bd', 'hh', 'sd'].every((v) => g.bulbs.get(v) === 'kit:voices')).toBe(true);
    // (each name written is still one wire, from its piece)
    expect(g.edges.filter((e) => e.port === 'braid' && e.to === 'cell:groove').map((e) => [e.bulb, e.count])).toEqual([
      ['bd', 2],
      ['hh', 1],
      ['sd', 1],
    ]);
  });
  it('an unstepped braid of voices is still a kit, and a stepped braid of anything else is still a melody', () => {
    expect(compileSource(voices + '&kit &bd &hh\n&d over=&kit step=&bar 0 1\n&out map=sample [&d]').diagnostics).toEqual([]);
    const melody = compileSource(voices + '&m 0 4\n&t step=&bar &m 7\n&out map=sample [&t * &bd]');
    expect(melody.diagnostics).toEqual([]);
    expect(melody.cells.get('t')!.over).toBeNull();
  });
  it('drum motifs: an unstepped braid of voices a groove splices, reversed or not, nested, shared by two grooves', () => {
    const grooves = plays(
      voices + '&fill &sd &sd*2 ~ &hh\n&bar2 &bd ~ &fill\n&a step=&bar*4 &bar2 &fill[::-1]\n&b step=&bar*2 [&bd,&hh] &fill\n&out map=sample [&a * .6, &b * .3]',
    );
    const kit = plays(
      voices +
        '&kit &sd &hh &bd\n&fill 0 0*2 ~ 1\n&bar2 2 ~ &fill\n&a over=&kit step=&bar*4 &bar2 &fill[::-1]\n&b over=&kit step=&bar*2 [2,1] &fill\n&out map=sample [&a * .6, &b * .3]',
    );
    expect(grooves).toEqual(kit);
  });
  it('a braid of voices read with over= stays a kit, read by number', () => {
    const r = compileSource(voices + '&kit &bd &hh\n&d over=&kit step=&bar 1 0\n&g step=&bar &hh &bd\n&out map=sample [&d, &g]');
    expect(r.diagnostics).toEqual([]);
    expect(r.cells.get('kit')!.implicit).toBe(false);
    expect(r.cells.get('d')!.over).toBe('kit');
  });
  it('Shorten leaves its steps alone (they are names, not numbers)', () => {
    const src = voices + '&groove step=&bar*4 &bd ~ &hh ~ &sd ~ &hh ~ &bd ~ &hh ~ &sd ~ &hh ~ &bd &bd\n&out map=sample [&groove]';
    expect(shorten(src)).toEqual([]);
  });
});

describe('pan= on a voice: where it sits in stereo (#10 F3)', () => {
  const tune = '&t step=2 0 4 7\n';
  const gains = (src: string) => {
    const r = compileSource(src);
    expect(r.diagnostics).toEqual([]);
    return eventsBetween(plan(r, codeShifts(r)), 0, 1.4).map((e) => `${e.voice} ${e.gains.map((g) => g.toFixed(4))}`);
  };
  it('.5 is the centre, as without it; 0 is left, 1 right; between, the far side fades', () => {
    const at = (pan: string) => gains(tune + `&v s=sine loop=C4 ${pan}\n&out map=sample [&t * &v * .5]`)[0];
    expect(at('pan=.5')).toBe(at(''));
    expect(at('pan=0')).toBe('v 0.5000,0.0000');
    expect(at('pan=1')).toBe('v 0.0000,0.5000');
    expect(at('pan=.25')).toBe('v 0.5000,0.2500');
  });
  it('one chord with panned voices plays what two chords with different gains play', () => {
    const two = gains(tune + '&a s=sine loop=C4\n&b s=tri loop=C3\n&out map=sample [&t * &a * .2, &t * &b * .4] [&t * &a * .1, &t * &b * .1]');
    const one = gains(tune + '&a s=sine loop=C4 pan=.25\n&b s=tri loop=C3 pan=.125\n&out map=sample [&t * &a * .2, &t * &b * .4]');
    expect(one).toEqual(two);
  });
  it('a kit’s members each sit where their pan= says', () => {
    const g = gains(voices.replace('hpf=8000', 'hpf=8000 pan=1') + '&groove step=&bar*2 &bd &hh\n&out map=sample [&groove * .6]');
    expect(g.slice(0, 2)).toEqual(['bd 0.6000,0.6000', 'hh 0.0000,0.6000']);
  });
});

describe('a kit read only selects: the rest of the product acts on the member it picks (decision 029)', () => {
  const notes = (src: string, to = 4) => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    return eventsBetween(plan(r, codeShifts(r)), 0, to - 1e-6).map((e) => `${e.voice} ${e.at.toFixed(2)} ${e.freq.toFixed(2)}`);
  };
  const band = '&bar scan(1 1 1 1) step=120bpm\n&lead s=saw loop=C4\n&organ s=square loop=C3\n&band &lead &organ\n';
  it('orchestration: a melody played on the voice a kit pattern picks (#29), the finer term starting notes', () => {
    const src = band + '&orch over=&band step=&bar/4 0 1\n&theme step=&bar 0 2 4 5\n&out map=sample [&theme * &orch * .5]';
    expect(notes(src)).toEqual([
      'lead 0.00 261.63',
      'lead 0.50 293.66',
      'lead 1.00 329.63',
      'lead 1.50 349.23',
      'organ 2.00 130.81',
      'organ 2.50 146.83',
      'organ 3.00 164.81',
      'organ 3.50 174.61',
    ]);
    // the factors commute
    expect(notes(src.replace('[&theme * &orch * .5]', '[.5 * &orch * &theme]'))).toEqual(notes(src));
    // the live view lights the member the kit read picks now
    const r = compileSource(src);
    const live = (t: number) => [...liveAt(r, codeShifts(r), new Set(), t).voices].filter((v) => v.includes('lead') || v.includes('organ'));
    expect(live(0.7)).toEqual([cellId('lead')]);
    expect(live(2.7)).toEqual([cellId('organ')]);
  });
  it('a pitch held under a drum pattern transposes the member it picks; a number in the sum too', () => {
    const src = voices + '&kit &bd &hh\n&drums over=&kit step=&bar 0 0 0 0\n&key step=&bar/4 0 7\n&out map=sample [&drums * &key]';
    const bd = (f: number) => (55 * Math.pow(2, f / 12)).toFixed(2);
    expect(notes(src).map((n) => n.split(' ')[2])).toEqual([0, 0, 0, 0, 7, 7, 7, 7].map(bd));
    expect(notes(src.replace('[&drums * &key]', '[(&key + 12) * &drums]')).map((n) => n.split(' ')[2])).toEqual([12, 12, 12, 12, 19, 19, 19, 19].map(bd));
  });
  it('varispeed on a clock bends a kit member as it bends the voice played alone', () => {
    const tape = '&bar scan(1 1 1 1) step=78bpm motor=1.4 mass=1 friction=.3 varispeed=1\n&bd s=sine loop=A1\n&hh s=white\n';
    const groove = notes(tape + '&g step=&bar &bd &bd &hh &bd\n&out map=sample [&g * .5]', 6).filter((n) => n.startsWith('bd'));
    const alone = notes(tape + '&k step=&bar 0 0 ~ 0\n&out map=sample [&k * &bd * .5]', 6);
    expect(groove).toEqual(alone);
    expect(groove[0]).not.toBe('bd 0.00 55.00'); // (spinning up from rest: below its pitch)
  });
  it('plain drums: nothing changes, each member at its own pitch', () => {
    const src = voices + '&kit &bd &hh\n&drums over=&kit step=&bar 0 1 0 1\n&out map=sample [&drums * .6]';
    expect(notes(src, 2)).toEqual(['bd 0.00 55.00', 'hh 0.50 261.63', 'bd 1.00 55.00', 'hh 1.50 261.63']);
  });
});
