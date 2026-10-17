const COLOUR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|(?:rgb|rgba|hsl|hsla)\(\s*[-0-9.%\s,/]{1,40}\)|var\(--[a-z0-9-]{1,40}\))$/;
export const pluginKey = (p) => JSON.stringify([p.fits, p.size, p.rim, p.meaning, p.dial, Object.entries(p.tokens)]) + '\n' + p.code.replace(/\r\n?/g, '\n');
const OPEN = /^=== plugin ([a-z]+) ===\s*$/;
const CLOSE = /^=== end ===\s*$/;
export const PLUGIN_SYNTAX = '=== plugin name === … === end ===';
const HAS = /^=== plugin /m;
export function splitPlugins(source, reserved = [], builtin = false) {
    if (!HAS.test(source))
        return { text: source, plugins: [], diagnostics: [] };
    const lines = source.split('\n');
    const plugins = [];
    const diagnostics = [];
    const fail = (line, message, severity = 'error') => diagnostics.push({ severity, message, span: { line, col: 1, len: Math.max(1, lines[line - 1]?.length ?? 1) } });
    for (let i = 0; i < lines.length; i++) {
        const open = OPEN.exec(lines[i]);
        if (!open) {
            if (CLOSE.test(lines[i]))
                fail(i + 1, `=== end === without a plugin block before it (${PLUGIN_SYNTAX})`);
            continue;
        }
        const start = i;
        let end = start + 1;
        while (end < lines.length && !CLOSE.test(lines[end]))
            end++;
        const body = lines.slice(start + 1, end).join('\n');
        const closed = end < lines.length;
        if (!closed)
            fail(start + 1, `plugin ${open[1]} has no === end === line`);
        const name = open[1];
        if (reserved.includes(name))
            fail(start + 1, `${name} is a show of its own: a plugin needs another name`);
        else if (plugins.some((p) => p.name === name))
            fail(start + 1, `plugin ${name} is written twice`);
        else {
            const made = readBlock(name, body, start + 1, builtin);
            if (typeof made === 'string')
                fail(start + 1, `plugin ${name}: ${made}`);
            else
                plugins.push(made);
        }
        for (let k = start; k <= Math.min(end, lines.length - 1); k++)
            lines[k] = '';
        i = end;
    }
    return { text: lines.join('\n'), plugins, diagnostics };
}
function firstObject(text) {
    const from = text.indexOf('{');
    if (from < 0 || text.slice(0, from).trim())
        return null;
    let depth = 0;
    let quoted = false;
    for (let i = from; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '\\')
                i++;
            else if (ch === '"')
                quoted = false;
        }
        else if (ch === '"')
            quoted = true;
        else if (ch === '{')
            depth++;
        else if (ch === '}' && --depth === 0)
            return { json: text.slice(from, i + 1), rest: text.slice(i + 1) };
    }
    return null;
}
function readBlock(name, body, line, builtin) {
    const obj = firstObject(body);
    if (!obj)
        return 'starts with its manifest, a { … } of JSON: { "fits": ["meter"], "size": 200 }';
    let m;
    try {
        m = JSON.parse(obj.json);
    }
    catch (e) {
        return `its manifest is not JSON (${e.message})`;
    }
    if (typeof m !== 'object' || m === null || Array.isArray(m))
        return 'its manifest is an object';
    const o = m;
    const known = ['fits', 'size', 'rim', 'meaning', 'dial', 'tokens'];
    const stray = Object.keys(o).find((k) => !known.includes(k));
    if (stray)
        return `its manifest has no "${stray}" (it has: ${known.join(', ')})`;
    if (!Array.isArray(o.fits) || !o.fits.length || !o.fits.every((f) => typeof f === 'string'))
        return '"fits" lists the kinds of cell it shows: ["meter"]';
    const size = o.size ?? 200;
    if (typeof size !== 'number' || !(size >= 60 && size <= 400))
        return '"size" is a number from 60 to 400';
    if (o.rim !== undefined && typeof o.rim !== 'boolean')
        return '"rim" is true or false';
    if (o.meaning !== undefined && typeof o.meaning !== 'string')
        return '"meaning" is a text';
    let dial = null;
    if (o.dial !== undefined) {
        const d = o.dial;
        const ok = d && typeof d === 'object' && typeof d.label === 'string' && typeof d.turn === 'number' && d.turn > 0 && typeof d.key === 'number' && d.key > 0;
        if (!ok)
            return '"dial" is { "label": "The day", "turn": 86400, "key": 3600 }: a name, seconds for a turn, seconds for a key press';
        dial = { label: d.label, turn: d.turn, key: d.key };
    }
    const tokens = {};
    if (o.tokens !== undefined) {
        const t = o.tokens;
        if (!t || typeof t !== 'object' || Object.values(t).some((v) => typeof v !== 'string' || !COLOUR.test(v)))
            return '"tokens" maps names to colours (#rgb, rgb(…), hsl(…), a name, var(--x)): { "sun": "#ffd84a" }';
        if (Object.keys(t).includes('__proto__'))
            return '"tokens": a token can\'t be called __proto__';
        Object.assign(tokens, t);
    }
    return {
        name,
        fits: o.fits,
        size,
        rim: o.rim !== false,
        meaning: o.meaning ?? '',
        dial,
        tokens,
        code: obj.rest.replace(/^\n+|\s+$/g, ''),
        builtin,
        line,
    };
}
