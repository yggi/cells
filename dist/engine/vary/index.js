import { declarations } from "../../repository/fit.js";
import { compileSource } from "../compile.js";
import { declWords, setBraid } from "../edit.js";
import { gmDrumNote } from "../midi.js";
import { anchorsAmong } from "./anchors.js";
import { linesOf, pitchOf, written } from "./lines.js";
export { backbeatOf } from "./anchors.js";
export const RHYTHM_OPERATORS = ['rotate', 'drop', 'add'];
function read(fragment, workbench = '') {
    const own = new Set(declarations(fragment).map((l) => l.name));
    const bench = declarations(workbench)
        .filter((l) => !own.has(l.name))
        .map((l) => l.written);
    const text = [...bench, fragment].join('\n');
    const result = compileSource(text);
    if (!result.ok)
        return { lines: [], anchors: [] };
    const lines = linesOf(text, result);
    return { lines, anchors: anchorsAmong(lines) };
}
export const anchorsOf = (fragment, workbench) => read(fragment, workbench).anchors;
const named = (name) => (name.startsWith('&') ? name : `&${name}`);
export function variations(fragment, options = {}) {
    const { workbench, operators = RHYTHM_OPERATORS, keep = [], fewest = 1 } = options;
    const { lines, anchors } = read(fragment, workbench);
    const left = new Set([...anchors.map((a) => a.line), ...keep.map(named)]);
    const onset = (i, step) => {
        const w = lines[i].stepWhole;
        return w === null ? `${i}@${step}` : (step * w).toFixed(9);
    };
    const sound = (voice) => String(gmDrumNote(voice.slice(1)) ?? voice);
    const keysOf = (i, notes) => notes.map((n) => `${onset(i, n.step)} ${lines[i].stepWhole ?? i} ${n.voice}`);
    const strikesOf = (i, notes) => notes.map((n) => `${onset(i, n.step)} ${sound(n.voice)}`);
    const noteKeys = lines.map((l, i) => keysOf(i, l.notes));
    const strikeKeys = lines.map((l, i) => strikesOf(i, l.notes));
    const total = lines.reduce((sum, l) => sum + l.notes.length, 0);
    const signature = (i, notes) => lines
        .flatMap((_, j) => (j === i ? keysOf(i, notes) : noteKeys[j]))
        .sort()
        .join('|');
    const seen = new Set([signature(-1, [])]);
    const out = [];
    const words = new Map();
    const offer = (i, operator, notes, amount, braids, what) => {
        if (!braids || total - lines[i].notes.length + notes.length < fewest)
            return;
        const strikes = lines.flatMap((_, j) => (j === i ? strikesOf(i, notes) : strikeKeys[j]));
        if (new Set(strikes).size < strikes.length)
            return;
        const sig = signature(i, notes);
        if (seen.has(sig))
            return;
        seen.add(sig);
        const line = lines[i].name;
        const code = (name, braid) => {
            if (!words.has(name))
                words.set(name, declWords(fragment, name));
            const w = words.get(name);
            return w ? [...w.head, ...w.attrs, ...(braid ?? w.braid)].join(' ') : '';
        };
        out.push({
            id: `vary:${operator}:${line}${amount === null ? '' : `:${amount}`}:${out.length}`,
            tool: 'vary',
            rule: operator,
            title: `${line}: ${what}`,
            before: [...braids.keys()].map((name) => code(name)).join('\n'),
            after: [...braids].map(([name, braid]) => code(name, braid)).join('\n'),
            apply: (source) => [...braids].reduce((text, [name, braid]) => setBraid(text, name, braid), source),
            line,
            by: `${operator} ${line}${amount === null ? '' : ` ${amount}`}`,
        });
    };
    const inOrder = (notes) => notes.sort((a, b) => a.step - b.step || pitchOf(a.voice) - pitchOf(b.voice));
    const first = (i) => {
        const n = lines[i].notes[0];
        return [n.step * (lines[i].stepWhole ?? 1), pitchOf(n.voice)];
    };
    const order = lines
        .map((_, i) => i)
        .filter((i) => lines[i].notes.length > 0 && !left.has(lines[i].name))
        .sort((a, b) => first(a)[0] - first(b)[0] || first(a)[1] - first(b)[1]);
    for (const i of order) {
        const line = lines[i];
        const levels = line.levels?.tokens;
        for (const operator of operators) {
            if (operator === 'rotate') {
                const notes = inOrder(line.notes.map((n) => ({ ...n, step: (n.step + 1) % line.steps })));
                const turned = levels && [levels.at(-1), ...levels.slice(0, -1)];
                offer(i, operator, notes, null, written(line, notes, turned, true), 'every note a step later, the last to the first');
            }
            else if (operator === 'drop')
                for (const dropped of line.notes) {
                    const notes = line.notes.filter((n) => n !== dropped);
                    offer(i, operator, notes, dropped.step, written(line, notes), `its ${dropped.voice} on step ${dropped.step} left out`);
                }
            else {
                const voice = line.notes[0].voice;
                const loudest = line.notes.reduce((a, b) => (b.level > a.level ? b : a));
                for (let step = 0; step < line.steps; step++) {
                    if (line.notes.some((n) => n.step === step && sound(n.voice) === sound(voice)))
                        continue;
                    const notes = inOrder([...line.notes, { step, voice, own: loudest.own, level: loudest.level }]);
                    const louder = levels && levels.map((t, s) => (s === step ? levels[loudest.step] : t));
                    offer(i, operator, notes, step, written(line, notes, louder), `a ${voice} on step ${step}, as loud as its loudest`);
                }
            }
        }
    }
    return out;
}
export function drawn(draw, n) {
    if (!(draw >= 0 && draw < 1))
        throw new Error(`varied: draw ${draw} is outside [0, 1)`);
    return Math.floor(draw * n);
}
export function varied(fragment, draw, options) {
    drawn(draw, 1);
    const all = variations(fragment, options);
    return all.length ? all[drawn(draw, all.length)] : null;
}
