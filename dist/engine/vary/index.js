import { declarations } from "../../repository/fit.js";
import { compileSource } from "../compile.js";
import { declWords, setBraid } from "../edit.js";
import { gmDrumNote } from "../midi.js";
import { anchorsAmong } from "./anchors.js";
import { linesOf, moved, pitchKey, pitchOf, written } from "./lines.js";
export { backbeatOf } from "./anchors.js";
export const RHYTHM_OPERATORS = ['rotate', 'drop', 'add'];
export const PITCHED_OPERATORS = ['transpose', 'invert', 'reverse'];
export const DEGREES = [-2, -1, 1, 2];
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
    return { lines, anchors: anchorsAmong(lines, result) };
}
export const anchorsOf = (fragment, workbench) => read(fragment, workbench).anchors;
const named = (name) => (name.startsWith('&') ? name : `&${name}`);
export function variations(fragment, options = {}) {
    const { workbench, operators = RHYTHM_OPERATORS, keep = [], fewest = 1, degrees = DEGREES } = options;
    const { lines, anchors } = read(fragment, workbench);
    const left = new Set([...anchors.filter((a) => a.step === undefined).map((a) => a.line), ...keep.map(named)]);
    const pinned = (line, n) => anchors.some((a) => a.line === line.name && a.step === n.step);
    const onset = (i, step) => {
        const w = lines[i].stepWhole;
        return w === null ? `${i}@${step}` : (step * w).toFixed(9);
    };
    const sound = (voice) => String(gmDrumNote(voice.slice(1)) ?? voice);
    const pitch = (n) => (n.pitch ? ` ${pitchKey(n.pitch)}` : '');
    const keysOf = (i, notes) => notes.map((n) => `${onset(i, n.step)} ${lines[i].stepWhole ?? i} ${n.voice}${pitch(n)}`);
    const strikesOf = (i, notes) => notes.map((n) => `${onset(i, n.step)} ${sound(n.voice)}${pitch(n)}`);
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
            if (PITCHED_OPERATORS.includes(operator) !== !!line.pitched)
                continue;
            if (operator === 'transpose')
                for (const n of degrees) {
                    const notes = line.notes.map((x) => (pinned(line, x) ? x : { ...x, pitch: moved(x.pitch, 1, n) }));
                    offer(i, operator, notes, n, written(line, notes), `every note ${n > 0 ? 'up' : 'down'} ${Math.abs(n)} degree${Math.abs(n) === 1 ? '' : 's'}`);
                }
            else if (operator === 'invert') {
                const f = line.notes[0].pitch.written;
                if (typeof f !== 'number')
                    continue;
                const notes = line.notes.map((x) => (pinned(line, x) ? x : { ...x, pitch: moved(x.pitch, -1, 2 * f) }));
                offer(i, operator, notes, null, written(line, notes), `every note mirrored about its first`);
            }
            else if (operator === 'reverse') {
                const notes = inOrder(reversed(line, (n) => pinned(line, n)));
                offer(i, operator, notes, null, written(line, notes), 'its notes in reverse order between its anchors');
            }
            else if (operator === 'rotate') {
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
function reversed(line, anchored) {
    const at = new Map(line.notes.map((n) => [n.step, n]));
    const fixed = line.notes.filter(anchored).map((n) => n.step);
    const spans = [];
    if (!fixed.length)
        spans.push(Array.from({ length: line.steps }, (_, s) => s));
    else
        for (const [k, start] of fixed.entries()) {
            const end = fixed[(k + 1) % fixed.length] + (k + 1 === fixed.length ? line.steps : 0);
            spans.push(Array.from({ length: end - start - 1 }, (_, j) => (start + 1 + j) % line.steps));
        }
    const out = line.notes.filter(anchored);
    for (const span of spans)
        for (const [j, step] of span.entries()) {
            const n = at.get(span[span.length - 1 - j]);
            if (n)
                out.push({ ...n, step });
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
