// The fragment's hash, `e2:` (decision 089 §8): the fragment as a piece receives it.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { fragmentHash, fragmentHashE1, hashIs, identityText } from './use';

const TEMPLATE = '&key from (&mode) &tonic\n&key scale(&mode, &tonic)\n&mode major\n&helper 0 1 2';
const KIT = '&bd s=sine loop=C2\n&sd s=white';

describe('e2: a fragment as a piece receives it (decision 089)', () => {
  it('is e2:, and changes on nothing a piece gets: layout, comments, a private name, its declaration’s association', () => {
    expect(fragmentHash(TEMPLATE)).toMatch(/^e2:[0-9a-f]{16}$/);
    for (const same of [
      TEMPLATE.replace('\n', '  // the key\n'),
      TEMPLATE.replaceAll('&helper', '&aid'),
      TEMPLATE.replace('&key from (&mode) &tonic', '&key from (&mode) &tonic style=(&funk | &deepHouse * .5) facet=mode'),
      `${TEMPLATE}\n&key from (&mode) &tonic style=&lofi mode=dorian`,
    ])
      expect(fragmentHash(same), same).toBe(fragmentHash(TEMPLATE));
  });

  it('changes on what a piece gets or names: a sound, a parameter’s name, a collection’s cell’s name, the kit a groove takes', () => {
    for (const other of [TEMPLATE.replace('scale(&mode, &tonic)', 'scale(&mode, &tonic, 2)'), TEMPLATE.replaceAll('&mode', '&scaleMode'), KIT.replace('&bd', '&kick')])
      expect(fragmentHash(other), other).not.toBe(fragmentHash(other === KIT.replace('&bd', '&kick') ? KIT : TEMPLATE));
    const groove = (kit: string) => `&groove from (&bd)\n&bd from ${kit}\n&groove step=4n &bd`;
    expect(fragmentHash(groove('gm_kit'))).not.toBe(fragmentHash(groove('other_kit')));
  });

  it('leaves a collection’s `* from` declaration out, all of it association', () => {
    expect(identityText(`* from style=(&funk | &techno)\n${KIT}`)).toBe(identityText(KIT));
  });

  it('numbers a template’s private names, keeps its interface and a collection’s cells by name', () => {
    expect(identityText(TEMPLATE)).toContain('&#1 0 1 2');
    expect(identityText(TEMPLATE)).toContain('&key scale(&mode, &tonic)');
    expect(identityText(KIT)).toContain('&bd s=sine');
  });

  it('still checks a recorded e1: as e1:, so no lockfile written before it warns', () => {
    expect(hashIs(fragmentHashE1(KIT), KIT)).toBe(true);
    expect(hashIs(fragmentHash(KIT), KIT)).toBe(true);
    expect(hashIs('e1:0000000000000000', KIT)).toBe(false);
    const piece = '&drums from kit\n&x step=4n &bd';
    const resolve = (id: string) => (id === 'kit' ? KIT : null);
    for (const hash of [fragmentHashE1(KIT), fragmentHash(KIT)])
      expect(compileSource(piece, undefined, { resolve, locked: [{ id: 'kit', hash }] }).diagnostics.filter((d) => /changed since/.test(d.message))).toEqual([]);
    expect(compileSource(piece, undefined, { resolve, locked: [{ id: 'kit', hash: 'e2:0000000000000000' }] }).diagnostics.some((d) => /changed since/.test(d.message))).toBe(true);
  });
});
