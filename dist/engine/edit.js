import { readFrom } from "./parser/use.js";
export function splitComment(line) {
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"')
            quoted = !quoted;
        else if (!quoted && ((c === '/' && line[i + 1] === '/') || (c === '#' && (i === 0 || /\s/.test(line[i - 1])))))
            return [line.slice(0, i), line.slice(i)];
    }
    return [line, ''];
}
const headOf = (name) => new RegExp(`^(\\s*&${name})(?=\\s|$)`);
export function declLine(source, name) {
    const head = headOf(name);
    return source.split('\n').findIndex((l) => head.test(splitComment(l)[0]) && readFrom(splitComment(l)[0].trim()) === undefined);
}
function sectionLine(lines, name) {
    return lines.findIndex((l) => {
        const words = splitWords(splitComment(l)[0]);
        if (!/^&\w+$/.test(words[0] ?? '') || !words.some((w) => w.startsWith('step=')))
            return false;
        const rest = words.slice(1).filter((w) => !isAttrWord(w));
        return rest.length > 0 && rest.every((w) => /^&\w+$/.test(w)) && rest.includes(`&${name}`);
    });
}
function editDecl(source, name, f) {
    const lines = source.split('\n');
    let i = declLine(source, name);
    const table = sectionLine(lines, name);
    if (i < 0) {
        if (table < 0)
            return source;
        lines.splice(table + 1, 0, `&${name}${lines[table].endsWith('\r') ? '\r' : ''}`);
        i = table + 1;
    }
    const cr = lines[i].endsWith('\r') ? '\r' : '';
    const [code, comment] = splitComment(cr ? lines[i].slice(0, -1) : lines[i]);
    let next = f(code, headOf(name));
    if (table >= 0 && !comment && next.trim() === `&${name}`) {
        lines.splice(i, 1);
        return lines.join('\n');
    }
    if (comment) {
        const before = code.length;
        const trimmed = next.replace(/\s+$/, '');
        next = trimmed + ' '.repeat(Math.max(1, before - trimmed.length));
    }
    lines[i] = next + comment + cr;
    return lines.join('\n');
}
export function setAttr(source, name, key, value) {
    return editDecl(source, name, (code, head) => {
        const val = `(?:"[^"]*"|[^\\s(]*\\([^)]*\\)[^\\s]*|\\S+)`;
        const attr = new RegExp(`(\\s)${key}=${val}`);
        if (attr.test(code))
            return value === null ? code.replace(new RegExp(`\\s${key}=${val}`), '') : code.replace(attr, `$1${key}=${value}`);
        return value === null ? code : code.replace(head, `$1 ${key}=${value}`);
    });
}
export function renameAttr(source, name, from, to) {
    return editDecl(source, name, (code) => code.replace(new RegExp(`(\\s)${from}=`), `$1${to}=`));
}
function setFlag(source, name, flag, on) {
    return editDecl(source, name, (code, head) => {
        const re = new RegExp(`\\s${flag}(?=\\s|$)`);
        if (re.test(code))
            return on ? code : code.replace(re, '');
        return on ? code.replace(head, `$1 ${flag}`) : code;
    });
}
const FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Ab', 'Eb', 'Bb', 'F'];
export function setShift(source, name, shift) {
    const lines = source.split('\n');
    const own = declLine(source, name);
    if (sectionLine(lines, name) >= 0 && (own < 0 || (splitWords(splitComment(lines[own])[0]).slice(1).every(isAttrWord) && !/\sshift=/.test(lines[own]))))
        return source;
    let circle = false;
    const turned = editDecl(source, name, (code) => {
        const m = /\bfifths\(([^)]*)\)/.exec(code);
        if (!m || /\sshift=/.test(code))
            return code;
        circle = true;
        if (m[1].includes('('))
            return code;
        const byName = /^\s*[A-G]/.test(m[1]);
        const arg = shift === 0 && !byName ? '' : byName ? FIFTHS[((shift % 12) + 12) % 12] : String(shift);
        return code.replace(m[0], `fifths(${arg})`);
    });
    return circle ? turned : setAttr(source, name, 'shift', shift === 0 ? null : String(shift));
}
export const setOff = (source, name, off) => setFlag(source, name, 'off', off);
export function splitWords(code) {
    const out = [];
    let depth = 0;
    let angle = 0;
    let quoted = false;
    let cur = '';
    for (const ch of code) {
        if (ch === '"')
            quoted = !quoted;
        if (!quoted && (ch === '[' || ch === '('))
            depth++;
        if (!quoted && (ch === ']' || ch === ')'))
            depth = Math.max(0, depth - 1);
        if (!quoted && depth === 0 && ch === '<')
            angle++;
        if (!quoted && depth === 0 && ch === '>')
            angle = Math.max(0, angle - 1);
        if (/\s/.test(ch) && depth === 0 && angle === 0 && !quoted) {
            if (cur)
                out.push(cur);
            cur = '';
        }
        else
            cur += ch;
    }
    if (cur)
        out.push(cur);
    return out;
}
const isAttrWord = (w) => /^[a-z][a-zA-Z]*=/.test(w) || w === 'off';
export function spansLines(source, name) {
    const i = declLine(source, name);
    return i >= 0 && /[+*,[]\s*$/.test(splitComment(source.split('\n')[i])[0]);
}
export function declWords(source, name) {
    const i = declLine(source, name);
    if (i < 0)
        return null;
    const words = splitWords(splitComment(source.split('\n')[i])[0]);
    const head = words.slice(0, 1);
    const rest = words.slice(head.length);
    return { head, attrs: rest.filter(isAttrWord), braid: rest.filter((w) => !isAttrWord(w)) };
}
export function attrsOf(source, name) {
    const w = declWords(source, name);
    const out = new Map();
    for (const a of w?.attrs ?? []) {
        const eq = a.indexOf('=');
        if (eq < 0)
            out.set(a, '');
        else
            out.set(a.slice(0, eq), a.slice(eq + 1));
    }
    return out;
}
export function setBraid(source, name, braid) {
    const w = declWords(source, name);
    if (!w || spansLines(source, name))
        return source;
    const free = w.braid.length === 1 && /^free\(\s*[^"\s]/.test(w.braid[0]) && braid.length > 0;
    return editDecl(source, name, (code) => {
        const indent = /^\s*/.exec(code)[0];
        return indent + [...w.head, ...w.attrs, ...(free ? [`free(${braid.join(' ')})`] : braid)].join(' ');
    });
}
export function setTiming(source, name, key, value) {
    const other = key === 'step' ? 'loop' : 'step';
    return setAttr(setAttr(source, name, other, null), name, key, value);
}
export function deleteCell(source, name) {
    const lines = source.split('\n');
    const i = declLine(source, name);
    if (i < 0)
        return source;
    let end = i;
    while (end + 1 < lines.length && /[+*,[]\s*$/.test(splitComment(lines[end])[0]))
        end++;
    lines.splice(i, end - i + 1);
    return lines.join('\n');
}
export function usersOf(source, name) {
    const re = new RegExp(`&${name}(?![A-Za-z0-9_])`);
    const users = [];
    for (const line of source.split('\n')) {
        const code = splitComment(line)[0];
        const head = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(code);
        if (!head || head[1] === name || readFrom(code) !== undefined)
            continue;
        if (re.test(code.slice(head[0].length)))
            users.push(head[1]);
    }
    return users;
}
export function freshName(source, stem = 'cell') {
    for (let k = 1;; k++)
        if (declLine(source, `${stem}${k}`) < 0)
            return `${stem}${k}`;
}
export function addCell(source) {
    const name = freshName(source);
    const body = source.replace(/\s*$/, '');
    return { source: `${body}\n&${name}\n`, name };
}
export function nameProblem(source, name, current) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
        return 'Letters, digits and _ only, starting with a letter';
    if (name !== current && declLine(source, name) >= 0)
        return `&${name} already exists`;
    return null;
}
export function renameCell(source, from, to) {
    if (from === to || nameProblem(source, to, from))
        return source;
    const re = new RegExp(`&${from}(?![A-Za-z0-9_])`, 'g');
    return source
        .split('\n')
        .map((line) => {
        const [code, comment] = splitComment(line);
        return code.replace(re, `&${to}`) + comment;
    })
        .join('\n');
}
export function splitToken(token) {
    const m = /^(.*)@(\d+)$/.exec(token);
    if (m && +m[2] > 1) {
        const n = +m[2];
        const a = Math.floor(n / 2);
        const b = n - a;
        const w = (k) => (k === 1 ? m[1] : `${m[1]}@${k}`);
        return [w(a), w(b)];
    }
    return [token, token];
}
function replaceSpan(source, span, text) {
    const lines = source.split('\n');
    const l = lines[span.line - 1];
    if (l === undefined)
        return source;
    lines[span.line - 1] = l.slice(0, span.col - 1) + text + l.slice(span.col - 1 + span.len);
    return lines.join('\n');
}
export function setFree(source, spec, value) {
    if (spec.braid !== undefined)
        return replaceSpan(source, spec.span, `free(${String(value).replace(/[()]/g, '').trim() || spec.braid})`);
    if (typeof value === 'string')
        return replaceSpan(source, spec.span, `free("${value.replace(/"/g, '')}")`);
    const v = Math.min(spec.hi, Math.max(spec.lo, value));
    if (spec.byName) {
        const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
        const own = spec.labels && spec.labels.join(' ') !== names.join(' ') ? `, "${spec.labels.join(' ')}"` : '';
        return replaceSpan(source, spec.span, `free(${names[Math.round(v) % 12]}${own})`);
    }
    const range = spec.hi - spec.lo;
    const digits = spec.labels ? 0 : range >= 20 ? 0 : range >= 2 ? 1 : 2;
    const named = spec.labels ? `, "${spec.labels.join(' ')}"` : '';
    const text = `free(${+v.toFixed(digits)}${spec.unit}, ${spec.lo}..${spec.hi}${named})`;
    return replaceSpan(source, spec.span, text);
}
