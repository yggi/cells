import { splitComment } from "../edit.js";
import { parse } from "../parser/index.js";
import { readUse, writeUse } from "../parser/use.js";
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
        const already = lines.findIndex((l) => readUse(splitComment(l)[0])?.id === id);
        const prior = already >= 0 ? readUse(splitComment(lines[already])[0]) : null;
        const use = writeUse({ id, names: prior && !prior.names ? null : [...(prior?.names ?? []), ...names.filter((n) => !prior?.names?.includes(n))] });
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
            const at = lines.findIndex((l) => readUse(splitComment(l)[0])?.id === id);
            if (at >= 0) {
                const prior = readUse(splitComment(lines[at])[0]);
                if (prior.names && !prior.names.includes(`&${name}`))
                    lines[at] = writeUse({ id, names: [...prior.names, `&${name}`] }) + splitComment(lines[at])[1];
                return lines.join('\n');
            }
            let last = -1;
            lines.forEach((l, i) => {
                if (readUse(splitComment(l)[0]))
                    last = i;
            });
            lines.splice(last + 1, 0, writeUse({ id, names: [`&${name}`] }));
            return lines.join('\n');
        },
    }));
}
