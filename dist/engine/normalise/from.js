import { splitComment } from "../edit.js";
import { isAttribute, isWordId, readFrom, readUse, topTokens } from "../parser/use.js";
import { signatureOf } from "../use.js";
const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const idText = (id) => (isWordId(id) ? id : JSON.stringify(id));
const refersTo = (name) => new RegExp(`&${name}(?![A-Za-z0-9_])`);
function sharedNames(text, resolve) {
    const out = new Set();
    for (const raw of text.split('\n')) {
        const f = readFrom(splitComment(raw)[0].trim());
        const u = f?.kind === 'use' ? f : readUse(splitComment(raw)[0]);
        if (!u)
            continue;
        const theirs = resolve(u.id);
        if (theirs === null || signatureOf(theirs))
            continue;
        for (const n of u.names ?? theirs.split('\n').flatMap((l) => (HEAD.exec(splitComment(l)[0])?.[1] ? [`&${HEAD.exec(splitComment(l)[0])[1]}`] : [])))
            out.add(n);
    }
    return out;
}
function readAs(text, parameter) {
    const keys = new Set();
    for (const raw of text.split('\n')) {
        const code = splitComment(raw)[0];
        if (readFrom(code.trim()) !== undefined)
            continue;
        for (const t of topTokens(code).slice(1)) {
            if (!refersTo(parameter).test(t.text))
                continue;
            const read = new RegExp(`^([A-Za-z_][A-Za-z0-9_]*)=&${parameter}(?![A-Za-z0-9_])`).exec(t.text);
            if (!read)
                return null;
            keys.add(read[1]);
        }
    }
    const [key] = keys;
    return keys.size === 1 && ['step', 'loop', 'swing'].includes(key) ? key : null;
}
function asFrom(source, line, use, resolve) {
    const text = resolve(use.id);
    if (text === null)
        return null;
    const lines = source.split('\n');
    const codes = lines.map((l) => splitComment(l)[0]);
    const defined = new Map();
    codes.forEach((c, i) => {
        const name = HEAD.exec(c)?.[1];
        if (name && readFrom(c.trim()) === undefined && !defined.has(name))
            defined.set(name, i);
    });
    const given = new Set(codes.flatMap((c, i) => {
        if (i === line)
            return [];
        const f = readFrom(c.trim());
        const u = readUse(c) ?? (f?.kind === 'use' ? f : null);
        return u?.names ?? [];
    }));
    const exists = (name) => defined.has(name.slice(1)) || given.has(name);
    const signature = signatureOf(text);
    if (!signature)
        return { after: `${use.names ? use.names.join(', ') : '*'} from ${idText(use.id)}`, drop: null };
    const heads = signature.names;
    const shared = sharedNames(text, resolve);
    const reads = (name) => codes.some((c, i) => i !== line && i !== defined.get(name.slice(1)) && refersTo(name.slice(1)).test(c));
    const asked = use.names ?? heads;
    for (const n of asked)
        if (!heads.includes(n) && !shared.has(n) && !(signature.optional.includes(n) && exists(n)))
            return null;
    const taken = heads.filter((h) => asked.includes(h) || reads(h));
    if (!taken.length)
        return null;
    const args = signature.optional.filter(exists).map((p) => `${p.slice(1)}=${p}`);
    let main = '';
    let drop = null;
    if (signature.main) {
        const m = signature.main.slice(1);
        if (!exists(signature.main))
            return null;
        const at = defined.get(m);
        main = ` ${signature.main}`;
        const body = at === undefined
            ? ''
            : codes[at].trim()
                .slice(m.length + 1)
                .trim();
        const others = codes.some((c, i) => i !== at && i !== line && refersTo(m).test(c));
        const otherUses = codes.some((c, i) => {
            if (i === line)
                return false;
            const f = readFrom(c.trim());
            const u = readUse(c) ?? (f?.kind === 'use' ? f : null);
            const theirs = u ? resolve(u.id) : null;
            return theirs !== null && refersTo(m).test(theirs);
        });
        if (at !== undefined && body && !body.includes('&') && !others && !otherUses && !/free\(|label=|about=|title=|tags=/.test(body) && !lines[at].includes('#')) {
            const tokens = topTokens(body);
            const key = readAs(text, m);
            const alone = tokens.length === 1 && isAttribute(tokens[0].text) && key !== null && tokens[0].text.startsWith(`${key}=`);
            main = ` ${alone ? tokens[0].text.slice(key.length + 1) : body}`;
            drop = at;
        }
    }
    return { after: `${taken.join(', ')} from ${idText(use.id)}${args.length ? `(${args.join(', ')})` : ''}${main}`, drop };
}
export function fromUses(source, resolve) {
    if (!resolve)
        return [];
    return source.split('\n').flatMap((raw, i) => {
        const [code, comment] = splitComment(raw);
        const use = readUse(code);
        if (!use)
            return [];
        const said = asFrom(source, i, use, resolve);
        if (!said)
            return [];
        const { after, drop } = said;
        const before = code.trim();
        const dropped = drop === null ? null : source.split('\n')[drop];
        return [
            {
                id: `from:${i + 1}`,
                tool: 'normalise',
                rule: 'from',
                title: `${before} is written ${after}${dropped ? `, its ${dropped.trim()} written in` : ''} (decision 065)`,
                before,
                after,
                apply: (src) => src
                    .split('\n')
                    .flatMap((l, j) => {
                    if (j === i && l === raw)
                        return [`${/^\s*/.exec(code)[0]}${after}${comment ? `${/\s*$/.exec(code)[0]}${comment}` : ''}`];
                    if (drop !== null && j === drop && l === dropped)
                        return [];
                    return [l];
                })
                    .join('\n'),
            },
        ];
    });
}
