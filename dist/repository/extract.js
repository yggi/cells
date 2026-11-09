import { compileSource } from "../engine/compile.js";
import { splitComment } from "../engine/edit.js";
import { readFrom } from "../engine/parser/use.js";
import { readsAsValue } from "../engine/use.js";
import { soundsIdentical } from "../engine/sameness.js";
import { LIBRARY } from "./library.js";
import { sameText } from "./learned.js";
const CONTINUES = /[+*,[]\s*$/;
const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const readsOf = (code) => [...new Set([...code.replace(/"[^"]*"/g, '').matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]))];
function groupsOf(text) {
    const lines = text.split('\n');
    const out = [];
    let first = -1;
    let code = [];
    lines.forEach((raw, i) => {
        const c = splitComment(raw)[0];
        if (first < 0)
            first = i;
        code.push(c);
        if (CONTINUES.test(c))
            return;
        const whole = code.join(' ').trim().split(/\s+/).join(' ');
        const form = readFrom(whole);
        const defines = form ? (form.kind === 'use' ? (form.names ?? []) : []).map((n) => n.replace(/^&/, '')) : HEAD.exec(whole) ? [HEAD.exec(whole)[1]] : [];
        if (whole)
            out.push({ first, last: i, defines, reads: readsOf(whole).filter((n) => !defines.includes(n)), code: whole });
        first = -1;
        code = [];
    });
    return out;
}
const written = (id) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(id) ? id : `"${id}"`);
export function extract(text, lines, options) {
    const { id, resolve, seconds = 16 } = options;
    const groups = groupsOf(text);
    const chosen = groups.filter((g) => lines.includes(g.first + 1));
    if (!chosen.length)
        return { why: 'no declaration starts on the lines given' };
    if (chosen.some((g) => !g.defines.length))
        return { why: 'a line given defines no cell of its own (a `* from` line, or no cell at all)' };
    const rest = groups.filter((g) => !chosen.includes(g));
    const defined = chosen.flatMap((g) => g.defines);
    const body = text
        .split('\n')
        .filter((_, i) => chosen.some((g) => i >= g.first && i <= g.last))
        .join('\n');
    const whole = compileSource(text, undefined, { resolve });
    const mains = [whole.mainMeter, whole.mainKey].filter((m) => !!m && defined.includes(m));
    if (mains.length)
        return {
            why: `the lines define the piece's main ${mains[0] === whole.mainMeter ? 'meter' : 'key'}, &${mains[0]}, which the rest reads without naming it: leave its line in the piece`,
        };
    const cards = defined.filter((n) => ['sample', 'midi'].includes(whole.cells.get(n)?.map?.kind ?? ''));
    if (cards.length)
        return { why: `the lines hold a card, &${cards[0]}, where the piece is heard: a fragment carries none (leave its line in the piece)` };
    const heads = defined.filter((n) => rest.some((g) => g.reads.includes(n)));
    if (!heads.length)
        return { why: 'nothing else in the piece reads what these lines define' };
    const outside = [...new Set(chosen.flatMap((g) => g.reads))].filter((n) => !defined.includes(n));
    const inputs = outside.filter((n) => chosen.some((g) => g.reads.includes(n) && readsAsValue(g.code, n))).map((n) => `&${n}`);
    const sounds = outside.filter((n) => !inputs.includes(`&${n}`)).map((n) => `&${n}`);
    if (inputs.length > 1)
        return { why: `the lines read ${inputs.join(', ')}, which they don't define: a fragment takes one main argument (take the others' lines in too)` };
    const main = inputs[0] ?? null;
    const heads$ = heads.map((h) => `&${h}`).join(', ');
    const fragment = [`${heads$} from${main ? ` ${main}` : ''}`, body].join('\n');
    const line = `${heads$} from ${written(id)}${main ? ` ${main}` : ''}`;
    const at = Math.min(...chosen.map((g) => g.first));
    const piece = text
        .split('\n')
        .flatMap((l, i) => (i === at ? [line] : chosen.some((g) => i >= g.first && i <= g.last) ? [] : [l]))
        .join('\n');
    const theirs = (x, hash) => (x === id ? fragment : resolve(x, hash));
    const same = soundsIdentical(text, piece, seconds, { resolve: theirs });
    const known = LIBRARY.find((f) => sameText(fragment, f.text))?.id ?? null;
    return { fragment, piece, line, heads: heads.map((h) => `&${h}`), main, private: defined.filter((n) => !heads.includes(n)).map((n) => `&${n}`), sounds, same, known };
}
