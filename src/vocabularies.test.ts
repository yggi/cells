// The vocabularies a text writes, as lists a frontend reads (#828): each list equals what the code reading the vocabulary accepts,
// so a role, a part, a section or a facet added without its list fails here, and no frontend keeps a copy.
import { describe, expect, it } from 'vitest';
import { compileSource } from './engine/compile';
import { GM_KIT, gmDrumNote, kitVoiceOf } from './engine/midi';
import { DRUM_ROLES, FEEL_PARTS, readerOf, ROLES, SECTION_TYPES, type FeelFrame } from './engine/perform/feel';
import { feelOf } from './engine/perform/feel';
import { backbeatOf } from './engine/vary';
import { FACETS, LIBRARY, SECTION_KINDS } from './repository/library';
import { readFileSync, readdirSync } from 'node:fs';

const unique = (list: readonly string[]) => new Set(list).size === list.length;

describe('the drum roles', () => {
  it('are nine, each once, and the set the feel reads', () => {
    expect(DRUM_ROLES).toEqual(['kick', 'backbeat', 'ghost', 'hat', 'pedal', 'euclid', 'ostinato', 'clave', 'fill']);
    expect(unique(DRUM_ROLES)).toBe(true);
    expect([...ROLES].sort()).toEqual([...DRUM_ROLES].sort());
  });

  it('are each read from a line that declares it, and a word that is none is not', () => {
    const text = (role: string) => ['&bar meter("4/4") step=120bpm', '&bd note=36 s=sine loop=A1', `&k role=${role} step=4n &bd!4`, '&out map=midi(10) [&k]'].join('\n');
    for (const role of DRUM_ROLES) {
      const r = compileSource(text(role));
      const out = r.outputs.find((o) => o.id.split(':')[2] === 'k')!;
      expect(readerOf(r)(out.id), role).toEqual({ part: 'drums', role });
    }
    const r = compileSource(text('snare'));
    expect(readerOf(r)(r.outputs.find((o) => o.id.split(':')[2] === 'k')!.id)).toBeNull();
  });
});

describe('the parts the feel keys', () => {
  it('are five, each once, and each read from a line that declares it (the drums from a role)', () => {
    expect(FEEL_PARTS).toEqual(['drums', 'bass', 'pad', 'stab', 'lead']);
    for (const part of FEEL_PARTS.filter((p) => p !== 'drums')) {
      const r = compileSource(['&bar meter("4/4") step=120bpm', `&low part=${part} step=4n 0 2`, '&v loop=C2', '&out map=midi(2) [&low * &v]'].join('\n'));
      expect(readerOf(r)(r.outputs.find((o) => o.id.split(':')[1]?.startsWith('low'))!.id), part).toEqual({ part });
    }
  });
});

describe('the section types of the feel', () => {
  it('are six, each once, and each is a section the feel plays a bar of', () => {
    expect(SECTION_TYPES).toEqual(['intro', 'groove', 'bridge', 'build', 'drop', 'breakdown']);
    for (const section of SECTION_TYPES) {
      const frame: FeelFrame = { seed: 1, bar: 0, groups: [2, 2, 2, 2], section, style: { entropy: 0.3, artic: 0.5, sync: 0.5 }, swing: { level: '8n', share: 0.5 }, energy: 0.5 };
      expect(Number.isFinite(feelOf(frame)), section).toBe(true);
    }
  });
});

describe('the library’s section kinds and facets', () => {
  it('list a kind for each file of fragments/sections, in the library’s order, the feel’s six among them', () => {
    const files = readdirSync(new URL('../fragments/sections', import.meta.url))
      .filter((f) => f.endsWith('.md'))
      .sort();
    const ids = files.map((f) => /^id: (.+)$/m.exec(readFileSync(new URL(`../fragments/sections/${f}`, import.meta.url), 'utf8'))![1]!);
    expect(SECTION_KINDS).toEqual(ids);
    expect(SECTION_KINDS).toEqual(expect.arrayContaining([...SECTION_TYPES]));
    expect(SECTION_KINDS).toHaveLength(12);
  });

  it('list every facet a fragment is associated as, each once, and no other', () => {
    expect(unique(FACETS)).toBe(true);
    expect(new Set(FACETS)).toEqual(new Set(LIBRARY.flatMap((f) => f.association.flatMap((p) => (p.facet ? [p.facet] : [])))));
    expect(FACETS).toEqual(expect.arrayContaining(['meter', 'rhythm', 'bass', 'harmony', 'section', 'song', 'style']));
  });
});

describe('the kit’s notes both ways', () => {
  it('give each General MIDI drum note its name, and each name its note', () => {
    expect(GM_KIT).toHaveLength(47);
    for (const { note, name, aliases } of GM_KIT) {
      expect(kitVoiceOf(note)).toBe(name);
      for (const n of [name, ...aliases]) expect(gmDrumNote(n), n).toBe(note);
    }
    expect(kitVoiceOf(34)).toBeNull();
    expect(kitVoiceOf(82)).toBeNull();
    // (the voices a frontend writes for the drums it plays: 36 bd, 38 sd, 42 hh, 41/45/48 the toms, 75 the claves)
    expect([36, 38, 42, 44, 46, 51, 41, 45, 48, 75].map((n) => kitVoiceOf(n))).toEqual(['bd', 'sd', 'hh', 'ph', 'oh', 'rd', 'lt', 'mt', 'ht', 'claves']);
  });
});

describe('backbeatOf', () => {
  const meter = (signature: string) => compileSource(`&bar meter("${signature}") step=120bpm`).cells.get('bar')!.meter!;

  it('gives where the backbeat falls in whole notes from the bar’s start: every beat after the downbeat of two or three, the odd ones from four up', () => {
    expect(backbeatOf(meter('4/4'))).toEqual([0.25, 0.75]);
    expect(backbeatOf(meter('3/4'))).toEqual([0.25, 0.5]);
    expect(backbeatOf(meter('6/8'))).toEqual([3 / 8]);
  });
});
