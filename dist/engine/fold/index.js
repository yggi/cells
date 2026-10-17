import { tokensOf } from "./transpose.js";
import { pairs } from "./pairs.js";
import { figure } from "./figure.js";
import { dilate } from "./dilate.js";
import { stretch } from "./stretch.js";
import { variants } from "./variants.js";
import { beta } from "./beta.js";
import { printFolded } from "./print.js";
export { printFolded } from "./print.js";
const TOOLS = [dilate, figure, stretch, variants, pairs, beta];
const NAMES = new Map([
    [dilate, 'clocks'],
    [figure, 'figures'],
    [variants, 'phrases and their variants'],
    [pairs, 'pairs'],
    [stretch, 'passages at another speed'],
    [beta, 'taking back what doesn’t pay'],
]);
const sizeOf = (f, caret) => {
    const { defs, lines } = printFolded(f, 'm', 'pulse', caret);
    return [...defs, ...lines.values()].reduce((n, s) => n + s.length + 1, 0);
};
const STRUCTURE = 1.15;
function run(lines, tools, caret, watch) {
    let f = { lines: lines.map((l) => ({ name: l.name, toks: tokensOf(l) })), rules: new Map() };
    const start = f;
    watch?.(() => start, { tool: 'start', round: 0 });
    let size = sizeOf(f, caret);
    for (let round = 0; round < 8; round++) {
        let next = f;
        for (const tool of tools) {
            const stage = { tool: NAMES.get(tool) ?? 'a tool', round: round + 1 };
            const see = watch && ((now) => watch(now, stage));
            const made = tool(next, see);
            if (made && made !== next) {
                next = made;
                see?.(() => made);
            }
        }
        const s = sizeOf(next, caret);
        if (s >= size)
            break;
        [f, size] = [next, s];
    }
    return { f, size };
}
export function fold(lines, watch, { degrees = false } = {}) {
    const caret = degrees ? '^' : '^$';
    const tools = degrees ? TOOLS.filter((t) => t !== figure) : TOOLS;
    const said = run(lines, tools, caret, watch);
    const plain = run(lines, tools.filter((t) => t !== variants), caret);
    const f = said.size <= plain.size * STRUCTURE ? said.f : plain.f;
    watch?.(() => f, { tool: 'done', round: 0 });
    return f;
}
