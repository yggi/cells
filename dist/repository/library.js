import { EXAMPLES } from "../engine/examples.js";
import { SEED, seedFragments } from "./seed.js";
import { EMPTY_LAYER, fragmentProblems } from "./fragments.js";
import { partOf, signatureHeads, usesIn } from "../engine/use.js";
import { associationOf } from "./declarations.js";
import { styleNamesIn } from "./files.js";
import { SEED_FILES } from "./seed.generated.js";
import { variantsOf } from "./variants.js";
const STYLE_NAMES = styleNamesIn(SEED_FILES);
const FOLDERS = [
    'meters',
    'rhythms',
    'fills',
    'counts',
    'endings',
    'bass',
    'harmony',
    'instruments',
    'expression',
    'modes',
    'melodic',
    'performers',
    'stab',
    'motifs',
    'forms',
    'sections',
    'songs',
    'bands',
    'styles',
    'modules',
    'laws',
];
export const PARTS = Object.entries(EXAMPLES).flatMap(([key, e]) => signatureHeads(e.source).flatMap((name) => {
    const head = name.slice(1);
    const text = partOf(e.source, head);
    if (text === null)
        return [];
    const declared = associationOf(text
        .split('\n')
        .filter((line) => !line.trim().startsWith('*'))
        .join('\n'), { styles: STYLE_NAMES });
    if (!declared?.explicit)
        return [];
    const fragment = { id: `${key}/${head}`, text, association: declared.association };
    const problems = [...declared.problems, ...fragmentProblems(fragment)];
    if (problems.length)
        throw new Error(`examples/${key}.md, part &${head}: ${problems.join('; ')}`);
    return [fragment];
}));
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
const CURRENT = new Map([...SEED.map((f) => [f.fragment.id, f.fragment.text]), ...LIBRARY.map((f) => [f.id, f.text])]);
const PIECES = Object.entries(EXAMPLES).map(([key, e]) => [key, e.source]);
const BY_ID = new Map([...PIECES, ...CURRENT]);
export const resolveSeed = (id) => BY_ID.get(id) ?? null;
export const SECTION_KINDS = LIBRARY.filter((f) => f.association.some((p) => p.facet === 'section')).map((f) => f.id);
export const FACETS = [...new Set(LIBRARY.flatMap((f) => f.association.flatMap((p) => (p.facet === undefined ? [] : [p.facet]))))];
export const isLibraryFragment = (id) => LIBRARY_IDS.has(id);
const LIBRARY_IDS = new Set(LIBRARY.map((f) => f.id));
export function resolverOf(layer = EMPTY_LAYER) {
    if (!layer.filed.length)
        return resolveSeed;
    const filed = new Map(layer.filed.flatMap(({ fragment }) => variantsOf(fragment).map((v) => [v.id, v.text])));
    return (id, hash) => resolveSeed(id, hash) ?? filed.get(id) ?? null;
}
