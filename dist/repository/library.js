import { RENAMED_IDS } from "../engine/renamed.js";
import { SEED, seedFragments } from "./seed.js";
import { EMPTY_LAYER } from "./fragments.js";
import { variantsOf } from "./variants.js";
const FOLDERS = ['meters', 'rhythms', 'bass', 'harmony', 'instruments', 'expression', 'modes', 'performers', 'stab', 'motifs', 'forms', 'bands', 'styles', 'modules'];
export const LIBRARY = FOLDERS.flatMap((folder) => seedFragments(folder));
export const RETIRED = new Map([
    ['core kit', '&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit'],
    ['gm kit', '* from gm_kit'],
]);
const CURRENT = new Map([...SEED.map((f) => [f.fragment.id, f.fragment.text]), ...LIBRARY.map((f) => [f.id, f.text])]);
const RENAMED = [...RENAMED_IDS].map(([old, word]) => [old, CURRENT.get(word)]);
const BY_ID = new Map([...CURRENT, ...RENAMED, ...RETIRED]);
export const resolveSeed = (id) => BY_ID.get(id) ?? null;
export function resolverOf(layer = EMPTY_LAYER) {
    if (!layer.filed.length)
        return resolveSeed;
    const filed = new Map(layer.filed.flatMap(({ fragment }) => variantsOf(fragment).map((v) => [v.id, v.text])));
    return (id, hash) => resolveSeed(id, hash) ?? filed.get(id) ?? null;
}
