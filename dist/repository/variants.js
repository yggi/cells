import { signatureOf } from "../engine/use.js";
export const takenAs = (id, args) => `${id}(${Object.entries(args)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')})`;
export function boundText(text, args) {
    const signature = signatureOf(text);
    if (!signature)
        throw new Error(`boundText: a template's arguments, but the text has no signature`);
    const bound = Object.keys(args).map((k) => `&${k}`);
    for (const p of bound)
        if (!signature.optional.includes(p))
            throw new Error(`boundText: ${p} is none of the signature's optional parameters (${signature.optional.join(', ')})`);
    const optional = signature.optional.filter((p) => !bound.includes(p));
    const head = `${signature.names.join(', ')} from ${optional.length ? `(${optional.join(', ')}) ` : ''}${signature.main ?? ''}`.trimEnd();
    const keptByBase = new Set(bound.filter((p) => new RegExp(`base=${p}(?![A-Za-z0-9_])`).test(text)));
    let wrote = false;
    return text
        .split('\n')
        .flatMap((line) => {
        if (/^\s*(?:&[A-Za-z_]\w*\s*,\s*)*&[A-Za-z_]\w*\s+from(?:\s|$)/.test(line) && !wrote && signatureOf(line)) {
            wrote = true;
            return [head];
        }
        const kept = bound.find((p) => new RegExp(`^\\s*${p}(?![A-Za-z0-9_])`).test(line));
        if (kept)
            return keptByBase.has(kept) ? [`${kept} ${args[kept.slice(1)]}`] : [];
        return [Object.entries(args).reduce((l, [k, v]) => (keptByBase.has(`&${k}`) ? l : l.replace(new RegExp(`&${k}(?![A-Za-z0-9_])`, 'g'), v)), line)];
    })
        .join('\n');
}
export function variantsOf(fragment) {
    if (!fragment.association.some((wp) => wp.args))
        return [fragment];
    const plain = fragment.association.filter((wp) => !wp.args);
    const sets = new Map();
    for (const wp of fragment.association) {
        if (!wp.args)
            continue;
        const id = takenAs(fragment.id, wp.args);
        const { args: _, ...point } = wp;
        sets.set(id, { args: wp.args, points: [...(sets.get(id)?.points ?? []), point] });
    }
    return [
        ...(plain.length ? [{ ...fragment, association: plain }] : []),
        ...[...sets].map(([id, { args, points }]) => ({ id, text: boundText(fragment.text, args), association: points })),
    ];
}
export function argsOf(fragment, id) {
    return fragment.association.find((wp) => wp.args && takenAs(fragment.id, wp.args) === id)?.args;
}
export const ofArgs = (wp, args) => args === undefined ? !wp.args : !!wp.args && JSON.stringify(Object.entries(wp.args)) === JSON.stringify(Object.entries(args));
