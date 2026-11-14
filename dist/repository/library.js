import { EXAMPLES } from "../engine/examples.js";
import { RENAMED_IDS } from "../engine/renamed.js";
import { SEED, seedFragments } from "./seed.js";
import { EMPTY_LAYER, fragmentProblems } from "./fragments.js";
import { readPiece } from "../engine/piecefile.js";
import { partOf, usesIn } from "../engine/use.js";
import { variantsOf } from "./variants.js";
const FOLDERS = ['meters', 'rhythms', 'bass', 'harmony', 'instruments', 'expression', 'modes', 'performers', 'stab', 'motifs', 'forms', 'bands', 'styles', 'modules', 'laws'];
export const PARTS = Object.entries(EXAMPLES).flatMap(([key, e]) => {
    const file = readPiece(e.file);
    const parts = 'problems' in file ? undefined : file.frontmatter.parts;
    if (!parts || typeof parts !== 'object' || Array.isArray(parts))
        return [];
    return Object.entries(parts).map(([head, entry]) => {
        const text = partOf(e.source, head);
        if (text === null)
            throw new Error(`examples/${key}.md: its frontmatter keys a part &${head}, and no signature names it`);
        const fragment = { id: `${key}/${head}`, text, association: (entry?.association ?? []) };
        const problems = fragmentProblems(fragment);
        if (problems.length)
            throw new Error(`examples/${key}.md, part &${head}: ${problems.join('; ')}`);
        return fragment;
    });
});
export const LIBRARY = [...FOLDERS.flatMap((folder) => seedFragments(folder)), ...PARTS];
export const ofFacet = (facet) => LIBRARY.filter((f) => f.association.some((p) => p.facet === facet));
const PART_ID = /^[^(/]+\/[^(]+$/;
export const fromId = (id) => (PART_ID.test(id) ? id.slice(0, id.indexOf('/')) : id);
export const headOf = (id) => (PART_ID.test(id) ? id.slice(id.indexOf('/') + 1) : id);
export function usesOf(id) {
    if (!PART_ID.test(id))
        return [];
    const key = fromId(id);
    const source = EXAMPLES[key]?.source;
    if (source === undefined)
        return [];
    const part = (value) => {
        const name = /^&(\w+)$/.exec(value)?.[1];
        const other = name === undefined ? undefined : `${key}/${name}`;
        return other !== undefined && PARTS.some((f) => f.id === other) ? other : value;
    };
    return usesIn(source, headOf(id)).map((u) => ({ id: u.id, args: Object.fromEntries(Object.entries(u.args).map(([k, v]) => [k, part(v)])) }));
}
export const RETIRED = new Map([
    ['core kit', '&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit'],
    ['gm kit', '* from gm_kit'],
]);
const CURRENT = new Map([...SEED.map((f) => [f.fragment.id, f.fragment.text]), ...LIBRARY.map((f) => [f.id, f.text])]);
const RENAMED = [...RENAMED_IDS].map(([old, word]) => [old, CURRENT.get(word)]);
const PIECES = Object.entries(EXAMPLES).map(([key, e]) => [key, e.source]);
const BY_ID = new Map([...PIECES, ...CURRENT, ...RENAMED, ...RETIRED]);
export const resolveSeed = (id) => BY_ID.get(id) ?? null;
export function resolverOf(layer = EMPTY_LAYER) {
    if (!layer.filed.length)
        return resolveSeed;
    const filed = new Map(layer.filed.flatMap(({ fragment }) => variantsOf(fragment).map((v) => [v.id, v.text])));
    return (id, hash) => resolveSeed(id, hash) ?? filed.get(id) ?? null;
}
