// What no operator moves, one shape at every level (#909, decision 052 point 11): `fixedStepsOf` gives each line's fixed
// steps (a kick's every step, a bass line's roots, a progression's cadence, a form's first and last slot, a kept line's
// every step), and handed back as the mask it varies every seed exactly as no mask does, variation for variation.
import { describe, expect, it } from 'vitest';
import { expand } from '../use';
import { resolveSeed } from '../../repository/library';
import { seedFragments } from '../../repository/seed';
import { FORM_OPERATORS, fixedStepsOf, HARMONY_OPERATORS, PITCHED_OPERATORS, RHYTHM_OPERATORS, variations, type VaryOptions } from '.';

const DRUMS = `&bar meter("4/4") step=120bpm\n${expand('&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit', resolveSeed).trim()}`;
const BASS = (harm: string) => `&bar meter("4/4") step=120bpm\n&key scale(major, C)\n${harm}`;
const HARMS = ['&harm over=&key step=1m [0,2,4] [5,7,9] [3,5,7] [4,6,8]', '&harm over=&key step=1m [1,3,5,7] [4,6,8,10] [0,2,4,6]'];
const KEY = '&bar meter("4/4") step=120bpm\n&key scale(major, C)';
const FORM = `${KEY}\n&a over=&key step=8n 0 2 4 2\n&call over=&key step=8n 7 5 3 1`;
const SONG = '&bar meter("4/4") step=120bpm\n&song .55';

/** Every seed of every level, on its workbench, with the options its frontend varies it by. */
const CASES: { id: string; text: string; options: VaryOptions }[] = [
  ...seedFragments('rhythms').map((f) => ({
    id: f.id,
    text: f.text,
    options: { workbench: DRUMS, keep: ['&fill'], fewest: 3, resolve: resolveSeed, operators: [...RHYTHM_OPERATORS, 'swap', 'substitute'] as const },
  })),
  ...HARMS.flatMap((harm) =>
    seedFragments('bass').map((f) => ({
      id: `${f.id} ${harm.split(' ')[3]}`,
      text: f.text,
      options: { workbench: BASS(harm), operators: [...PITCHED_OPERATORS, 'swap', 'substitute'] as const },
    })),
  ),
  ...seedFragments('harmony').map((f) => ({ id: f.id, text: f.text, options: { workbench: KEY, operators: HARMONY_OPERATORS } })),
  ...seedFragments('forms').map((f) => ({ id: f.id, text: f.text, options: { workbench: FORM, operators: FORM_OPERATORS } })),
  ...seedFragments('songs').map((f) => ({ id: f.id, text: f.text, options: { workbench: SONG, operators: FORM_OPERATORS, resolve: resolveSeed } })),
].map((c) => ({ ...c, options: { ...c.options, operators: [...c.options.operators!] } }));

describe('fixed steps, one shape at every level (#909)', () => {
  it.each(CASES.map((c) => [c.id, c] as const))('%s: its fixed steps as the mask vary it as no mask does', (_, { text, options }) => {
    const fixed = fixedStepsOf(text, options);
    const after = (o: VaryOptions) => variations(text, o).map((v) => `${v.by}\n${v.after}`);
    expect(after({ ...options, fixed })).toEqual(after(options));
  });

  it('a kick is every step fixed, a kept fill every step, a hat none', () => {
    const funk = seedFragments('rhythms').find((f) => f.id === 'funk_drums')!;
    const fixed = fixedStepsOf(funk.text, { workbench: DRUMS, keep: ['&fill'], resolve: resolveSeed });
    expect(fixed['&kick']).toEqual(Array.from({ length: 16 }, (_, s) => s));
    expect(Object.entries(fixed).filter(([, steps]) => steps.length === 0).length).toBeGreaterThan(0);
  });

  it('a bass line its roots, a progression its cadence, a form its first and last slot, a song plan its intro and outro', () => {
    const walking = seedFragments('bass').find((f) => f.id === 'walking_bass')!;
    expect(fixedStepsOf(walking.text, { workbench: BASS(HARMS[0]!) })['&bassline']).toEqual([0]);
    const cadence = seedFragments('harmony').find((f) => f.id === 'dark_cadence')!;
    expect(fixedStepsOf(cadence.text, { workbench: KEY })).toEqual({ '&harm': [3] });
    const aaba = seedFragments('forms').find((f) => f.id === 'AABA')!;
    expect(fixedStepsOf(aaba.text, { workbench: FORM })['&chorus']).toEqual([0, 3]);
    const song = seedFragments('songs').find((f) => f.id === 'verse_chorus')!;
    expect(fixedStepsOf(song.text, { workbench: SONG, resolve: resolveSeed })['&verseChorus']).toEqual([0, 7]);
  });

  it('the options move them: a kept progression is every slot fixed, a mask replaces a level’s own', () => {
    const cadence = seedFragments('harmony').find((f) => f.id === 'dark_cadence')!;
    expect(fixedStepsOf(cadence.text, { workbench: KEY, keep: ['harm'] })).toEqual({ '&harm': [0, 1, 2, 3] });
    expect(fixedStepsOf(cadence.text, { workbench: KEY, fixed: { '&harm': [0, -1] } })).toEqual({ '&harm': [0, 3] });
    expect(variations(cadence.text, { workbench: KEY, operators: HARMONY_OPERATORS, keep: ['&harm'] })).toEqual([]);
  });
});
