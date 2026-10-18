import { renameCell } from "../engine/edit.js";
import { chanceOf } from "../engine/realize.js";
import { createRepository, EMPTY_LAYER } from "./fragments.js";
import { fileFragment, useFragments } from "./learned.js";
import { LIBRARY } from "./library.js";
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from "./presets.js";
import { RHYTHM_FRAGMENTS } from "./rhythms.js";
export const LOCK_IN_PRESETS = { SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ };
const STARTS = Object.values(LOCK_IN_PRESETS);
export const DRAW = STARTS.length;
export const SECTIONS = 1_250;
const ENTROPY = 0.3;
const MISS = 0.3;
export const FACETS = ['meter', 'rhythm'];
export const LOCK_IN_BOUND = 0.05;
const STEP = { sync: 0.08, harm: 0.1, artic: 0.1, energy: 0.06 };
const reflected = (x) => {
    const around = ((x % 2) + 2) % 2;
    return around > 1 ? 2 - around : around;
};
function walk(start, seed) {
    const points = [start];
    for (let section = 1; section < SECTIONS; section++) {
        const at = points[section - 1];
        points.push(Object.fromEntries(Object.keys(STEP).map((axis) => [axis, reflected(at[axis] + STEP[axis] * ENTROPY * (2 * chanceOf(`walk|${seed}|${section}|${axis}`) - 1))])));
    }
    return points;
}
const son = RHYTHM_FRAGMENTS.find((f) => f.id === 'son clave 3-2').text;
const MADE = {
    meter: ['&bar meter("9/8")', '&bar meter("11/8")', '&bar meter("5/8")', '&bar meter("4/4") swing=16n:.58', '&bar  meter("7/8")', '&bar meter("3/4") // a waltz'],
    rhythm: [
        '&perc step=16n euclid(5,16)\n&rim map=midi(10) [&perc]',
        '&perc step=16n euclid(7,16,2)\n&rim map=midi(10) [&perc]',
        '&perc step=8n euclid(3,8)\n&rim map=midi(10) [&perc]',
        '&shaker step=16n euclid(11,16)\n&rim map=midi(10) [&shaker]',
        renameCell(renameCell(renameCell(son, 'clave', 'cl'), 'percussion', 'perc'), 'claves', 'wood'),
        son.replace(' &claves', '  &claves'),
    ],
};
const made = (facet, seed, section) => MADE[facet][Math.floor(chanceOf(`made|${seed}|${section}|${facet}`) * MADE[facet].length)];
const repository = createRepository(LIBRARY);
function baseline(start, seed) {
    const alone = { meter: [], rhythm: [] };
    const missed = { meter: [], rhythm: [] };
    for (const point of walk(start, seed))
        for (const facet of FACETS) {
            const first = repository.query(point, 1, {}, { facet })[0];
            alone[facet].push(first.fragment.id);
            missed[facet].push(first.distance > MISS);
        }
    return { start: Object.keys(LOCK_IN_PRESETS)[STARTS.indexOf(start)], seed, alone, missed };
}
function learned(start, seed, learn) {
    let layer = EMPTY_LAYER;
    const kept = { meter: [], rhythm: [] };
    const filedAt = new Map();
    let [filedNew, filedHeld] = [0, 0];
    let [firstFiled, firstFoundAgain] = [null, null];
    for (const [section, point] of walk(start, seed).entries()) {
        const uses = [];
        for (const facet of FACETS) {
            const chosen = learn.together ? uses.map((u) => u.id) : [];
            const first = repository.query(point, LIBRARY.length + layer.filed.length, {}, { facet, chosen, layer }).find((f) => f.distance <= MISS);
            if (first) {
                if ((filedAt.get(first.fragment.id) ?? section) < section)
                    firstFoundAgain ??= section;
                uses.push({ id: first.fragment.id, facet, ...(learn.move ? { point } : {}) });
                continue;
            }
            const filed = fileFragment(repository, layer, { text: made(facet, seed, section), point, facet, source: 'composer', created: `run ${seed} section ${section}` });
            layer = filed.layer;
            if (filed.file) {
                filedNew++;
                filedAt.set(filed.id, section);
                firstFiled ??= section;
            }
            else
                filedHeld++;
            uses.push({ id: filed.id, facet });
        }
        for (const u of uses)
            kept[u.facet].push(u.id);
        layer = useFragments(repository, layer, uses);
        if (!learn.together)
            layer = { ...layer, together: [] };
    }
    return { kept, filedNew, filedHeld, firstFiled, firstFoundAgain, layer };
}
export function lockInDraws(from, to, learnings) {
    const baselines = [];
    const learnedRuns = learnings.map(() => []);
    for (let draw = from; draw <= to; draw++) {
        const seeds = STARTS.map((start, i) => [start, DRAW * draw + i]);
        baselines.push(seeds.map(([start, seed]) => baseline(start, seed)));
        learnings.forEach((learn, k) => learnedRuns[k].push(seeds.map(([start, seed]) => learned(start, seed, learn))));
    }
    return { baselines, learned: learnedRuns };
}
export function topThree(ids) {
    const counts = new Map();
    for (const id of ids)
        counts.set(id, (counts.get(id) ?? 0) + 1);
    const top = [...counts.values()].sort((a, b) => b - a).slice(0, 3);
    return top.reduce((a, b) => a + b, 0) / ids.length;
}
const added = (base, runs, facet) => runs.reduce((sum, r, i) => sum + topThree(r.kept[facet]) - topThree(base[i].alone[facet]), 0) / runs.length;
export function lockIn(base, runs, facet) {
    const perDraw = runs.map((draw, d) => added(base[d], draw, facet));
    const pooled = perDraw.reduce((a, b) => a + b, 0) / perDraw.length;
    const variance = perDraw.reduce((a, b) => a + (b - pooled) ** 2, 0) / Math.max(1, perDraw.length - 1);
    return { perDraw, pooled, standardError: Math.sqrt(variance / perDraw.length) };
}
export function drift(base, runs, facet) {
    const aimed = runs.flatMap((r, i) => base[i].alone[facet].flatMap((id, s) => (base[i].missed[facet][s] ? [] : [id === r.kept[facet][s]])));
    return aimed.filter((same) => !same).length / aimed.length;
}
