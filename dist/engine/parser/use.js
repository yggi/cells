const NAME = '&[A-Za-z_][A-Za-z0-9_]*';
const idOf = (written) => (written.startsWith('"') ? written.slice(1, -1) : written);
export const isWordId = (id) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(id);
export const isUse = (code) => /^\s*use(?![A-Za-z0-9_])/.test(code);
export function topTokens(text) {
    const out = [];
    let depth = 0;
    let quoted = false;
    let start = -1;
    for (let i = 0; i <= text.length; i++) {
        const c = text[i];
        if (c === undefined || (!quoted && depth === 0 && /\s/.test(c))) {
            if (start >= 0)
                out.push({ text: text.slice(start, i), at: start });
            start = -1;
            continue;
        }
        if (start < 0)
            start = i;
        if (c === '"')
            quoted = !quoted;
        else if (!quoted && '([{'.includes(c))
            depth++;
        else if (!quoted && ')]}'.includes(c))
            depth = Math.max(0, depth - 1);
    }
    return out;
}
function listIn(text) {
    if (!text.startsWith('(') || !text.endsWith(')'))
        return null;
    const inner = text.slice(1, -1);
    const out = [];
    let depth = 0;
    let quoted = false;
    let start = 0;
    for (let i = 0; i <= inner.length; i++) {
        const c = inner[i];
        if (c === undefined || (c === ',' && !quoted && depth === 0)) {
            out.push(inner.slice(start, i).trim());
            start = i + 1;
            continue;
        }
        if (c === '"')
            quoted = !quoted;
        else if (!quoted && '([{'.includes(c))
            depth++;
        else if (!quoted && ')]}'.includes(c))
            depth--;
    }
    return out.length === 1 && out[0] === '' ? [] : out;
}
const TAKEN = `${NAME}(?:=[A-Za-z_][A-Za-z0-9_]*)?`;
const LEFT = new RegExp(`^\\s*(\\*|${TAKEN}(?:\\s*,\\s*${TAKEN})*)(?=\\s|$)`);
const NAME_ALONE = new RegExp(`^${NAME}$`);
const WORD_ID = /^[A-Za-z_][A-Za-z0-9_]*/;
const QUOTED_ID = /^"[^"]*\S[^"]*"/;
export const isAttribute = (token) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(token);
function declarationOnly(tokens) {
    for (let i = 0; i < tokens.length; i++) {
        if (!isAttribute(tokens[i]))
            return false;
        if (tokens[i].startsWith('style=') && tokens[i + 1] === '*' && /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(tokens[i + 2] ?? ''))
            i += 2;
    }
    return true;
}
export const HEAD_FLAGS = new Set(['off']);
export function readFrom(code) {
    const left = LEFT.exec(code);
    if (!left)
        return undefined;
    const tokens = topTokens(code);
    const leftEnd = left[0].length;
    const from = tokens.findIndex((t) => t.at >= leftEnd && t.text === 'from');
    if (from < 0)
        return undefined;
    const all = left[1] === '*';
    const pairs = all ? null : left[1].split(',').map((n) => n.trim().split('='));
    const taken = pairs?.map(([n, t]) => [n, t === undefined ? n : `&${t}`]) ?? null;
    const once = (xs) => new Set(xs).size === xs.length;
    if (taken && pairs.some(([, t]) => t !== undefined) && !(once(taken.map(([n]) => n)) && once(taken.map(([, t]) => t))))
        return null;
    const unique = taken ? [...new Map(taken)] : null;
    const names = unique ? unique.map(([n]) => n) : null;
    const takes = unique ? unique.map(([, t]) => t) : null;
    const head = tokens.filter((t, i) => t.at >= leftEnd && i < from).map((t) => t.text);
    if (head.some((t) => !isAttribute(t) && !HEAD_FLAGS.has(t)) || (all && head.length))
        return null;
    const rest = code.slice(tokens[from].at + 4).trim();
    const restTokens = topTokens(rest).map((t) => t.text);
    if (all && !head.length && declarationOnly(restTokens))
        return { kind: 'declaration', attributes: restTokens };
    if (rest === '' || rest.startsWith('(') || rest.startsWith('&') || declarationOnly(restTokens)) {
        if (!names || head.length || takes.some((t, i) => t !== names[i]))
            return null;
        const after = restTokens;
        const optional = after[0]?.startsWith('(') ? listIn(after[0]) : [];
        if (optional === null || optional.some((p) => !NAME_ALONE.test(p)))
            return null;
        const tail = after.slice(after[0]?.startsWith('(') ? 1 : 0);
        const main = tail[0] !== undefined && !isAttribute(tail[0]) ? tail[0] : null;
        if (main !== null && !NAME_ALONE.test(main))
            return null;
        const attributes = tail.slice(main === null ? 0 : 1);
        if (!declarationOnly(attributes))
            return null;
        return { kind: 'signature', names, optional: [...new Set(optional)], main, ...(attributes.length ? { attributes } : {}) };
    }
    const idText = (QUOTED_ID.exec(rest) ?? WORD_ID.exec(rest))?.[0];
    if (!idText)
        return null;
    let tail = rest.slice(idText.length);
    let args = null;
    const open = /^\s*\(/.exec(tail);
    if (open) {
        const list = topTokens(tail.trimStart())[0].text;
        const parts = listIn(list);
        if (!parts)
            return null;
        args = [];
        for (const p of parts) {
            const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S[\s\S]*)$/.exec(p);
            if (!m || args.some((a) => a.name === m[1]))
                return null;
            args.push({ name: m[1], value: m[2].trim() });
        }
        tail = tail.trimStart().slice(list.length);
    }
    else if (tail && !/^\s/.test(tail))
        return null;
    const main = tail.trim();
    return { kind: 'use', id: idOf(idText), names, takes, head, args, main: main || null };
}
export const leftOf = (names, takes = names) => names ? names.map((n, i) => (takes && takes[i] !== n ? `${n}=${takes[i].slice(1)}` : n)).join(', ') : '*';
export const FROM_FORM = 'A from line says where its cells come from: &key from harmonic_minor D, &bar from swung_4_4(swing=8n:.64) &tempo, &bd, &sd from gm_kit, &kick=bd from gm_kit (the piece’s &kick, the kit’s bd), * from gm_kit; the head’s attributes go before from (&key label="…" from …), the named arguments in parentheses; with no id, a fragment’s signature: &bar from (&swing) &tempo';
export const USE_RETIRED = 'use is retired (decision 065): a line says where its cells come from, &bd, &sd from gm_kit (a collection, by name) or &key from diatonic(mode=dorian) D (a template, with its arguments)';
