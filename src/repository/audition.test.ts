// A fragment heard alone (#640, C3 of yggi/cell-studio#621): every seed file plays through its host but the two named
// below; the host stands in for what the fragment lacks by how it reads it, never by a name it is expected to have.
import { describe, expect, it } from 'vitest';
import { planOf } from '../engine/host';
import { windowAt } from '../engine/schedule';
import { AXES } from '../engine/style';
import { audition } from './audition';
import { resolveSeed } from './library';
import { SEED } from './seed';

const O = { resolve: resolveSeed };
/** What a seed file can't play alone, and why: the band plays a score's parts, and a style only through what reads it. */
const ALONE_SILENT: Record<string, RegExp> = {
  band: /the host doesn’t compile/,
  styles: /no head plays in a host/,
};
const text = (id: string) => SEED.find((f) => f.fragment.id === id)!.fragment.text;
/** Its events over 8 s: four bars of the host's 4/4 at its two beats a second. */
const events = (t: string) => {
  const p = planOf(t, undefined, O);
  return { errors: p.result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message), n: windowAt(p, 0, 8).events.length };
};

describe('every seed file heard alone (#640)', () => {
  it.each(SEED.map((f) => f.fragment.id).filter((id) => !(id in ALONE_SILENT)))('%s plays: no error, an event in four bars', (id) => {
    const a = audition(text(id), O);
    expect(a.why).toBeUndefined();
    const { errors, n } = events(a.text);
    expect(errors).toEqual([]);
    expect(n).toBeGreaterThan(0);
  });
  it.each(Object.entries(ALONE_SILENT))('%s says why it is silent alone', (id, why) => {
    expect(audition(text(id), O).why).toMatch(why);
  });
});

describe('the host', () => {
  // (a groove that strikes the kit's drums without taking them: since #663 the seed's grooves take their own)
  const GROOVE = '&kick step=8n &bd ~ &bd ~\n&snare step=8n ~ &sd ~ &sd\n&groove [&kick, &snare]';
  it("takes a groove's drums from the kit by name, and lists what each line fills", () => {
    const a = audition(GROOVE, O);
    const kit = a.host.find((h) => / from gm_kit$/.test(h.line))!;
    expect(kit.fills).toBe('&bd, &sd');
    expect(a.host.filter((h) => h.fills === null).map((h) => h.line)).toContain('&_hv s=sine loop=C4');
    expect(a.text.startsWith(GROOVE)).toBe(true);
    expect(events(a.text)).toMatchObject({ errors: [] });
  });
  it('stands in for every sound by a voice when it is given no kit', () => {
    const a = audition(GROOVE, { ...O, kit: null });
    expect(a.host.some((h) => / from /.test(h.line))).toBe(false);
    expect(a.host.find((h) => h.fills === '&bd')!.line).toBe('&bd s=sine loop=C4');
  });
  it('a style the fragment picks from stands at the point given, the centre of each axis left out', () => {
    const axis = AXES.find((a) => new RegExp(`&style\\[${a.name}\\]`).test(text('lead')))!;
    const a = audition(text('lead'), { ...O, style: { [axis.name]: 0.8 } });
    const line = a.host.find((h) => h.fills === '&style')!.line;
    // (lead's &style is an optional parameter: the point is its argument, written over its default line)
    expect(a.text.split('\n')).toContain(line);
    expect(events(a.text).errors).toEqual([]);
    expect(line).toMatch(/^&style map=style /);
    expect(line).toContain(`${axis.name}=0.8`);
    for (const a of AXES.filter((x) => x !== axis)) expect(line).toContain(`${a.name}=${(a.range[0] + a.range[1]) / 2}`);
  });
  it("plays a template's heads, and a collection's cells that nothing else in it reads", () => {
    expect(audition(text('lowpass'), O).heads).toEqual(['lowpass']);
    expect(audition(text('techno_drums'), O).heads).toEqual(['groove']);
    // (a performer's outermost head is its role cell, which plays nothing: every head is tried)
    expect(audition(text('bass_performer'), O).why).toBeUndefined();
    const envelopes = audition(text('envelopes'), O);
    expect(envelopes.heads.length).toBeGreaterThan(3);
    expect(envelopes.host.filter((h) => / env=&/.test(h.line))).toHaveLength(envelopes.heads.length);
  });
});
