/**
 * A learned layer read as the language writes it now, whenever it was kept (#716, ask 4): the counterpart of `migrate`
 * for the layer a frontend keeps and hands to each query (`LearnedLayer`). A frontend that kept a layer through several
 * releases had to chain these steps itself, one for each change of ids, signatures, axes, roles and moved fragments;
 * `migrateLayer` is the chain, every step cells', each one also exported for a test that wants it alone. A layer that
 * needs a step is returned changed, one that doesn't as the same object, so a frontend can tell by `===` whether it
 * must keep it again. Pure.
 *
 * The steps, in the order the forms were retired:
 * - `renamedLayer` (`learned.ts`): its seed ids as the words they are since cells v0.16.0 (#387);
 * - `signedLayer`: its bass lines and progressions with the signature they are stated with since v0.21.0 (#562);
 * - `axedLayer`: its points on the style axes `sync harm bite mood` since v0.23.0 (decision 076), as Migrate's rule
 *   `axes` moves a library's;
 * - `roledLayer`: its grooves with each line's drum role written as a value since v0.24.0 (decision 075);
 * - `movedLayer`: the fragments v0.25.0 moved by their ids now, Kinderlieder's tunes its parts and two motifs renamed
 *   with their heads (decision 082), in its points, pairs, a filed line's `varies` and the texts it filed over them.
 *
 * What a frontend retired of its own (a voice and card a line carried before a change of the frontend's) is the
 * frontend's to drop, before or after: it touches no id, point or role, so either order gives the same layer.
 *
 * Lifted from yggi/jambot packages/engine/src/repository.ts (`keptLayer`, `axedLayer`, `movedLayer`, `movedText`),
 * muse-groove.ts (`roledLayer`) and taken.ts (`signedLayer`) @ d52f259.
 */
import { movedIds } from '../engine/migrate/moved';
import { OLD_AXES, newPoint } from '../engine/migrate/axes';
import { MOVED } from '../engine/renamed';
import { ROLES } from '../engine/perform/feel';
import { signatureOf } from '../engine/use';
import { byId, type LearnedLayer, type WeightedPoint } from './fragments';
import { renamedLayer } from './learned';
import { resolveSeed } from './library';

type Filed = LearnedLayer['filed'][number];

/** The layer with `step` applied to each filed fragment's file, the layer itself where none changed. */
function eachFiled(layer: LearnedLayer, step: (file: Filed) => Filed): LearnedLayer {
  const filed = layer.filed.map(step);
  return filed.every((file, i) => file === layer.filed[i]) ? layer : { ...layer, filed };
}

/** The signature each facet's stated lines are written with, by facet and head. */
const SIGNED: readonly { readonly facet: string; readonly head: string; readonly signature: string }[] = [
  { facet: 'bass', head: '&bassline', signature: '&bassline from &harm' },
  { facet: 'harmony', head: '&harm', signature: '&harm from &key' },
];

/**
 * A layer's bass lines and progressions with the signature they are stated with since cells v0.21.0 (#562), for one filed
 * before: identity keeps the names a signature declares, so a line heard again is known as the one filed only once both
 * are templates. A layer with none to sign is returned as it is.
 */
export function signedLayer(layer: LearnedLayer): LearnedLayer {
  return eachFiled(layer, (file) => {
    const { text, association } = file.fragment;
    const as = SIGNED.find((s) => association.some((p) => p.facet === s.facet) && text.startsWith(`${s.head} `));
    return as && !signatureOf(text) ? { ...file, fragment: { ...file.fragment, text: `${as.signature}\n${text}` } } : file;
  });
}

/** The facets a point speaks to mood for (decision 076 §2): a tonal fragment's; a meter's or a rhythm's has none. */
const MOODY = new Set(['bass', 'harmony', 'lead', 'motif', 'mode', 'stab', 'instrument']);

/**
 * A layer's points written on the style axes before cells v0.23.0, `sync harm artic energy`, on the axes now, as Migrate
 * moved the library's (`newPoint`, its rule `axes`, decision 076): `bite` the articulation, energy dropped, and a tonal
 * facet's `mood` read where the old point sits. A layer kept since is the layer itself.
 */
export function axedLayer(layer: LearnedLayer): LearnedLayer {
  const old = (point: WeightedPoint['point']) => OLD_AXES.every((a) => typeof point[a] === 'number');
  const moved = <P extends WeightedPoint>(p: P): P =>
    old(p.point) ? { ...p, point: newPoint(p.point as Record<(typeof OLD_AXES)[number], number>, p.facet !== undefined && MOODY.has(p.facet)) } : p;
  if (![...layer.points, ...layer.filed.flatMap((f) => f.fragment.association)].some((p) => old(p.point))) return layer;
  return {
    ...layer,
    points: layer.points.map(moved),
    filed: layer.filed.map((file) => ({ ...file, fragment: { ...file.fragment, association: file.fragment.association.map(moved) } })),
  };
}

/** A line of a groove named as a drum role that writes no `role=`: its name, and where the role goes. */
const UNROLED = new RegExp(`^&(${[...ROLES].join('|')}) (?!.*\\brole=)`, 'gm');

/**
 * A layer's grooves with each line's drum role written as a value (`&kick role=kick …`), as a groove is stated since
 * cells v0.24.0 (decision 075), for one filed before: identity reads the text, so a groove heard again is known as the one
 * filed only once both write it. A layer with none to write is returned as it is.
 */
export function roledLayer(layer: LearnedLayer): LearnedLayer {
  return eachFiled(layer, (file) => {
    const { text, association } = file.fragment;
    if (!association.some((p) => p.facet === 'rhythm')) return file;
    const written = text.replace(UNROLED, (_line, role: string) => `&${role} role=${role} `);
    return written === text ? file : { ...file, fragment: { ...file.fragment, text: written } };
  });
}

/**
 * The seed motifs cells v0.25.0 moved (decision 082, #642), each old id and the id it has now: Kinderlieder's six tunes,
 * the parts of its document (`MOVED`), and `waltz` and `korobeiniki`, renamed with their heads (`waltzBar`,
 * `korobeinikiBar`) since their old ids are examples' keys (one namespace).
 */
export const MOVED_IDS: ReadonlyMap<string, string> = new Map([
  ...[...MOVED].map(([id, { document, head }]): [string, string] => [id, `${document}/${head}`]),
  ['waltz', 'waltzBar'],
  ['korobeiniki', 'korobeinikiBar'],
]);

/** A `from` line that takes a renamed motif by its old head (`&waltz from waltz &key`), and how it takes it now. */
const RENAMED_TAKE = /^(\s*)&(\w+)(?:=(\w+))? from (\w+)(?=[\s(]|$)/;

/**
 * A text filed over a moved motif as it reads now: a take of one of Kinderlieder's tunes as its document's part (Migrate's
 * rule `moved`: `&twinkle from twinkle &key` → `&twinkle from kinderlied &key`), and one of a motif renamed by its new id,
 * under the name the text reads it by (`&waltz from waltz &key` → `&waltz=waltzBar from waltzBar &key`), so the lines that
 * read it are as written.
 */
export function movedText(text: string): string {
  let moved = text;
  for (const rewrite of movedIds(text, resolveSeed)) moved = rewrite.apply(moved);
  return moved
    .split('\n')
    .map((line) => {
      const take = RENAMED_TAKE.exec(line);
      const now = take && !MOVED.has(take[4]!) ? MOVED_IDS.get(take[4]!) : undefined;
      if (!take || now === undefined || (take[3] ?? take[2]) !== take[4]) return line;
      return `${take[1]}&${take[2]}=${now} from ${now}${line.slice(take[0].length)}`;
    })
    .join('\n');
}

/**
 * A layer kept before cells v0.25.0, with the motifs it moved written as they are now (`MOVED_IDS`, `movedText`): the ids
 * in its points, its pairs and a filed line's `varies` chain, and the texts it filed over them. A layer that names none
 * is the layer itself.
 */
export function movedLayer(layer: LearnedLayer): LearnedLayer {
  const id = (old: string) => MOVED_IDS.get(old) ?? old;
  const named = [...layer.points.map((p) => p.id), ...layer.together.flatMap((p) => p.ids), ...layer.filed.map((f) => f.meta['varies'])].some(
    (x) => typeof x === 'string' && MOVED_IDS.has(x),
  );
  const texts = layer.filed.map((f) => movedText(f.fragment.text));
  if (!named && texts.every((t, k) => t === layer.filed[k]!.fragment.text)) return layer;
  return {
    ...layer,
    points: layer.points.map((p) => ({ ...p, id: id(p.id) })),
    together: layer.together.map((p) => ({ ...p, ids: [id(p.ids[0]), id(p.ids[1])].sort(byId) as [string, string] })),
    filed: layer.filed.map((f, k) => {
      const varies = f.meta['varies'];
      return { ...f, fragment: { ...f.fragment, text: texts[k]! }, meta: typeof varies === 'string' ? { ...f.meta, varies: id(varies) } : f.meta };
    }),
  };
}

/**
 * A learned layer as the language writes it now, from any layer version a frontend has kept: `renamedLayer`, `signedLayer`,
 * `axedLayer`, `roledLayer`, `movedLayer`, in the order the forms were retired. Each step leaves a layer that needs
 * nothing as it is, so a layer kept at this version is returned as it is (`===`).
 */
export function migrateLayer(layer: LearnedLayer): LearnedLayer {
  return movedLayer(roledLayer(axedLayer(signedLayer(renamedLayer(layer)))));
}
