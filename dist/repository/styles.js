import { parse } from "../engine/parser/index.js";
import { AXIS_NAMES } from "../engine/style.js";
import { pointDistance } from "./fragments.js";
import { seedFragments } from "./seed.js";
export const STYLE_FRAGMENTS = seedFragments('styles');
function styleOf(cell) {
    const values = cell.braid.kind === 'list' ? cell.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [];
    if (cell.map?.kind !== 'style' || values.length !== AXIS_NAMES.length || !values.every(Number.isFinite))
        throw new Error(`styles: &${cell.name} is not a style cell with a value on each axis`);
    if (!cell.label)
        throw new Error(`styles: &${cell.name} has no label=, its display name`);
    if (cell.step?.kind !== 'rate')
        throw new Error(`styles: &${cell.name} has no step= in bpm, its default tempo`);
    return {
        id: cell.name,
        name: cell.label,
        point: Object.fromEntries(AXIS_NAMES.map((a, i) => [a, values[i]])),
        tempo: Math.round(cell.step.perSecond * 60 * 1e9) / 1e9,
    };
}
export const STYLES = parse(STYLE_FRAGMENTS.find((f) => f.id === 'styles').text).cells.map(styleOf);
export function stylePoint(id) {
    const style = STYLES.find((s) => s.id === id);
    if (!style)
        throw new Error(`styles: no style ${id} (there are ${STYLES.map((s) => s.id).join(', ')})`);
    return style.point;
}
export function nearestStyle(point, options = {}) {
    const { k = Infinity, axisWeights = {}, styles = STYLES } = options;
    return styles
        .map((style, i) => ({ style, distance: pointDistance(point, style.point, axisWeights), i }))
        .sort((a, b) => a.distance - b.distance || a.i - b.i)
        .slice(0, k)
        .map(({ style, distance }) => ({ style, distance }));
}
export const at = (sync, harm, artic, energy) => ({ sync, harm, artic, energy });
export const SYNTH_POP = stylePoint('synthPop');
export const TECHNO = stylePoint('techno');
export const DEEP_HOUSE = stylePoint('deepHouse');
export const AMBIENT = stylePoint('ambient');
export const LO_FI = stylePoint('lofi');
export const FUNK = stylePoint('funk');
export const BOSSA_NOVA = stylePoint('bossaNova');
export const SWING_JAZZ = stylePoint('swingJazz');
export const ELECTRO_SWING = stylePoint('electroSwing');
export const SPOOKY = stylePoint('spooky');
export const KINDERLIED = stylePoint('kinderlied');
