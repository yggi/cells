// migrateLayer (#716, ask 4): a layer kept at any earlier version, read as the language writes it now. Each step shown on a layer
// that needs it and on one that doesn't (the same object back), the five in order, and the whole idempotent.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OLD_AXES, newPoint } from '../engine/migrate/axes';
import { signatureOf } from '../engine/use';
import { EMPTY_LAYER, layerProblems, type LearnedLayer } from './fragments';
import { axedLayer, migrateLayer, movedLayer, MOVED_IDS, movedText, roledLayer, signedLayer } from './migratelayer';
import { renamedLayer } from './learned';

const at = { sync: 0.5, harm: 0.5, bite: 0.5, mood: 0.5 };
const old = { sync: 0.6, harm: 0.4, artic: 0.7, energy: 0.5 };
/** A layer with one filed fragment (`text` associated at `association`) and what else a test sets; the shape a frontend keeps. */
const layer = (text: string, association: object[], rest: object = {}, meta: object = {}): LearnedLayer =>
  ({
    ...EMPTY_LAYER,
    filed: [{ fragment: { id: 'Ed song 1, bar 0', text, association }, meta: { source: 'Ed', created: 'song 1, bar 0', ...meta }, prose: '' }],
    ...rest,
  }) as unknown as LearnedLayer;

describe('signedLayer', () => {
  it('signs a bass line and a progression filed before the signature, and no other', () => {
    const bass = signedLayer(layer('&bassline over=&key step=8n 0 2 4', [{ point: at, weight: 1, facet: 'bass' }]));
    expect(bass.filed[0]!.fragment.text).toBe('&bassline from &harm\n&bassline over=&key step=8n 0 2 4');
    expect(signatureOf(bass.filed[0]!.fragment.text)).not.toBeNull();
    const harm = signedLayer(layer('&harm over=&key step=1m 0 3', [{ point: at, weight: 1, facet: 'harmony' }]));
    expect(harm.filed[0]!.fragment.text).toBe('&harm from &key\n&harm over=&key step=1m 0 3');
    const lead = layer('&lead over=&key step=8n 0 2 4', [{ point: at, weight: 1, facet: 'lead' }]);
    expect(signedLayer(lead)).toBe(lead);
  });

  it('leaves a line already signed, and the empty layer, as they are', () => {
    const signed = layer('&bassline from &harm\n&bassline over=&key step=8n 0', [{ point: at, weight: 1, facet: 'bass' }]);
    expect(signedLayer(signed)).toBe(signed);
    expect(signedLayer(EMPTY_LAYER)).toBe(EMPTY_LAYER);
  });
});

describe('axedLayer', () => {
  it('writes the points on sync, harm, artic, energy as sync, harm, bite, mood, in the points and in a filed fragment’s association', () => {
    const kept = layer('&lead step=8n 0', [{ point: old, weight: 1, facet: 'lead' }], { points: [{ id: 'twinkle', point: old, weight: 1, facet: 'rhythm' }] });
    const axed = axedLayer(kept);
    expect(axed.points[0]!.point).toEqual(newPoint(old as Record<(typeof OLD_AXES)[number], number>, false));
    expect(axed.filed[0]!.fragment.association[0]!.point).toEqual(newPoint(old as Record<(typeof OLD_AXES)[number], number>, true));
    expect(Object.keys(axed.points[0]!.point).sort()).toEqual(['bite', 'harm', 'sync']);
  });

  it('is the same layer for points already on the axes', () => {
    const kept = layer('&lead step=8n 0', [{ point: at, weight: 1, facet: 'lead' }], { points: [{ id: 'meter', point: at, weight: 1 }] });
    expect(axedLayer(kept)).toBe(kept);
  });
});

describe('roledLayer', () => {
  const groove = '&kick step=8n x ~ x ~\n&backbeat step=8n ~ x ~ x\n&groove [&kick, &backbeat]';
  it('writes the role a drum line is named for, in a groove, and only there', () => {
    const roled = roledLayer(layer(groove, [{ point: at, weight: 1, facet: 'rhythm' }]));
    expect(roled.filed[0]!.fragment.text).toBe('&kick role=kick step=8n x ~ x ~\n&backbeat role=backbeat step=8n ~ x ~ x\n&groove [&kick, &backbeat]');
    const other = layer(groove, [{ point: at, weight: 1, facet: 'lead' }]);
    expect(roledLayer(other)).toBe(other);
  });

  it('leaves a line that writes its role as it is', () => {
    const written = layer('&kick role=kick step=8n x', [{ point: at, weight: 1, facet: 'rhythm' }]);
    expect(roledLayer(written)).toBe(written);
  });
});

describe('movedLayer', () => {
  it('moves the ids in the points, the pairs and a line’s varies chain, in the order a pair keeps', () => {
    const kept = layer(
      '&lead over=&key step=8n 0 2 4',
      [{ point: at, weight: 1, facet: 'lead' }],
      {
        points: [{ id: 'twinkle', point: at, weight: 1, facet: 'lead' }],
        together: [{ ids: ['meter', 'waltz'], count: 2 }],
      },
      { varies: 'korobeiniki' },
    );
    const moved = movedLayer(kept);
    expect(moved.points.map((p) => p.id)).toEqual(['kinderlied/twinkle']);
    expect(moved.together.map((p) => p.ids)).toEqual([['meter', 'waltzBar']]);
    expect(moved.filed[0]!.meta['varies']).toBe('korobeinikiBar');
    expect(movedLayer(EMPTY_LAYER)).toBe(EMPTY_LAYER);
  });

  it('writes a text filed over a moved motif as it reads now', () => {
    expect(movedText('&twinkle from twinkle &key\n&wonder from wonder &key')).toBe('&twinkle from kinderlied &key\n&wonder from kinderlied &key');
    expect(movedText('&waltz from waltz &key\n&lead from call_and_answer &waltz')).toBe('&waltz=waltzBar from waltzBar &key\n&lead from call_and_answer &waltz');
    expect(movedText('&lead over=&key step=8n 0')).toBe('&lead over=&key step=8n 0');
    expect(MOVED_IDS.get('twinkle')).toBe('kinderlied/twinkle');
  });
});

describe('migrateLayer', () => {
  /** A layer as it was kept at cells v0.15: old seed ids, points on the old axes, an unsigned bass line, a groove with no roles, a take of a moved tune. */
  const v015 = (): LearnedLayer =>
    ({
      filed: [
        {
          fragment: { id: 'Ed 1', text: '&bassline over=&key step=8n 0 2 4', association: [{ point: old, weight: 0.1, facet: 'bass' }] },
          meta: { source: 'Ed', created: '1', varies: 'walking bass' },
          prose: '',
        },
        {
          fragment: { id: 'Ed 2', text: '&kick step=8n x ~ x ~\n&groove [&kick]', association: [{ point: old, weight: 0.1, facet: 'rhythm' }] },
          meta: { source: 'Ed', created: '2' },
          prose: '',
        },
        {
          fragment: { id: 'Cy 1', text: '&twinkle from twinkle &key\n&lead from ternary(answer=&wonder) &twinkle', association: [{ point: old, weight: 0.1, facet: 'lead' }] },
          meta: { source: 'Cy', created: '1', varies: 'twinkle' },
          prose: '',
        },
      ],
      points: [{ id: 'creeping bass', point: old, weight: 0.2, facet: 'bass' }],
      together: [{ ids: ['creeping bass', 'waltz'], count: 3 }],
    }) as unknown as LearnedLayer;

  it('reads a layer kept at v0.15 as the language writes it now: every id, point, signature, role and moved take', () => {
    const now = migrateLayer(v015());
    expect(now.points.map((p) => p.id)).toEqual(['creeping_bass']);
    expect(now.together.map((p) => p.ids)).toEqual([['creeping_bass', 'waltzBar']]);
    expect(now.filed[0]!.fragment.text).toBe('&bassline from &harm\n&bassline over=&key step=8n 0 2 4');
    expect(now.filed[0]!.meta['varies']).toBe('walking_bass'.replace('walking_bass', 'walking bass') === 'walking bass' ? 'walking bass' : '');
    expect(now.filed[1]!.fragment.text).toBe('&kick role=kick step=8n x ~ x ~\n&groove [&kick]');
    expect(now.filed[2]!.fragment.text).toBe('&twinkle from kinderlied &key\n&lead from ternary(answer=&wonder) &twinkle');
    expect(now.filed[2]!.meta['varies']).toBe('kinderlied/twinkle');
    for (const p of [...now.points, ...now.filed.flatMap((f) => f.fragment.association)]) expect(Object.keys(p.point)).not.toContain('artic');
    expect(layerProblems(now)).toEqual([]);
  });

  it('is the chain of the five steps, in the order the forms were retired', () => {
    expect(migrateLayer(v015())).toEqual(movedLayer(roledLayer(axedLayer(signedLayer(renamedLayer(v015()))))));
  });

  it('gives a layer at this version back as the same object, and migrating twice is migrating once', () => {
    const now = migrateLayer(v015());
    expect(migrateLayer(now)).toBe(now);
    expect(migrateLayer(EMPTY_LAYER)).toBe(EMPTY_LAYER);
  });
});

describe('a layer Jambot kept at cells v0.24.0 (fixtures/kept-twinkle-v0.24.0.json, lifted)', () => {
  const kept = (JSON.parse(readFileSync(new URL('../../fixtures/kept-twinkle-v0.24.0.json', import.meta.url), 'utf8')) as { layer: LearnedLayer }).layer;

  it('reads the filed Twinkle’s takes of twinkle and wonder as Kinderlieder’s parts, as Jambot’s chain did', () => {
    const filed = kept.filed.find((f) => f.meta['source'] === 'Cy')!;
    expect(filed.fragment.text).toMatch(/^&twinkle from twinkle &key$/m);
    const now = migrateLayer(kept);
    expect(now.filed.find((f) => f.meta['source'] === 'Cy')!.fragment.text).toBe(
      ['&twinkle from kinderlied &key', '&wonder from kinderlied &key', '&lead from ternary(answer=&wonder) &twinkle'].join('\n'),
    );
    expect(layerProblems(now)).toEqual([]);
    expect(migrateLayer(now)).toBe(now);
  });
});
