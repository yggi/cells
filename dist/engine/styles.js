import { parse } from "./parser/index.js";
import { AXES, CENTRE, STYLE } from "./style.js";
const valuesOf = (d) => {
    if (!d || d.braid.kind !== 'list')
        return null;
    const v = d.braid.tokens.map((t) => (t.atom.kind === 'note' && t.repeat === 1 && t.elongate === 1 && t.subdivide === 1 ? t.atom.value : NaN));
    return v.some((x) => Number.isNaN(x)) ? null : v;
};
const GLIDE_STEPS = 16;
function mapNumbers(t, f) {
    const a = t.atom;
    if (a.kind === 'note')
        return { ...t, atom: { ...a, value: f(a.value) } };
    if (a.kind === 'choice')
        return { ...t, atom: { ...a, values: a.values.map(f) } };
    if (a.kind === 'seq')
        return { ...t, atom: { ...a, layers: a.layers.map((l) => l.map((u) => mapNumbers(u, f))) } };
    return t;
}
function between(d, a, b, name, span) {
    const braid = d.braid.kind === 'list' ? { ...d.braid, tokens: d.braid.tokens.map((t) => mapNumbers(t, (v) => a + (b - a) * v)) } : d.braid;
    return { ...d, name, span, braid, label: null, about: undefined, ...(d.style ? { style: undefined } : {}) };
}
const text = (x) => String(Math.round(x * 1e9) / 1e9);
export function readStyles(parsed, scope) {
    const decls = new Map(parsed.cells.map((c) => [c.name, c]));
    const diagnostics = [];
    const error = (message, span) => diagnostics.push({ severity: 'error', message, span });
    const styleCell = (r) => {
        const d = decls.get(r.name);
        if (!d)
            return null;
        const v = valuesOf(d);
        if (d.map?.kind !== 'style' || !v || v.length !== AXES.length) {
            error(`style=&${r.name}: a style is a map=style cell (&${r.name} map=style .3 .45 .55 .55), or a mix of them by weight`, r.span);
            return null;
        }
        return v;
    };
    const pointOf = (p) => {
        if (p.kind === 'cell')
            return styleCell(p.ref);
        const terms = p.terms.map((t) => ({ v: styleCell(t.ref), w: t.weight }));
        if (terms.some((t) => !t.v))
            return null;
        return AXES.map((_, i) => terms.reduce((a, t) => a + t.w * t.v[i], 0));
    };
    const styles = new Map();
    for (const d of parsed.cells) {
        if (!d.style)
            continue;
        const from = pointOf(d.style.from);
        const to = d.style.to ? pointOf(d.style.to) : null;
        if (!from || (d.style.to && !to))
            continue;
        const outside = [from, ...(to ? [to] : [])].flatMap((p) => AXES.filter((a, i) => !(p[i] >= a.range[0] - 1e-9 && p[i] <= a.range[1] + 1e-9)));
        if (outside.length) {
            error(`&${d.name} style=: its style lies outside the axes on ${[...new Set(outside.map((a) => a.name))].join(', ')} (each ${AXES[0].range[0]} to ${AXES[0].range[1]}); a mix's weights sum its styles' points`, d.style.span);
            continue;
        }
        const curve = d.style.curve ?? null;
        if (curve && !decls.has(curve.name))
            continue;
        const line = curve ? decls.get(curve.name).braid : null;
        if (curve && !(line?.kind === 'list' && line.tokens.every((t) => t.atom.kind === 'note'))) {
            error(`style=a..b * &${curve.name}: a curve is a line of numbers from 0 to 1 (&${curve.name} map=lin step=1m 0 .5 1)`, curve.span);
            continue;
        }
        styles.set(d.name, { from, to, curve });
    }
    const made = new Map();
    let glides = false;
    let centred = false;
    const performed = parsed.cells.some((c) => typeof (c.params.play ?? c.params.trigger) === 'string' && c.braid.kind !== 'blank');
    const cellOf = (r) => {
        if (!r.pick || r.pick.kind !== 'at' || !r.pick.abs)
            return null;
        const i = r.pick.i;
        const d = decls.get(r.name);
        const style = styles.get(r.name);
        let body = null;
        const axis = AXES[i]?.name;
        const movingOf = (name) => {
            const sd = decls.get(name);
            return sd?.map?.kind === 'style' && axis ? sd.paramCells?.[axis] : undefined;
        };
        const written = d?.style;
        const named = written ? [written.from, ...(written.to ? [written.to] : [])].flatMap((p) => (p.kind === 'cell' ? [p.ref] : p.terms.map((t) => t.ref))) : [];
        const moving = d?.map?.kind === 'style' ? movingOf(r.name) : written?.from.kind === 'cell' && !written.to ? movingOf(written.from.ref.name) : undefined;
        if (!moving && named.some((n) => movingOf(n.name))) {
            error(`&${r.name}[${axis}]: a mix or a range of styles doesn't move with them yet; name the moving style alone, style=&${named.find((n) => movingOf(n.name)).name}`, r.span);
            return null;
        }
        if (moving) {
            const f = moving.factors.length === 1 && !moving.factors[0].pick ? decls.get(moving.factors[0].name) : undefined;
            if (!f) {
                if (moving.factors.length !== 1 || moving.factors[0].pick)
                    error(`${axis}=… * &x: an axis moves by one cell, a line of numbers from 0 to 1 (write several as one)`, moving.span);
                return null;
            }
            if (f.braid.kind !== 'list') {
                error(`${axis}=… * &${f.name}: an axis moves by a line of numbers from 0 to 1, like &${f.name} step=1m*8 [0|.25|.5|.75|1]`, moving.factors[0].span);
                return null;
            }
            const [a, b] = moving.range ?? AXES[i].range;
            const name = `λ${r.name}_${i}`;
            if (!made.has(name))
                made.set(name, between(f, a, b, name, r.span));
            return name;
        }
        if (!d && r.name === STYLE) {
            body = text(CENTRE[i]);
            if (!centred && performed)
                diagnostics.push({
                    severity: 'info',
                    message: `no line writes &${STYLE}: &${STYLE}[${AXES[i].name}] reads the centre of style space, ${text(CENTRE[i])} on each axis (a score names its style as the note &${STYLE} style=…, decision 063)`,
                    span: r.span,
                });
            centred = true;
        }
        else if (style) {
            const a = style.from[i];
            const b = style.to ? style.to[i] : a;
            if (style.to && !style.curve)
                glides = true;
            const curve = style.curve ? decls.get(style.curve.name) : undefined;
            if (curve && a !== b) {
                const name = `λ${r.name}_${i}`;
                if (!made.has(name))
                    made.set(name, between(curve, a, b, name, r.span));
                return name;
            }
            if (a === b || !scope)
                body = text(a);
            else if ('bars' in scope) {
                const n = scope.bars * GLIDE_STEPS;
                body = `map=lin step=1m*${GLIDE_STEPS} ${Array.from({ length: n }, (_, k) => text(a + ((b - a) * k) / n)).join(' ')}`;
            }
            else
                body = `map=lin step=${text(1 / scope.seconds)}hz ${text(a)} ${text(b)}`;
        }
        else if (d && (d.map?.kind === 'style' || d.map?.kind === 'adsr')) {
            const v = valuesOf(d)?.[i];
            if (v !== undefined)
                body = text(v);
        }
        if (body === null)
            return null;
        const name = `λ${r.name}_${i}`;
        if (!made.has(name)) {
            const holder = parse(`&styleRead lpf=0..1 * &(${body})`).cells.find((c) => c.name !== 'styleRead');
            if (holder)
                made.set(name, { ...holder, name, span: r.span });
        }
        return made.has(name) ? name : null;
    };
    let changed = false;
    const cells = parsed.cells.map((d) => {
        if (!d.paramCells)
            return d;
        let paramCells = null;
        for (const [key, pc] of Object.entries(d.paramCells)) {
            const factors = pc.factors.map((f) => {
                const name = cellOf(f);
                return name ? { name, pick: null, shift: 0, span: f.span } : f;
            });
            if (factors.some((f, k) => f !== pc.factors[k]))
                (paramCells ??= { ...d.paramCells })[key] = { ...pc, factors };
        }
        if (!paramCells)
            return d;
        changed = true;
        return { ...d, paramCells };
    });
    if (!changed && !diagnostics.length)
        return { parsed, glides };
    return { parsed: { ...parsed, cells: [...cells, ...made.values()], diagnostics: [...parsed.diagnostics, ...diagnostics] }, glides };
}
