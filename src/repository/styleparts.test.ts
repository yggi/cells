import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRepository } from './fragments';
import { LIBRARY } from './library';
import { stylePoint } from './styles';

// A style is playable where the composer finds its parts (#542): for the six styles whose pieces the library was cut
// from (#572), each facet its piece supplies finds that piece's own part first, at the style's point, at distance 0.
const repo = createRepository(LIBRARY);

/** Each style's own parts, by facet: one id, or the ids that tie (two instruments of one style). */
const PARTS: Readonly<Record<string, Readonly<Record<string, string | readonly string[]>>>> = {
  spooky: {
    meter: 'meter(grouping=meter("5/4"))',
    rhythm: 'spooky_drums',
    bass: 'creeping_bass',
    harmony: 'dark_cadence',
    mode: 'harmonic_minor',
    stab: 'spooky_stabs',
    motif: 'diesIrae',
    instrument: ['celesta', 'organ'],
  },
  kinderlied: {
    meter: 'meter',
    rhythm: 'kinderlied_drums',
    bass: 'root_bass',
    harmony: 'vamp_to_the_fifth',
    mode: 'diatonic(mode=ionian)',
    motif: 'twinkle',
    form: 'ternary',
    instrument: ['recorder', 'sine_bass'],
  },
  acid: { meter: 'meter', rhythm: 'acid_drums', bass: 'acid_bass', harmony: 'tonic_vamp', mode: 'diatonic(mode=aeolian)', instrument: 'tb303' },
  happyHardcore: {
    meter: 'meter',
    rhythm: 'happy_hardcore_drums',
    bass: 'pumping_bass',
    harmony: 'axis_progression',
    mode: 'diatonic(mode=aeolian)',
    stab: 'rave_stabs',
    motif: 'raveHook',
    instrument: 'rave_lead',
  },
  darkAmbient: {
    meter: 'meter',
    rhythm: 'industrial_drums',
    bass: 'drone_bass',
    harmony: 'tonic_vamp',
    mode: 'diatonic(mode=aeolian)',
    motif: 'ghostPhrase',
    instrument: ['drone_pad', 'prepared_piano'],
  },
  elektro: {
    meter: 'meter',
    rhythm: 'elektro_drums',
    bass: 'octave_bass',
    harmony: 'axis_progression',
    mode: 'diatonic(mode=aeolian)',
    motif: 'sequencer',
    instrument: 'square_bass',
  },
};

describe('each style finds its own parts first, by facet (#572, #542)', () => {
  for (const [style, parts] of Object.entries(PARTS))
    it.each(Object.entries(parts))(`${style}: %s`, (facet, own) => {
      const ids = typeof own === 'string' ? [own] : own;
      const found = repo.query(stylePoint(style), ids.length, {}, { facet });
      expect(found.map((f) => [f.fragment.id, f.distance]).sort()).toEqual(ids.map((id) => [id, 0]).sort());
    });

  it('the pieces they were cut from take them by name: Spooky’s and Kinderlied’s band, tune and form', () => {
    const takes = (example: string) => [...readFileSync(`examples/${example}.md`, 'utf8').matchAll(/ from ([\w()=",/ ]+?)(?:[ (]|$)/gm)].map((m) => m[1]!.trim());
    const spooky = takes('spooky');
    for (const id of ['spooky_drums', 'creeping_bass', 'dark_cadence', 'harmonic_minor', 'diesIrae']) expect(spooky, id).toContain(id);
    const kinderlied = takes('kinderlied');
    for (const id of ['kinderlied_drums', 'root_bass', 'vamp_to_the_fifth', 'twinkle', 'ternary']) expect(kinderlied, id).toContain(id);
  });
});
