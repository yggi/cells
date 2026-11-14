import { splitComment } from "../engine/edit.js";
import { topTokens } from "../engine/parser/use.js";
import { AXIS_NAMES } from "../engine/style.js";
export const FOLDER_FACETS = {
    bands: 'band',
    bass: 'bass',
    expression: 'expression',
    forms: 'form',
    harmony: 'harmony',
    instruments: 'instrument',
    meters: 'meter',
    modes: 'mode',
    modules: 'module',
    motifs: 'motif',
    performers: 'performer',
    rhythms: 'rhythm',
    stab: 'stab',
    styles: 'style',
};
export const RESERVED = ['style', 'facet'];
const NUMBER = /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/;
const NAMES = /^&[A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*&[A-Za-z_][A-Za-z0-9_]*)*$/;
export function isDeclaration(code) {
    return declarationAttributes(code) !== null;
}
function declarationAttributes(code) {
    const tokens = topTokens(code);
    const from = tokens.findIndex((t) => t.text === 'from');
    if (from < 1)
        return null;
    const left = code.slice(0, tokens[from].at).trim();
    const after = tokens.slice(from + 1).map((t) => t.text);
    const isAttr = (t) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(t) || t === '*' || NUMBER.test(t);
    if (left === '*')
        return after.every(isAttr) ? after : null;
    if (!NAMES.test(left))
        return null;
    let i = 0;
    if (after[i]?.startsWith('('))
        i++;
    if (after[i]?.startsWith('&') && !after[i].startsWith('&('))
        i++;
    if (i === 0 && after.length && !isAttr(after[0]))
        return null;
    return after.slice(i).every(isAttr) ? after.slice(i) : null;
}
function readPoint(text, styles) {
    if (/^&[A-Za-z_][A-Za-z0-9_]*$/.test(text)) {
        const point = styles.get(text.slice(1));
        return point ? { point } : `style=${text}: no style of that name in styles`;
    }
    const inline = /^&\(\s*map=style\s+([\s\S]*)\)$/.exec(text);
    if (!inline)
        return `style=${text}: a style, &funk, or an inline one, &(map=style sync=.3 bite=.55)`;
    const body = inline[1].trim();
    const ordered = body.split(/\s+/);
    if (ordered.length === AXIS_NAMES.length && ordered.every((v) => NUMBER.test(v)))
        return { point: Object.fromEntries(AXIS_NAMES.map((a, i) => [a, parseFloat(ordered[i])])) };
    const point = {};
    const reach = {};
    const AXIS = /([A-Za-z_]+)=(-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))(?:\s*(?:±|\+-)\s*([0-9]+(?:\.[0-9]+)?|\.[0-9]+))?/y;
    let at = 0;
    while (at < body.length) {
        while (body[at] === ' ')
            at++;
        if (at >= body.length)
            break;
        AXIS.lastIndex = at;
        const m = AXIS.exec(body);
        if (!m)
            return `style=${text}: an axis by name, sync=.3, or one ± a reach, bite=.55 ± .1`;
        const [, axis, value, r] = m;
        if (!AXIS_NAMES.includes(axis))
            return `style=${text}: ${axis} is no axis (the axes: ${AXIS_NAMES.join(' ')})`;
        if (axis in point)
            return `style=${text}: ${axis}= twice`;
        point[axis] = parseFloat(value);
        if (r !== undefined)
            reach[axis] = parseFloat(r);
        at = AXIS.lastIndex;
    }
    if (!Object.keys(point).length)
        return `style=${text}: a point names an axis at least`;
    return Object.keys(reach).length ? { point, reach } : { point };
}
function readStyle(text, styles) {
    const set = /^\(([\s\S]*)\)$/.exec(text);
    const members = set ? splitTop(set[1], '|') : [text];
    const out = [];
    for (const raw of members) {
        const m = /^([\s\S]*?)(?:\s*\*\s*(-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)))?$/.exec(raw.trim());
        const read = readPoint(m[1].trim(), styles);
        if (typeof read === 'string')
            return read;
        const weight = m[2] === undefined ? 1 : parseFloat(m[2]);
        if (!(weight > 0))
            return `style=${text}: a weight is a number above 0`;
        out.push({ ...read, weight });
    }
    return out;
}
function splitTop(text, sep) {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '(')
            depth++;
        else if (c === ')')
            depth--;
        else if (c === sep && depth === 0) {
            out.push(text.slice(start, i));
            start = i + 1;
        }
    }
    out.push(text.slice(start));
    return out;
}
export function readDeclaration(code, options) {
    const attrs = declarationAttributes(code);
    if (attrs === null)
        return null;
    const problems = [];
    let style = null;
    let facet = options.facet;
    const args = {};
    for (let i = 0; i < attrs.length; i++) {
        const t = attrs[i];
        const eq = t.indexOf('=');
        if (eq < 0) {
            problems.push(`${t}: an attribute, name=value`);
            continue;
        }
        const name = t.slice(0, eq);
        let value = t.slice(eq + 1);
        if (name === 'style' && attrs[i + 1] === '*' && NUMBER.test(attrs[i + 2] ?? '')) {
            value = `${value} * ${attrs[i + 2]}`;
            i += 2;
        }
        if (name === 'style')
            style = value;
        else if (name === 'facet')
            facet = value;
        else if (!options.template)
            problems.push(`${name}=: a collection's declaration has no arguments (style= and facet= only)`);
        else if (/^[A-Za-z0-9_.#:/+*(),"' -]+$/.test(value) && !/[&=]/.test(value))
            args[name] = value;
        else
            problems.push(`${name}=${value}: an argument is a value (a word, a number, 8n:2/3, meter("7/8"))`);
    }
    const extra = { ...(facet === undefined ? {} : { facet }), ...(Object.keys(args).length ? { args } : {}) };
    if (style === null)
        return { points: [{ point: {}, weight: 1, ...extra }], problems };
    const read = readStyle(style, options.styles);
    if (typeof read === 'string')
        return { points: [], problems: [...problems, read] };
    return { points: read.map(({ point, weight, reach }) => ({ point, weight, ...extra, ...(reach ? { reach } : {}) })), problems };
}
export function associationOf(text, options) {
    const lines = text.split('\n').map((raw) => splitComment(raw)[0].trim());
    const template = lines.some((code) => {
        const a = declarationAttributes(code);
        return a !== null && !code.startsWith('*');
    });
    const association = [];
    const problems = [];
    let found = false;
    let explicit = false;
    for (const code of lines) {
        const d = readDeclaration(code, { ...options, template });
        if (!d)
            continue;
        found = true;
        if (code.startsWith('*') || declarationAttributes(code).length)
            explicit = true;
        association.push(...d.points);
        problems.push(...d.problems);
    }
    return found ? { association, problems, explicit } : null;
}
export function withoutDeclarations(text) {
    const seen = new Set();
    return text
        .split('\n')
        .flatMap((raw) => {
        const code = splitComment(raw)[0].trim();
        const attrs = declarationAttributes(code);
        if (attrs === null)
            return [raw];
        if (code.startsWith('*'))
            return [];
        const bare = attrs.length ? code.slice(0, code.lastIndexOf(attrs[0])).trimEnd() : code;
        if (seen.has(bare))
            return [];
        seen.add(bare);
        return [attrs.length ? bare : raw];
    })
        .join('\n');
}
