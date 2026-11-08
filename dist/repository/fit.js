import { compileSource } from "../engine/compile.js";
import { renameCell, splitComment } from "../engine/edit.js";
import { expansion, signatureOf } from "../engine/use.js";
import { parse, readFrom } from "../engine/parser/index.js";
import { braidReadsOf } from "../engine/compiler/builtin.js";
import { clockNeeds, holesOf, linesRead, meterMeets, readOnlyAsSound, standIn } from "./holes.js";
const INTERFACE = new Set(['bar', 'tempo', 'key', 'tonic', 'harm', 'style']);
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
        if (name && readFrom(whole) === undefined)
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
    .filter((code) => USE.test(code) || readFrom(code)?.kind === 'use');
export const unionOf = (fragment, workbench) => unionByName(fragment, workbench);
function unionByName(fragment, workbench) {
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
const unknownCells = (result) => result.unknown.map((u) => `&${u.name}`);
const sameDiagnostic = (a, b) => a.severity === b.severity && a.message === b.message && a.span.line === b.span.line && a.span.col === b.span.col;
export const fitOf = (fragment, workbench, compiledBy, resolve) => fitByName(fragment, workbench, compiledBy, resolve);
function fitByName(fragment, workbench, compiledBy, resolve) {
    const compiled = compiledBy ?? ((text) => compileSource(text, undefined, resolve ? { resolve } : {}));
    const holes = holesOf(fragment, compiled, resolve);
    const bench = compiled(workbench);
    const benchNames = new Set([...declarations(workbench).map((l) => `&${l.name}`), ...(bench.uses ?? []).flatMap((u) => u.gave)]);
    const unfilled = holes.uses.filter((name) => (name === 'key' ? !bench.mainKey : !benchNames.has(name)));
    const sounds = unfilled.filter((name) => holes.sounds.includes(name));
    const missing = unfilled.filter((name) => !sounds.includes(name));
    const read = linesRead(fragment, resolve);
    const sound = readOnlyAsSound(parse(read).cells);
    const union = unionByName(fragment, workbench);
    const aloneStand = holes.sounds.map(standIn);
    const alone = clockNeeds([read, ...aloneStand].join('\n'), compiled([fragment, ...aloneStand].join('\n')));
    const unmet = alone.filter((t) => !meets(bench, t)).map((t) => t.need);
    const failed = { fits: false, union, missing, sounds, unmet };
    if (missing.length || union.twice.length || unmet.length)
        return failed;
    const benchDecls = parse(workbench).cells;
    const benchSound = readOnlyAsSound(benchDecls);
    const benchHoles = [...new Set(benchDecls.flatMap((d) => braidReadsOf(d)).map((n) => `&${n}`))].filter((n) => !benchNames.has(n) && !union.names.includes(n) && benchSound(n));
    const benchStand = benchHoles.map(standIn);
    const benchResult = benchStand.length ? compiled([workbench, ...benchStand].join('\n')) : bench;
    const judged = () => [union.text, ...new Set([...sounds.map(standIn), ...benchStand])].join('\n');
    let result = compiled(judged());
    for (;;) {
        const more = unknownCells(result).filter((n) => sound(n) && !sounds.includes(n) && !benchNames.has(n) && !union.names.includes(n));
        if (!more.length)
            break;
        sounds.push(...more);
        result = compiled(judged());
    }
    sounds.sort();
    const before = [...benchResult.diagnostics];
    const standNames = new Set([...sounds, ...benchStand.map((l) => l.split(' ')[0])].map((n) => (n.startsWith('&') ? n : `&${n}`)));
    const diagnostics = result.diagnostics.filter((d) => {
        const m = /^(&\w+) is only on a MIDI card: its sound/.exec(d.message);
        if (m && standNames.has(m[1]))
            return false;
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
        return fitByName(key.slice(end), key.slice(colon + 1, end), compiled);
    });
    return (fragment, workbench) => fit(`${workbench.length}:${workbench}${fragment}`);
}
const ID_ARGS = /^([^(]*)\((.*)\)$/;
function fromLine(heads, id, args, main) {
    const m = ID_ARGS.exec(id);
    const written = [...(m ? [m[2]] : []), ...Object.entries(args ?? {}).map(([k, v]) => `${k}=${v}`)];
    return `${heads.join(', ')} from ${m ? m[1] : id}${written.length ? `(${written.join(', ')})` : ''}${main ? ` ${main}` : ''}`;
}
const compilerOf = (resolve, compiled) => compiled ?? ((text) => compileSource(text, undefined, { resolve }));
function newDiagnostics(result, before) {
    const left = [...before];
    return result.diagnostics.filter((d) => {
        const i = left.findIndex((b) => sameDiagnostic(b, d));
        if (i < 0)
            return true;
        left.splice(i, 1);
        return false;
    });
}
function mainOn(bench, id, heads, args, compiled, stand) {
    const alone = compiled([bench, ...stand].join('\n'));
    const meets = (cell) => !newDiagnostics(compiled([bench, fromLine(heads, id, args, cell), ...stand].join('\n')), alone.diagnostics).length;
    const offers = parse(bench).offers;
    const named = offers?.length ? offers.map((n) => `&${n}`) : declarations(bench).map((l) => `&${l.name}`);
    const meeting = named.filter((n) => !heads.includes(n) && meets(n));
    return meeting.length === 1 ? meeting[0] : null;
}
function clearOf(bench, name) {
    const taken = namesIn(bench);
    const bare = name.replace(/^&/, '');
    if (!taken.has(bare))
        return `&${bare}`;
    let k = 2;
    while (taken.has(`${bare}${k}`))
        k++;
    return `&${bare}${k}`;
}
export function useOn(bench, id, options) {
    const compiled = compilerOf(options.resolve, options.compiled);
    const text = options.resolve(id);
    const head = bench.replace(/\s+$/, '');
    const written = (line) => [...(head ? [head] : []), line].join('\n');
    const usedBy = (whole) => compiled(whole).uses?.at(-1) ?? null;
    const signature = text === null ? null : signatureOf(text);
    if (text === null || !signature) {
        const line = `* from ${id}`;
        return { text: written(line), line, heads: [], main: null, used: text === null ? null : usedBy(written(line)) };
    }
    const heads = signature.names.length === 1 ? [options.head ?? clearOf(bench, signature.names[0])] : signature.names;
    const stand = holesOf(text, compiled, options.resolve)
        .sounds.filter((s) => !namesIn(bench).has(s.slice(1)))
        .map(standIn);
    const main = options.main ?? (signature.main ? mainOn(bench, id, heads, options.args, compiled, stand) : null);
    const line = fromLine(heads, id, options.args, main);
    return { text: written(line), line, heads, main, used: usedBy(written(line)) };
}
export function fitsAs(id, bench, options) {
    const compiled = compilerOf(options.resolve, options.compiled);
    const text = options.resolve(id);
    if (text === null)
        return { fits: false, text: bench, use: null, missing: [], sounds: [], unmet: [] };
    const signature = signatureOf(text);
    if (!signature) {
        const f = fitByName(text, bench, compiled, options.resolve);
        return { fits: f.fits, text: f.union.text, use: null, missing: f.missing, sounds: f.sounds, unmet: f.unmet, ...(f.diagnostics ? { diagnostics: f.diagnostics } : {}) };
    }
    const use = useOn(bench, id, { ...options, compiled });
    if (signature.main && use.main === null)
        return { fits: false, text: use.text, use, missing: [signature.main], sounds: [], unmet: [] };
    const benchNames = new Set(namesIn(bench));
    const sounds = holesOf(text, compiled, options.resolve)
        .sounds.filter((s) => !benchNames.has(s.slice(1)))
        .sort();
    const stand = sounds.map(standIn);
    const judged = [use.text, ...stand].join('\n');
    const result = compiled(judged);
    const standNames = new Set(sounds);
    const diagnostics = newDiagnostics(result, compiled([bench, ...stand].join('\n')).diagnostics).filter((d) => {
        const m = /^(&\w+) is only on a MIDI card: its sound/.exec(d.message);
        return !(m && standNames.has(m[1]));
    });
    const gave = new Set((use.used?.gave ?? []).map((n) => n.slice(1)));
    const unmet = clockNeeds(expansion(judged, { resolve: options.resolve }).text, result, gave, gave)
        .filter((t) => !meets(result, t))
        .map((t) => t.need);
    return { fits: !diagnostics.length && !unmet.length, text: use.text, use, missing: [], sounds, unmet, diagnostics };
}
