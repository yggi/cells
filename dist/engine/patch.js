import { signatureOf } from "./use.js";
import { attrValue as valueOf, declLine, splitComment, splitWords, wordAt } from "./edit.js";
import { readFrom, topTokens } from "./parser/use.js";
import { VOICE_PARAMS } from "./attributes.js";
export class PatchError extends Error {
}
export const MOVING = ['lpf', 'lpq', 'hpf', 'hpq', 'bpf', 'bpq', 'room', 'delay'];
const CELL = ['pitch', 'env', 'fm'];
const NAME = /^&([A-Za-z_][A-Za-z0-9_]*)$/;
const refName = (term) => NAME.exec(term)?.[1] ?? null;
const writeValue = (base, factors) => [base, ...factors].join(' * ');
function moduleLine(lines, cell) {
    for (let i = 0; i < lines.length; i++) {
        const form = readFrom(splitComment(lines[i])[0].trim());
        if (form && form.kind === 'use' && form.names?.length === 1 && form.names[0] === `&${cell}`)
            return { index: i, form };
    }
    return null;
}
function lineBody(text, name) {
    for (const l of text.split('\n')) {
        const code = splitComment(l)[0].trim();
        if (code.startsWith(`${name} `) && readFrom(code) === undefined)
            return code.slice(name.length).trim();
    }
    return null;
}
const readsAsSound = (text, name) => new RegExp(`\\[[^\\]]*${name}(?![A-Za-z0-9_])[^\\]]*\\]`).test(text);
function entriesOf(main) {
    const t = main.trim();
    if (!t.startsWith('[') || !t.endsWith(']') || wordAt(t, 0).text !== t)
        return null;
    const inner = t.slice(1, -1);
    const out = [];
    let depth = 0;
    let cur = '';
    for (const c of inner) {
        if (c === '[' || c === '(')
            depth++;
        if (c === ']' || c === ')')
            depth--;
        if (c === ',' && depth === 0)
            (out.push(cur.trim()), (cur = ''));
        else
            cur += c;
    }
    if (cur.trim())
        out.push(cur.trim());
    return out;
}
const entryCell = (entry) => /^&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_[^(])/.exec(entry.trim())?.[1] ?? null;
function sortOf(code) {
    const words = splitWords(code).slice(1);
    if (words.some((w) => /^map=(sample|midi|role)\b/.test(w)))
        return null;
    const braid = words.filter((w) => !/^[a-z][a-zA-Z]*=/.test(w) && w !== 'off');
    if (braid.length === 1 && braid[0].startsWith('['))
        return 'instrument';
    return words.some((w) => VOICE_PARAMS.has(w.slice(0, Math.max(0, w.indexOf('='))))) ? 'voice' : null;
}
export function jacksOf(source, cell, resolve) {
    const lines = source.split('\n');
    const module = moduleLine(lines, cell);
    if (module) {
        const text = resolve?.(module.form.id) ?? null;
        const signature = text ? signatureOf(text) : null;
        if (!text || !signature)
            return [];
        const args = new Map((module.form.args ?? []).map((a) => [a.name, a.value]));
        const jacks = signature.optional.map((p) => {
            const name = p.slice(1);
            const given = args.get(name);
            const patched = given && refName(given) ? [refName(given)] : [];
            const knob = lineBody(text, p);
            const band = knob && (knob.startsWith('[') || sortOf(`${p} ${knob}`) === 'voice') ? 'audio' : 'cv';
            return { port: name, kind: 'argument', band, patched, knob: given && !patched.length ? given : knob };
        });
        if (signature.main) {
            const main = module.form.main;
            const entries = main ? (entriesOf(main) ?? [main]) : [];
            const patched = entries.flatMap((e) => entryCell(e) ?? []);
            jacks.push({ port: signature.main.slice(1), kind: 'input', band: readsAsSound(text, signature.main) ? 'audio' : 'cv', patched, knob: null });
        }
        return jacks;
    }
    const i = declLine(source, cell);
    if (i < 0)
        return [];
    const code = splitComment(lines[i])[0];
    const sort = sortOf(code);
    if (!sort)
        return [];
    const attribute = (port, band) => {
        const v = valueOf(code, port);
        if (!v)
            return { port, kind: 'attribute', band, patched: [], knob: null };
        const alone = refName(v.base);
        return { port, kind: 'attribute', band, patched: [...(alone ? [alone] : []), ...v.factors.flatMap((f) => refName(f) ?? [])], knob: alone ? null : v.base };
    };
    const jacks = MOVING.map((k) => attribute(k, 'cv'));
    if (sort === 'instrument')
        return jacks;
    jacks.push(attribute('pitch', 'cv'), attribute('env', 'cv'), attribute('fm', 'audio'));
    if (valueOf(code, 'fm'))
        jacks.push(attribute('index', 'cv'));
    return jacks;
}
export function patch(source, cell, port, from, resolve) {
    return rewire(source, cell, port, from, 'in', resolve);
}
export function unpatch(source, cell, port, from, resolve) {
    return rewire(source, cell, port, from, 'out', resolve);
}
function defines(source, name) {
    if (declLine(source, name) >= 0)
        return true;
    return source.split('\n').some((l) => {
        const form = readFrom(splitComment(l)[0].trim());
        return !!form && form.kind === 'use' && !!form.names?.includes(`&${name}`);
    });
}
function rewire(source, cell, port, from, way, resolve) {
    const jack = jacksOf(source, cell, resolve).find((j) => j.port === port);
    if (!jack)
        throw new PatchError(`&${cell} has no jack ${port}`);
    if (way === 'in' && jack.patched.includes(from))
        return source;
    if (way === 'out' && !jack.patched.includes(from))
        return source;
    if (way === 'in') {
        if (from === cell)
            throw new PatchError(`&${cell} can't be patched into itself`);
        if (!defines(source, from))
            throw new PatchError(`&${from} is defined nowhere in the text: write it first`);
    }
    const lines = source.split('\n');
    const module = jack.kind === 'attribute' ? null : moduleLine(lines, cell);
    const index = module ? module.index : declLine(source, cell);
    const [code, comment] = splitComment(lines[index].replace(/\r$/, ''));
    const cr = lines[index].endsWith('\r') ? '\r' : '';
    const next = module ? moduleCode(code, module.form, jack, from, way) : attributeCode(code, cell, jack, from, way);
    lines[index] = (comment ? `${next.trimEnd()} ` : next.trimEnd()) + comment + cr;
    return lines.join('\n');
}
function attributeCode(code, cell, jack, from, way) {
    const v = valueOf(code, jack.port);
    const ref = `&${from}`;
    const set = (value) => {
        if (v)
            return value === null
                ? (code.slice(0, v.start - jack.port.length - 1).trimEnd() + ' ' + code.slice(v.end).trimStart()).trim()
                : code.slice(0, v.start) + value + code.slice(v.end);
        const head = /^\s*&[A-Za-z_][A-Za-z0-9_]*/.exec(code)[0];
        return `${head} ${jack.port}=${value}${code.slice(head.length)}`;
    };
    const single = CELL.includes(jack.port) && !(v && v.base.includes('..'));
    if (single) {
        if (way === 'out')
            return v && refName(v.base) === from && !v.factors.length ? set(null) : code;
        if (v)
            throw new PatchError(`&${cell}'s ${jack.port}= holds ${v.base}: pull it out first (a jack takes one cable)`);
        return set(ref);
    }
    if (way === 'in') {
        if (!v)
            throw new PatchError(`&${cell} has no ${jack.port}= written: write its value first (${jack.port}=…), a knob for the cable to move`);
        if (refName(v.base))
            throw new PatchError(`&${cell}'s ${jack.port}= is one cell, &${refName(v.base)}: two cells multiply a range (${jack.port}=lo..hi * &a * &b), or add (a sum)`);
        const base = v.base.includes('..') ? v.base : `${v.base}..${v.base}`;
        return set(writeValue(base, [...v.factors, ref]));
    }
    if (!v)
        return code;
    if (refName(v.base) === from && !v.factors.length)
        return set(null);
    const factors = v.factors.filter((f) => refName(f) !== from);
    if (factors.length)
        return set(writeValue(v.base, factors));
    return set(v.base.split('..')[0]);
}
function moduleCode(code, form, jack, from, way) {
    const tokens = topTokens(code);
    const at = tokens.findIndex((t) => t.text === 'from');
    const idToken = tokens[at + 1];
    const id = idToken.text.replace(/\(.*$/s, '');
    const ref = `&${from}`;
    let args = [...(form.args ?? [])];
    let main = form.main;
    if (jack.kind === 'argument') {
        const given = args.find((a) => a.name === jack.port);
        const name = form.names[0];
        if (way === 'in' && given)
            throw new PatchError(refName(given.value)
                ? `${name}'s ${jack.port} holds &${refName(given.value)}: pull it out first (a jack takes one cable)`
                : `${name}'s ${jack.port} is set on the line (${given.value}): a cable would replace it, so clear it first (a jack takes one cable; a knob and a cable together are a sum)`);
        args = args.filter((a) => a.name !== jack.port);
        if (way === 'in')
            args.push({ name: jack.port, value: ref });
    }
    else {
        const entries = main ? (entriesOf(main) ?? [main]) : [];
        if (way === 'in')
            main = entries.length ? `[${[...entries, ref].join(', ')}]` : ref;
        else {
            const kept = entries.filter((e) => entryCell(e) !== from);
            if (!kept.length)
                throw new PatchError(`${ref} is the only input of &${form.names[0].slice(1)}: a module takes something in (patch another first)`);
            main = kept.length === 1 && refName(kept[0]) ? kept[0] : `[${kept.join(', ')}]`;
        }
    }
    const list = args.length ? `(${args.map((a) => `${a.name}=${a.value}`).join(', ')})` : '';
    return `${code.slice(0, idToken.at)}${id}${list}${main ? ` ${main}` : ''}`;
}
