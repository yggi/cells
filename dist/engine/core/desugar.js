import { parse } from "../parser/index.js";
import { compileSource } from "../compile.js";
import { noteValue } from "../meter.js";
import { noteFrequency } from "../program.js";
import { expansion } from "../use.js";
import { readFrom, readUse } from "../parser/use.js";
import { declLine, declWords, splitComment } from "../edit.js";
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
    {
        key: 'copies',
        rows: '79 `base=` (a copy that writes no braid of its own)',
        rewrite: (text) => copies(text),
    },
    {
        key: 'meters',
        rows: '42 `meter("sig")`',
        rewrite: (text, options) => meters(text, options),
    },
    {
        key: 'taps',
        rows: '54–55 `step=16n` `8t` `4n.` `1m`',
        rewrite: (text, options) => taps(text, options),
    },
    {
        key: 'subsequences',
        rows: '16, 22 `[a b]` `x*n`, and `@` on the line’s finest grid',
        rewrite: (text, options) => subsequences(text, options),
    },
    {
        key: 'chains',
        rows: '53 `step=&x*n/d` as one ratio',
        rewrite: (text) => codeWise(text, chains),
    },
];
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const ratio = (n, d) => {
    const g = gcd(n, d) || 1;
    return [n / g, d / g];
};
const times = (a, b) => ratio(a[0] * b[0], a[1] * b[1]);
function leaves(tokens, lines, dur) {
    const foot = (t) => t.elongate * t.repeat;
    const all = tokens.reduce((s, t) => s + foot(t), 0);
    if (!all || tokens.some((t) => !Number.isInteger(t.elongate)))
        return null;
    const out = [];
    for (const t of tokens) {
        const each = times(dur, ratio(t.elongate, all));
        for (let r = 0; r < t.repeat; r++) {
            const a = t.atom;
            if (a.kind === 'seq') {
                if (a.layers.length !== 1 || a.mode || a.euclid || a.slow || a.bare)
                    return null;
                const inner = leaves(a.layers[0], lines, each);
                if (!inner)
                    return null;
                for (let s = 0; s < t.subdivide; s++)
                    out.push(...inner.map((x) => ({ ...x, dur: times(x.dur, ratio(1, t.subdivide)) })));
                continue;
            }
            if (a.kind !== 'note' && a.kind !== 'rest' && a.kind !== 'ref' && a.kind !== 'chord')
                return null;
            const written = lines[t.span.line - 1]?.substr(t.span.col - 1, t.span.len) ?? '';
            const text = written.replace(/(?:@[0-9.]+|![0-9]+|\*[0-9]+)+$/, '').replace(/(?:@[0-9.]+|![0-9]+|\*[0-9]+)(?=[?:]|$)/g, '');
            if (!text || /[@!*]/.test(text.replace(/^&[A-Za-z_][A-Za-z0-9_]*/, '')))
                return null;
            for (let s = 0; s < t.subdivide; s++)
                out.push({ text, dur: times(each, ratio(1, t.subdivide)) });
        }
    }
    return out;
}
function subsequences(text, options) {
    const r = compileSource(text, undefined, options);
    if (!r.ok)
        return text;
    const lines = text.split('\n');
    const spliced = new Set([...r.cells.values()].flatMap((c) => c.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : []))));
    const read = unitRead(text);
    for (const d of parse(text).cells) {
        if (d.braid.kind !== 'list' || !d.step || spliced.has(d.name) || read.has(d.name))
            continue;
        const tokens = d.braid.tokens;
        if (!tokens.some((t) => t.atom.kind === 'seq' || t.subdivide > 1))
            continue;
        const i = d.span.line - 1;
        const [code, comment] = splitComment(lines[i] ?? '');
        if (/[?|]/.test(code) || /\bchance=/.test(code))
            continue;
        if (d.step.kind === 'tap' && r.cells.get(d.step.meter?.name ?? r.mainMeter ?? '')?.meter?.legato)
            continue;
        const ls = leaves(tokens, lines, [tokens.reduce((n, t) => n + t.elongate * t.repeat, 0), 1]);
        if (!ls || tokens.some((t) => t.span.line - 1 !== i))
            continue;
        const k = ls.reduce((l, x) => (l * x.dur[1]) / gcd(l, x.dur[1]), 1);
        const braid = ls.map((x) => {
            const n = (x.dur[0] * k) / x.dur[1];
            return n === 1 ? x.text : `${x.text}@${n}`;
        });
        const step = /\bstep=(\S+)/.exec(code);
        if (!step)
            continue;
        const value = step[1];
        const finer = /^-?[0-9.]+$/.test(value) ? num(+value * k) : /^(?:&|pulse|beat|[0-9]+[ntm])/.test(value) && !value.startsWith('cycle(') ? `${value}*${k}` : null;
        if (!finer)
            continue;
        const first = tokens[0].span.col - 1;
        const last = tokens.at(-1);
        const end = last.span.col - 1 + last.span.len;
        const tail = code.slice(end).replace(/^(?:\s+_)+/, '');
        const head = code.slice(0, first).replace(/\bstep=\S+/, `step=${finer}`);
        const next = `${head}${braid.join(' ')}${tail}`;
        lines[i] = comment ? `${next}${comment}` : next;
    }
    return lines.join('\n');
}
function chainOf(k) {
    const near = (x) => Math.abs(x - Math.round(x)) < 1e-9;
    if (near(k))
        return Math.round(k) === 1 ? '' : `*${Math.round(k)}`;
    if (near(1 / k))
        return `/${Math.round(1 / k)}`;
    for (let q = 2; q <= 64; q++)
        if (near(k * q))
            return `*${Math.round(k * q)}/${q}`;
    return `*${num(k)}`;
}
function taps(text, options) {
    const r = compileSource(text, undefined, options);
    if (!r.ok)
        return text;
    const lines = text.split('\n');
    for (const d of parse(text).cells) {
        const st = d.step;
        if (st?.kind !== 'tap')
            continue;
        const word = st.tap.written;
        const meter = r.cells.get(st.meter?.name ?? r.mainMeter ?? '')?.meter;
        if (!meter)
            continue;
        const bars = /^([1-9][0-9]*)m$/.exec(word);
        const length = bars ? (+bars[1] * meter.pulses) / meter.unit : noteValue(word);
        if (length === null)
            continue;
        const i = d.span.line - 1;
        const [code, comment] = splitComment(lines[i] ?? '');
        const pattern = new RegExp(`(\\bstep=(?:&[A-Za-z_][A-Za-z0-9_]*:)?)${word.replace('.', '\\.')}(?=[*/\\s]|$)`);
        const next = code.replace(pattern, `$1pulse${chainOf(1 / meter.unit / length)}`);
        if (next !== code)
            lines[i] = comment ? `${next}${comment}` : next;
    }
    return lines.join('\n');
}
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
function chains(code) {
    return code.replace(/(\bstep=(?:&[A-Za-z_][A-Za-z0-9_]*:)?(?:pulse|beat|&[A-Za-z_][A-Za-z0-9_]*|[0-9]+[ntm]\.?))((?:[*/][0-9]+(?:\.[0-9]+)?)+)(?![0-9A-Za-z_.])/g, (_, head, chain) => {
        let k = 1;
        for (const m of chain.matchAll(/([*/])([0-9]+(?:\.[0-9]+)?)/g))
            k = m[1] === '*' ? k * +m[2] : k / +m[2];
        return `${head}${chainOf(k)}`;
    });
}
function copies(text) {
    let now = text;
    for (const d of parse(text).cells) {
        if (!d.base || d.base.pick || d.base.shift)
            continue;
        const own = declWords(now, d.name);
        const base = declWords(now, d.base.name);
        if (!own || !base || own.braid.length || base.attrs.some((a) => a.startsWith('base=')))
            continue;
        const set = new Set(own.attrs.map((a) => a.split('=')[0]));
        const attrs = [...base.attrs.filter((a) => !set.has(a.split('=')[0])), ...own.attrs.filter((a) => !a.startsWith('base='))];
        const i = declLine(now, d.name);
        const lines = now.split('\n');
        const [, comment] = splitComment(lines[i]);
        const next = [...own.head, ...base.braid, ...attrs].join(' ');
        lines[i] = comment ? `${next} ${comment.trim()}` : next;
        now = lines.join('\n');
    }
    return now;
}
const LEVEL = ['*', '+', '-', '.', ','];
function meters(text, options) {
    const r = compileSource(text, undefined, options);
    if (!r.ok)
        return text;
    const each = (c) => {
        const name = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(c)?.[1];
        const meter = name ? r.cells.get(name)?.meter : null;
        if (!meter || meter.written !== 'meter')
            return c;
        return c.replace(/\bmeter\("([^"]*)"(?:,\s*[0-9]+)?\)/, (written, sig) => /^[*+\-.,:;]+$/.test(sig) ? written : `meter("${meter.levels.map((l) => LEVEL[Math.min(l, LEVEL.length - 1)]).join('')}")`);
    };
    return text
        .split('\n')
        .map((raw) => {
        const [code, comment] = splitComment(raw);
        const next = each(code);
        return next === code ? raw : comment ? `${next}${comment}` : next;
    })
        .join('\n');
}
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
export const stillWritten = (row, text) => {
    const code = text
        .split('\n')
        .map((l) => splitComment(l)[0].replace(/"(?:[^"\\]|\\.)*"/g, '""'))
        .join('\n');
    return typeof row.test === 'function' ? row.test(code) : row.test.test(code);
};
export const LEFT = [
    {
        key: 'taps',
        rows: '54–56 `step=16n` `8t` `4n.` `1m` on a line that wasn’t rewritten',
        test: /step=(?:&\w+:)?(?:\d+[ntm]\.?)(?![A-Za-z0-9_])/,
        why: 'a tap of a note value is the meter’s pulse with its chain (`pulse*4`), where the line plays the same written so',
    },
    {
        key: 'subsequences',
        rows: '16, 18, 22, 25 `[a b]` `<a b>` `x*n` `x(k,n)` left as written',
        test: (text) => parse(text).cells.some((d) => d.braid.kind === 'list' && d.braid.tokens.some((t) => t.atom.kind === 'seq' || t.subdivide > 1)),
        why: 'dilate inside a step, kept where a finer grid would change what the line plays: a line that draws, one spliced or read by its units, a table, a stack, `<a b>`, a euclid, a meter with legato by level',
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
    {
        key: 'meters',
        rows: '42 `meter("sig")` left as written',
        test: /\bmeter\("[^"]*[0-9/][^"]*"/,
        why: 'a signature’s levels are the grouping rule (#17): written out where the piece plays the same so',
    },
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
