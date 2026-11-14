import { attrsOf, declLine, declWords, spansLines, splitComment } from "../edit.js";
import { parse } from "../parser/index.js";
import { isWordId, leftOf, readFrom } from "../parser/use.js";
function taking(code) {
    const f = readFrom(code.trim());
    return f?.kind === 'use' && !f.args && f.main === null && !f.head.length ? { id: f.id, names: f.names, takes: f.takes } : null;
}
const writeTaking = (id, names, takes = names) => `${leftOf(names, takes)} from ${isWordId(id) ? id : JSON.stringify(id)}`;
const codeOf = (line) => splitComment(line)[0].trim().replace(/\s+/g, ' ');
function homes(library) {
    const home = new Map();
    for (const f of library)
        for (const raw of f.text.split('\n')) {
            const code = codeOf(raw);
            const name = /^&([A-Za-z_][A-Za-z0-9_]*)\s/.exec(code)?.[1];
            if (name && !home.has(code))
                home.set(code, { id: f.id, name });
        }
    return home;
}
export function libraryLines(source, library) {
    if (!library?.length)
        return [];
    const home = homes(library);
    const lines = source.split('\n');
    const runsOn = (i) => /[+*,[]\s*$/.test(splitComment(lines[i])[0]) || (i > 0 && /[+*,[]\s*$/.test(splitComment(lines[i - 1])[0]));
    const declared = new Set(parse(source).cells.map((d) => d.name));
    const byId = new Map();
    lines.forEach((raw, i) => {
        const h = home.get(codeOf(raw));
        if (!h || runsOn(i) || !declared.has(h.name))
            return;
        const taken = byId.get(h.id) ?? { at: [], names: [] };
        taken.at.push(i);
        taken.names.push(`&${h.name}`);
        byId.set(h.id, taken);
    });
    return [...byId].map(([id, { at, names }]) => {
        const already = lines.findIndex((l) => taking(splitComment(l)[0])?.id === id);
        const prior = already >= 0 ? taking(splitComment(lines[already])[0]) : null;
        const more = names.filter((n) => !prior?.names?.includes(n) && !prior?.takes?.includes(n));
        const use = prior && !prior.names ? writeTaking(id, null) : writeTaking(id, [...(prior?.names ?? []), ...more], [...(prior?.takes ?? []), ...more]);
        const where = already >= 0 ? already : at[0];
        const comments = at.map((i) => splitComment(lines[i])[1].trim()).filter(Boolean);
        return {
            id: `library:${id}`,
            tool: 'normalise',
            rule: 'library',
            title: `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} ${JSON.stringify(id)}'s: ${use}`,
            before: at.map((i) => codeOf(lines[i])).join('; '),
            after: use,
            apply: (src) => {
                const now = src.split('\n');
                if (now.length !== lines.length || at.some((i) => now[i] !== lines[i]))
                    return src;
                const indent = /^\s*/.exec(now[where])[0];
                const comment = already >= 0 ? splitComment(now[already])[1].trim() : comments.join(' ');
                now[where] = `${indent}${use}${comment ? `  ${comment.startsWith('#') || comment.startsWith('//') ? comment : `# ${comment}`}` : ''}`;
                return now.filter((_, i) => i === where || !at.includes(i)).join('\n');
            },
        };
    });
}
export function libraryCells(source, library) {
    if (!library?.length)
        return [];
    const bodies = new Map();
    for (const [code, h] of homes(library)) {
        const body = code.slice(h.name.length + 2);
        if (body && !bodies.has(body))
            bodies.set(body, h);
    }
    const declared = new Set(parse(source).cells.map((d) => d.name));
    const found = new Map();
    for (const m of source.matchAll(/&\(([^()]*)\)/g)) {
        const h = bodies.get(m[1].trim().replace(/\s+/g, ' '));
        if (!h || declared.has(h.name))
            continue;
        const f = found.get(h.name) ?? { ...h, inline: [] };
        if (!f.inline.includes(m[0]))
            f.inline.push(m[0]);
        found.set(h.name, f);
    }
    return [...found.values()].map(({ id, name, inline }) => ({
        id: `library-cell:${name}`,
        tool: 'normalise',
        rule: 'library',
        title: `${inline[0]} is ${JSON.stringify(id)}'s &${name}: use it by name`,
        before: inline[0],
        after: `&${name}`,
        apply: (src) => {
            const lines = src.split('\n').map((l) => {
                const [code, comment] = splitComment(l);
                return inline.reduce((c, x) => c.split(x).join(`&${name}`), code) + comment;
            });
            const at = lines.findIndex((l) => taking(splitComment(l)[0])?.id === id);
            if (at >= 0) {
                const prior = taking(splitComment(lines[at])[0]);
                if (prior.names && !prior.names.includes(`&${name}`))
                    lines[at] = writeTaking(id, [...prior.names, `&${name}`], [...prior.takes, `&${name}`]) + splitComment(lines[at])[1];
                return lines.join('\n');
            }
            let last = -1;
            lines.forEach((l, i) => {
                if (readFrom(splitComment(l)[0].trim())?.kind === 'use')
                    last = i;
            });
            lines.splice(last + 1, 0, writeTaking(id, [`&${name}`]));
            return lines.join('\n');
        },
    }));
}
const kindOf = (v) => /^([a-z]\w*)\(/.exec(v)?.[1] ?? (/^[a-z]\w*$/.test(v) ? 'word' : 'other');
function templates(library, resolve) {
    const out = [];
    const bases = [...new Set(library.flatMap((f) => /^(\w+)\(/.exec(f.id)?.[1] ?? []))].filter((id) => !library.some((f) => f.id === id));
    const all = [
        ...library,
        ...bases.flatMap((id) => {
            const text = resolve?.(id);
            return typeof text === 'string' ? [{ id, text }] : [];
        }),
    ];
    for (const f of all) {
        if (!isWordId(f.id))
            continue;
        const lines = f.text.split('\n').map((l) => codeOf(l));
        const form = lines.map((l) => readFrom(l)).find((r) => r?.kind === 'signature' && r.names.length === 1);
        if (!form || form.kind !== 'signature')
            continue;
        const sig = [null, form.names[0].slice(1), form.optional.join(' '), form.main?.slice(1)];
        const head = sig[1];
        const declared = lines.find((l) => new RegExp(`^&${head}\\s`).test(l) && !readFrom(l));
        if (!declared)
            continue;
        const words = declWords(declared, head);
        const names = [...sig[2].matchAll(/&(\w+)/g)].map((m) => m[1]);
        const params = new Map();
        for (const p of names) {
            const line = lines.find((l) => new RegExp(`^&${p}\\s`).test(l));
            const rest = line ? line.slice(p.length + 2).trim() : null;
            const one = rest && /^(\w+)=(\S+)$/.exec(rest);
            params.set(p, one ? one[2] : rest);
        }
        out.push({ id: f.id, head, params, main: sig[3] ?? null, attrs: attrsOf(declared, head), braid: words.braid.join(' ') });
    }
    return out;
}
export function libraryTemplates(source, library, resolve) {
    if (!library?.length)
        return [];
    const out = [];
    const lines = source.split('\n');
    for (const t of templates(library, resolve)) {
        const i = declLine(source, t.head);
        if (i < 0 || spansLines(source, t.head))
            continue;
        const words = declWords(source, t.head);
        const attrs = attrsOf(source, t.head);
        const bound = new Map();
        let fits = true;
        const bind = (p, v) => {
            const d = t.params.get(p);
            if ((bound.has(p) && bound.get(p) !== v) || (d != null && !v.startsWith('&') && kindOf(v) !== kindOf(d)))
                fits = false;
            bound.set(p, v);
        };
        let braid = words.braid.join(' ');
        for (const [k, v] of t.attrs) {
            const p = /^&(\w+)$/.exec(v)?.[1];
            const isParam = p !== undefined && (t.params.has(p) || p === t.main);
            if (k === 'base' && isParam && !attrs.has('base')) {
                if (braid)
                    [braid] = [(bind(p, braid), '')];
                continue;
            }
            if (!attrs.has(k)) {
                if (!isParam || p === t.main || t.params.get(p) == null)
                    fits = false;
                continue;
            }
            if (isParam)
                bind(p, attrs.get(k));
            else if (attrs.get(k) !== v)
                fits = false;
        }
        if ([...attrs.keys()].some((k) => !t.attrs.has(k)))
            fits = false;
        if (t.braid) {
            const seen = new Set();
            const pattern = t.braid
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                .replace(/&(\w+)/g, (_, p) => (!(t.params.has(p) || p === t.main) ? `&${p}` : seen.has(p) ? `\\k<${p}>` : (seen.add(p), `(?<${p}>.+?)`)));
            const m = new RegExp(`^${pattern}$`).exec(braid.replace(/\s+/g, ' '));
            if (!m)
                fits = false;
            else
                for (const [p, v] of Object.entries(m.groups ?? {}))
                    bind(p, v.trim());
        }
        else if (braid)
            fits = false;
        if (!fits || (t.main && !bound.has(t.main)))
            continue;
        const args = [...t.params].flatMap(([p, d]) => (bound.has(p) && bound.get(p) !== d ? [`${p}=${bound.get(p)}`] : []));
        const use = `&${t.head} from ${isWordId(t.id) ? t.id : JSON.stringify(t.id)}${args.length ? `(${args.join(', ')})` : ''}${t.main ? ` ${bound.get(t.main)}` : ''}`;
        const before = codeOf(lines[i]);
        if (out.some((r) => r.after === use))
            continue;
        out.push({
            id: `template:${t.id}:${t.head}`,
            tool: 'normalise',
            rule: 'library',
            title: `&${t.head} is ${JSON.stringify(t.id)}'s, with ${args.length ? args.join(', ') : 'its defaults'}: ${use}`,
            before,
            after: use,
            apply: (src) => {
                const now = src.split('\n');
                const j = declLine(src, t.head);
                if (j < 0 || codeOf(now[j]) !== before)
                    return src;
                const [code, comment] = splitComment(now[j]);
                const indent = /^\s*/.exec(code)[0];
                const pad = comment ? ' '.repeat(Math.max(1, code.length - indent.length - use.length)) : '';
                now[j] = `${indent}${use}${pad}${comment}`;
                return now.join('\n');
            },
        });
    }
    return out;
}
