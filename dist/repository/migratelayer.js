import { movedIds } from "../engine/migrate/moved.js";
import { OLD_AXES, newPoint } from "../engine/migrate/axes.js";
import { MOVED } from "../engine/renamed.js";
import { ROLES } from "../engine/perform/feel.js";
import { signatureOf } from "../engine/use.js";
import { byId } from "./fragments.js";
import { renamedLayer } from "./learned.js";
import { resolveSeed } from "./library.js";
function eachFiled(layer, step) {
    const filed = layer.filed.map(step);
    return filed.every((file, i) => file === layer.filed[i]) ? layer : { ...layer, filed };
}
const SIGNED = [
    { facet: 'bass', head: '&bassline', signature: '&bassline from &harm' },
    { facet: 'harmony', head: '&harm', signature: '&harm from &key' },
];
export function signedLayer(layer) {
    return eachFiled(layer, (file) => {
        const { text, association } = file.fragment;
        const as = SIGNED.find((s) => association.some((p) => p.facet === s.facet) && text.startsWith(`${s.head} `));
        return as && !signatureOf(text) ? { ...file, fragment: { ...file.fragment, text: `${as.signature}\n${text}` } } : file;
    });
}
const MOODY = new Set(['bass', 'harmony', 'lead', 'motif', 'mode', 'stab', 'instrument']);
export function axedLayer(layer) {
    const old = (point) => OLD_AXES.every((a) => typeof point[a] === 'number');
    const moved = (p) => old(p.point) ? { ...p, point: newPoint(p.point, p.facet !== undefined && MOODY.has(p.facet)) } : p;
    if (![...layer.points, ...layer.filed.flatMap((f) => f.fragment.association)].some((p) => old(p.point)))
        return layer;
    return {
        ...layer,
        points: layer.points.map(moved),
        filed: layer.filed.map((file) => ({ ...file, fragment: { ...file.fragment, association: file.fragment.association.map(moved) } })),
    };
}
const UNROLED = new RegExp(`^&(${[...ROLES].join('|')}) (?!.*\\brole=)`, 'gm');
export function roledLayer(layer) {
    return eachFiled(layer, (file) => {
        const { text, association } = file.fragment;
        if (!association.some((p) => p.facet === 'rhythm'))
            return file;
        const written = text.replace(UNROLED, (_line, role) => `&${role} role=${role} `);
        return written === text ? file : { ...file, fragment: { ...file.fragment, text: written } };
    });
}
export const MOVED_IDS = new Map([
    ...[...MOVED].map(([id, { document, head }]) => [id, `${document}/${head}`]),
    ['waltz', 'waltzBar'],
    ['korobeiniki', 'korobeinikiBar'],
]);
const RENAMED_TAKE = /^(\s*)&(\w+)(?:=(\w+))? from (\w+)(?=[\s(]|$)/;
export function movedText(text) {
    let moved = text;
    for (const rewrite of movedIds(text, resolveSeed))
        moved = rewrite.apply(moved);
    return moved
        .split('\n')
        .map((line) => {
        const take = RENAMED_TAKE.exec(line);
        const now = take && !MOVED.has(take[4]) ? MOVED_IDS.get(take[4]) : undefined;
        if (!take || now === undefined || (take[3] ?? take[2]) !== take[4])
            return line;
        return `${take[1]}&${take[2]}=${now} from ${now}${line.slice(take[0].length)}`;
    })
        .join('\n');
}
export function movedLayer(layer) {
    const id = (old) => MOVED_IDS.get(old) ?? old;
    const named = [...layer.points.map((p) => p.id), ...layer.together.flatMap((p) => p.ids), ...layer.filed.map((f) => f.meta['varies'])].some((x) => typeof x === 'string' && MOVED_IDS.has(x));
    const texts = layer.filed.map((f) => movedText(f.fragment.text));
    if (!named && texts.every((t, k) => t === layer.filed[k].fragment.text))
        return layer;
    return {
        ...layer,
        points: layer.points.map((p) => ({ ...p, id: id(p.id) })),
        together: layer.together.map((p) => ({ ...p, ids: [id(p.ids[0]), id(p.ids[1])].sort(byId) })),
        filed: layer.filed.map((f, k) => {
            const varies = f.meta['varies'];
            return { ...f, fragment: { ...f.fragment, text: texts[k] }, meta: typeof varies === 'string' ? { ...f.meta, varies: id(varies) } : f.meta };
        }),
    };
}
export function migrateLayer(layer) {
    return movedLayer(roledLayer(axedLayer(signedLayer(renamedLayer(layer)))));
}
