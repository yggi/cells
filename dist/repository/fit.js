import { compileSource } from "../engine/compile.js";
import { renameCell, splitComment } from "../engine/edit.js";
import { parse } from "../engine/parser/index.js";
import { clockNeeds, holesOf, INTERFACE_NAMES, meterMeets, readOnlyAsSound } from "./holes.js";
const INTERFACE = new Set(INTERFACE_NAMES.map((n) => n.replace(/^&/, '')));
const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const USE = /^use\s/;
const CONTINUES = /[+*,[]\s*$/;
export function declarations(text) {
    const out = [];
    let carry = null;
    for (const raw of text.split('\n')) {
        const code = splitComment(raw)[0];
        carry ??= { written: [], code: [] };
        carry.written.push(raw);
        carry.code.push(code);
        if (CONTINUES.test(code))
            continue;
        const whole = carry.code.join(' ').trim().split(/\s+/).join(' ');
        const name = HEAD.exec(whole)?.[1];
        if (name)
            out.push({ name, written: carry.written.join('\n'), code: whole });
        carry = null;
    }
    return out;
}
const namesIn = (text) => new Set(text
    .split('\n')
    .flatMap((line) => [...splitComment(line)[0].matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)])
    .map((m) => m[1] ?? ''));
const useLines = (text) => text
    .split('\n')
    .map((raw) => splitComment(raw)[0].trim().split(/\s+/).join(' '))
    .filter((code) => USE.test(code));
export function unionOf(fragment, workbench) {
    const bench = new Map(declarations(workbench).map((l) => [l.name, l]));
    const taken = new Set([...namesIn(workbench), ...namesIn(fragment)]);
    const renamed = new Map();
    for (;;) {
        let text = fragment;
        for (const [from, to] of renamed)
            text = renameCell(text, from, to);
        const lines = declarations(text);
        const shared = [];
        const twice = [];
        const collide = [];
        for (const line of lines) {
            const there = bench.get(line.name);
            if (!there)
                continue;
            if (there.code === line.code)
                shared.push(line.name);
            else if (INTERFACE.has(line.name))
                twice.push(line.name);
            else
                collide.push(line.name);
        }
        if (!collide.length) {
            const benchUses = new Set(useLines(workbench));
            const uses = useLines(fragment).filter((u) => !benchUses.has(u));
            const kept = [...uses, ...lines.filter((l) => !shared.includes(l.name)).map((l) => l.written)];
            const head = workbench.replace(/\s+$/, '');
            const amp = (names) => names.map((n) => `&${n}`);
            return {
                text: [...(head ? [head] : []), ...kept].join('\n'),
                renamed: new Map([...renamed].map(([from, to]) => [`&${from}`, `&${to}`])),
                shared: amp(shared),
                twice: amp([...new Set(twice)]),
                names: amp([...new Set(lines.map((l) => l.name))]),
            };
        }
        for (const name of collide) {
            let k = 2;
            while (taken.has(`${name}${k}`))
                k++;
            taken.add(`${name}${k}`);
            renamed.set(name, `${name}${k}`);
        }
    }
}
function meets(result, { need, tap }) {
    const name = need.meter ? need.meter.slice(1) : result.mainMeter;
    const meter = name === undefined ? null : result.cells.get(name)?.meter;
    return !!meter && meterMeets(need, meter, tap);
}
const unknownCells = (result) => result.diagnostics.flatMap((d) => /^Unknown cell (&[A-Za-z_][A-Za-z0-9_]*)$/.exec(d.message)?.[1] ?? []);
const sameDiagnostic = (a, b) => a.severity === b.severity && a.message === b.message && a.span.line === b.span.line && a.span.col === b.span.col;
export function fitOf(fragment, workbench, compiled = compileSource) {
    const holes = holesOf(fragment, compiled);
    const bench = compiled(workbench);
    const benchNames = new Set([...declarations(workbench).map((l) => `&${l.name}`), ...(bench.uses ?? []).flatMap((u) => u.gave)]);
    const unfilled = holes.uses.filter((name) => (name === 'key' ? !bench.mainKey : !benchNames.has(name)));
    const sounds = unfilled.filter((name) => holes.sounds.includes(name));
    const missing = unfilled.filter((name) => !sounds.includes(name));
    const sound = readOnlyAsSound(parse(fragment).cells);
    const union = unionOf(fragment, workbench);
    const alone = clockNeeds(fragment, compiled(fragment));
    const unmet = alone.filter((t) => !meets(bench, t)).map((t) => t.need);
    const failed = { fits: false, union, missing, sounds, unmet };
    if (missing.length || union.twice.length || unmet.length)
        return failed;
    const judged = () => [union.text, ...sounds.map((n) => `${n} s=white`)].join('\n');
    let result = compiled(judged());
    for (;;) {
        const more = unknownCells(result).filter((n) => sound(n) && !sounds.includes(n) && !benchNames.has(n) && !union.names.includes(n));
        if (!more.length)
            break;
        sounds.push(...more);
        result = compiled(judged());
    }
    sounds.sort();
    const before = [...bench.diagnostics];
    const diagnostics = result.diagnostics.filter((d) => {
        const i = before.findIndex((b) => sameDiagnostic(b, d));
        if (i < 0)
            return true;
        before.splice(i, 1);
        return false;
    });
    const bare = (names) => new Set(names.map((n) => n.slice(1)));
    const own = bare(union.names.filter((n) => !union.shared.includes(n)));
    const unmetThere = clockNeeds(judged(), result, bare(union.names), own)
        .filter((t) => !meets(result, t))
        .map((t) => t.need);
    return { fits: !diagnostics.length && !unmetThere.length, union, missing, sounds, unmet: unmetThere, diagnostics };
}
function lru(limit, make) {
    const cache = new Map();
    return (key) => {
        if (cache.has(key)) {
            const hit = cache.get(key);
            cache.delete(key);
            cache.set(key, hit);
            return hit;
        }
        const made = make(key);
        cache.set(key, made);
        if (cache.size > limit)
            cache.delete(cache.keys().next().value);
        return made;
    };
}
export const cachedCompile = (limit = 512) => lru(limit, (text) => compileSource(text));
export function cachedFit(limit = 512) {
    const compiled = cachedCompile(limit);
    const fit = lru(limit, (key) => {
        const colon = key.indexOf(':');
        const end = colon + 1 + Number(key.slice(0, colon));
        return fitOf(key.slice(end), key.slice(colon + 1, end), compiled);
    });
    return (fragment, workbench) => fit(`${workbench.length}:${workbench}${fragment}`);
}
