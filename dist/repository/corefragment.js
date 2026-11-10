import { toCore } from "../engine/core/index.js";
import { declLine, deleteCell, splitComment } from "../engine/edit.js";
import { parse } from "../engine/parser/index.js";
import { readFrom } from "../engine/parser/use.js";
import { signatureOf } from "../engine/use.js";
import { headsOf, hosted, HOST, NO_HEAD } from "./audition.js";
function unreadGone(text, keep) {
    let now = text;
    for (let gone = true; gone;) {
        gone = false;
        for (const d of parse(now).cells) {
            if (keep.has(d.name))
                continue;
            const ref = new RegExp(`&${d.name}(?![A-Za-z0-9_])`);
            const own = declLine(now, d.name);
            if (!now.split('\n').some((l, i) => i !== own && ref.test(l))) {
                const next = deleteCell(now, d.name);
                if (next !== now) {
                    now = next;
                    gone = true;
                }
            }
        }
    }
    return now;
}
export function coreFragment(text, options = {}) {
    const sig = signatureOf(text);
    if (!sig)
        return { source: text, why: 'no signature: a collection is cored as a piece' };
    const h = hosted(text, { kit: null, style: null }, options, headsOf(text));
    if (h.why)
        return { source: text, why: h.why === NO_HEAD ? `${NO_HEAD}: nothing to hear its rewrites by` : h.why };
    const { holes, meterless, source: host } = h;
    const hostNames = [...holes.uses.map((u) => u.replace(/^&/, '')), ...Object.values(HOST)];
    const taken = text.split('\n').flatMap((l) => {
        const f = readFrom(splitComment(l)[0].trim());
        return f && f.kind !== 'signature' ? (f.names ?? []) : [];
    });
    const kept = [...sig.names, ...sig.optional, ...(sig.main ? [sig.main] : []), ...taken, ...hostNames.map((n) => `&${n}`)];
    let core = toCore(host, { ...options, interface: kept, ...(meterless || holes.uses.includes('&bar') ? { skip: ['taps'] } : {}) }).source;
    for (const n of hostNames)
        if (declLine(core, n) >= 0)
            core = deleteCell(core, n);
    const interfaceNames = new Set(kept.map((n) => n.replace(/^&/, '')));
    core = unreadGone(core, interfaceNames);
    const fromLines = text.split('\n').filter((l) => {
        const f = readFrom(splitComment(l)[0].trim());
        return !!f && f.kind !== 'signature';
    });
    for (const n of taken.map((t) => t.replace(/^&/, '')))
        if (declLine(core, n) >= 0)
            core = deleteCell(core, n);
    core = unreadGone(core, new Set([...interfaceNames].filter((n) => !taken.includes(`&${n}`))));
    const sigLine = text.split('\n').find((l) => readFrom(splitComment(l)[0].trim())?.kind === 'signature');
    const lines = core.split('\n').filter((l) => readFrom(splitComment(l)[0].trim()) === undefined);
    return { source: [sigLine.trim(), ...fromLines.map((l) => l.trim()), ...lines].join('\n').replace(/\n+$/, '') };
}
