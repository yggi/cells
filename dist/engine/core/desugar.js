import { parse } from "../parser/index.js";
import { noteFrequency } from "../program.js";
import { expansion } from "../use.js";
import { readFrom, readUse } from "../parser/use.js";
import { splitComment } from "../edit.js";
const num = (x) => String(x);
const codeWise = (text, f) => text
    .split('\n')
    .map((raw) => {
    const [code, comment] = splitComment(raw);
    const parts = code.split(/("(?:[^"\\]|\\.)*")/);
    const done = parts.map((p, i) => (i % 2 ? p : f(p))).join('');
    return comment ? `${done}${comment}` : done;
})
    .join('\n');
const UNIT = { bpm: 1 / 60, hz: 1, min: 1 / 60, h: 1 / 3600, d: 1 / 86400, wk: 1 / 604800, k: 1000 };
export const FAMILIES = [
    {
        key: 'comments',
        rows: '5 `#` `//`',
        rewrite: (text) => text
            .split('\n')
            .map((raw) => splitComment(raw)[0].replace(/\s+$/, ''))
            .filter((l) => l.trim())
            .join('\n'),
    },
    {
        key: 'from',
        rows: '7 `from`',
        rewrite: (text, options) => (options.resolve ? inPlace(text, options.resolve) : text),
    },
    {
        key: 'units',
        rows: '58–64 `bpm` `hz` `min` `h` `d` `wk` `k`',
        rewrite: (text) => codeWise(text, (c) => c
            .split(/(\bfree\([^)]*\))/)
            .map((part, i) => (i % 2 ? part : part.replace(/(?<=[=(,\s*])(-?\d*\.?\d+)(bpm|hz|min|h|d|wk|k)(?![A-Za-z0-9_])/g, (_, n, u) => num(+n * UNIT[u]))))
            .join('')),
    },
    {
        key: 'note names',
        rows: '50 `loop=NAME`',
        rewrite: (text) => codeWise(text, (c) => c.replace(/(?<=\bloop=)([A-Ga-g](?:#|b)?-?\d+)(?![A-Za-z0-9_])/g, (name) => {
            const f = noteFrequency(name);
            return f === null ? name : num(f);
        })),
    },
    {
        key: 'unnamed cells',
        rows: '36 `&( … )`',
        rewrite: (text) => {
            const lifted = [];
            let now = text;
            for (let at = innermost(now); at; at = innermost(now)) {
                const name = `_c${lifted.length + 1}`;
                lifted.push(`&${name} ${at.body.trim()}`);
                now = now.slice(0, at.start) + `&${name}` + now.slice(at.end);
            }
            return lifted.length ? `${now.replace(/\s+$/, '')}\n${lifted.join('\n')}` : text;
        },
    },
    {
        key: 'repeats',
        rows: '21 `x!n`',
        rewrite: (text) => tokenWise(text, (tok, cell) => (unitRead(text).has(cell) ? tok : repeated(tok))),
    },
    {
        key: 'scans',
        rows: '37 `scan(i …)`',
        rewrite: (text) => codeWise(text, (c) => /\bstep=/.test(c)
            ? c
            : c.replace(/\bscan\(([-\d.\s]+)\)/g, (written, body) => {
                const steps = body.trim().split(/\s+/).map(Number);
                if (steps.some((s) => !Number.isFinite(s)))
                    return written;
                let at = 0;
                return steps.map((s) => ((at += s), num(at - s))).join(' ');
            })),
    },
];
function inPlace(text, resolve) {
    const x = expansion(text, { resolve });
    const own = text.split('\n');
    const added = x.text.split('\n').slice(own.length);
    const kept = new Set(x.uses.filter((u) => u.hash === null).map((u) => u.span.line));
    const at = new Map();
    added.forEach((l, k) => {
        const line = x.through(own.length + k + 1)?.line;
        if (line !== undefined)
            at.set(line, [...(at.get(line) ?? []), l]);
    });
    return own
        .flatMap((raw, i) => {
        const code = splitComment(raw)[0];
        const taken = (readUse(code) !== undefined || readFrom(code.trim())?.kind === 'use') && !kept.has(i + 1);
        return taken ? (at.get(i + 1) ?? []) : [raw];
    })
        .join('\n');
}
const repeated = (tok) => {
    const m = /^(.*)!(\d+)$/.exec(tok);
    return m ? Array.from({ length: +m[2] }, () => m[1]).join(' ') : tok;
};
const unitRead = (text) => new Set([...text.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)\[/g)].map((m) => m[1]));
function innermost(written) {
    const text = written.replace(/"(?:[^"\\]|\\.)*"/g, (q) => q.replace(/[^"]/g, ' '));
    for (let i = text.indexOf('&('); i >= 0; i = text.indexOf('&(', i + 1)) {
        let depth = 0;
        for (let j = i + 1; j < text.length; j++) {
            if (text[j] === '(')
                depth++;
            else if (text[j] === ')' && --depth === 0) {
                if (!text.slice(i + 2, j).includes('&('))
                    return { start: i, end: j + 1, body: written.slice(i + 2, j) };
                break;
            }
        }
    }
    return null;
}
function tokenWise(text, f) {
    const lines = text.split('\n');
    const parsed = parse(text);
    const edits = [];
    for (const d of parsed.cells)
        if (d.braid.kind === 'list')
            for (const t of d.braid.tokens) {
                const written = lines[t.span.line - 1]?.substr(t.span.col - 1, t.span.len);
                if (written === undefined)
                    continue;
                const to = f(written, d.name);
                if (to !== written)
                    edits.push({ ...t.span, to });
            }
    edits.sort((a, b) => b.line - a.line || b.col - a.col);
    for (const e of edits) {
        const l = lines[e.line - 1];
        lines[e.line - 1] = l.slice(0, e.col - 1) + e.to + l.slice(e.col - 1 + e.len);
    }
    return lines.join('\n');
}
export const LEFT = [
    {
        key: 'taps',
        rows: '54–56 `step=16n` `pulse` `beat` `&m:8n`',
        test: /step=(?:&\w+:)?(?:\d+[ntm]\.?|pulse|beat)\b/,
        why: 'a tap is a level of the meter it reads: `&bar*k` with k from the meter’s levels (and a meter by name, `&bar2:beat`)',
    },
    {
        key: 'subsequences',
        rows: '13, 16, 18, 22, 25 `_` `[a b]` `<a b>` `x*n` `x(k,n)`',
        test: /(?:^|\s)\[[^\]&,]*\s[^\]]*\]|<[^>]*>|[\w\]~]\*\d|\w\(\d+,\s*\d+/m,
        why: 'dilate on a finer step: the line’s step= changes with it, and a tap’s finer step is the meter’s next level or a new one',
    },
    {
        key: 'sliders',
        rows: '58–64 a unit in `free(…)`',
        test: /\bfree\(-?\d*\.?\d+(?:bpm|hz|min|h|d|wk|k)\b/,
        why: 'a slider’s unit is what the performer moves it in: its range and its steps are in it',
    },
    { key: 'unit reads', rows: '21 `x!n` in a cell read by its units', test: /!\d/, why: '`&a!2` is one unit and `&a &a` two: a pick or a rotation (`&john[<<]`) counts them' },
    { key: 'keys', rows: '40 `scale(name)`', test: /\bscale\(/, why: 'a key is a mode read from the library and a tonic: two cells, the mode’s table among them' },
    {
        key: 'meter scans',
        rows: '37 `scan(i …)` on a stepped line',
        test: /\bscan\(.*\bstep=|\bstep=.*\bscan\(/,
        why: 'a scan with a step= is a meter: its numbers are the lengths of its steps, `@`, and what a tap reads of it are its levels',
    },
    { key: 'meters', rows: '42 `meter("sig")`', test: /\bmeter\(/, why: 'a signature’s levels are the grouping rule (#17): written out they are its table, which the reader has' },
    {
        key: 'gates',
        rows: '111–113 `play=` `level=` `[&a, &b]`',
        test: /\b(?:play|level)=/,
        why: 'a gate is a set of products: each receiver times its notes and levels, written into the card’s mix',
    },
    { key: 'pitch', rows: '88 `pitch=&x`', test: /pitch=&\w/, why: 'a voice’s pitch= joins every product the voice is in: the mix rewritten, a sum in each' },
    { key: 'levels', rows: '27 `&x:0:g`', test: /&\w+:\d/, why: 'a hit’s gain is a volume line in the product: a line of its own, stepped as the braid' },
    {
        key: 'copies',
        rows: '14, 79 `=` `base=`',
        test: /\bbase=/,
        why: 'the base’s braid written over: the parser does it (parser/base.ts), so it is mechanical, but needs the base’s text',
    },
];
