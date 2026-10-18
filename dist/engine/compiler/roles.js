import { SHOWS } from "../parser/cell.js";
import { ATTRIBUTES, rolesText } from "../attributes.js";
import { PLUGIN_SYNTAX } from "../plugins.js";
import { isMidiCard } from "../program.js";
const RESTARTS = ['restart', 'resume', 'free'];
function negativeFactors(e, inProduct = false) {
    if (e.k === 'num')
        return inProduct && e.value < 0 ? [e] : [];
    if (e.k === 'sum')
        return e.items.flatMap((i) => negativeFactors(i.e));
    if (e.k === 'prod')
        return e.factors.flatMap((f) => negativeFactors(f, true));
    return [];
}
export function checkRoles(ctx, { decls, implicit, sections }, cells, clocks, plugins) {
    const { warn } = ctx;
    const modulators = new Set([...cells.values()].flatMap((c) => (typeof c.params.fm === 'string' ? [c.params.fm] : [])));
    const roles = (c) => {
        const r = new Set();
        if (c.voice)
            r.add('voice');
        if (clocks.get(c.name) && !clocks.get(c.name).belt)
            r.add('clock');
        if (c.step)
            r.add('driven');
        if (typeof c.params.motor === 'number')
            r.add('motor');
        if (typeof c.params.write === 'string')
            r.add('tape');
        if (typeof c.params.play === 'string')
            r.add('head');
        if (typeof c.params.body === 'string')
            r.add('resonator');
        if (typeof c.params.scope === 'string')
            r.add('scope');
        if (typeof c.params.law === 'string')
            r.add('law');
        if (c.gate)
            r.add('gate');
        if (c.sink)
            r.add('card');
        if (c.note)
            r.add('note');
        if (typeof c.params.fm === 'string')
            r.add('carrier');
        if (modulators.has(c.name))
            r.add('modulator');
        if (sections.has(c.name))
            r.add('section');
        if (c.over && [...sections.values()].includes(c.over))
            r.add('selector');
        return r;
    };
    for (const d of decls.values()) {
        const c = cells.get(d.name);
        if (!c || implicit.has(d.name))
            continue;
        const show = d.show?.split(':')[0];
        if (show && !SHOWS.includes(show) && !plugins.has(show))
            ctx.error(`show=${show}: not a show (${SHOWS.join(' ')}), not one of the built-in plugins (${[...plugins.values()]
                .filter((p) => p.builtin)
                .map((p) => p.name)
                .join(' ')}), and the piece carries no plugin of that name (${PLUGIN_SYNTAX})`, d.span);
        const has = roles(c);
        const written = [
            ...Object.keys(d.params).map((k) => [k, d.paramSpans[k] ?? d.span]),
            ...Object.entries(d.paramCells ?? {}).map(([k, pc]) => [k, pc.span]),
            ...Object.entries(d.paramClocks ?? {}).map(([k, st]) => [k, st.span]),
            ...['env', 'pitch', 'title'].filter((k) => d[k]).map((k) => [k, k === 'title' ? d.span : d[k].span]),
        ];
        for (const [k, span] of written) {
            const a = ATTRIBUTES[k];
            if (k === 'anchor' && has.has('law'))
                warn(`anchor= sets the clock a law reads, not the law: write it on ${c.over ? `&${c.over}` : 'its day (over=&day, a clock loop=1d)'} — the law on &${d.name} doesn't read it`, span);
            else if (k === 'pan' && (c.mix || c.sink || isMidiCard(c)))
                warn(`pan= places a voice: on ${c.sink ? 'the sound card' : isMidiCard(c) ? 'a MIDI card' : `the mix &${d.name}`} it does nothing — put it on the voice (&voice pan=${d.params.pan})`, span);
            else if (k === 'pan' && typeof d.params.pan === 'number' && (d.params.pan < 0 || d.params.pan > 1))
                warn(`pan=${d.params.pan}: pan runs from 0 (left) to 1 (right); ${d.params.pan < 0 ? 'this plays hard left' : 'this plays hard right'}`, span);
            else if (a?.on && !a.on.some((r) => has.has(r)))
                warn(`${k}= acts on ${rolesText(a.on)}: on &${d.name} it does nothing`, span);
            else if (k === 'restart' && !RESTARTS.includes(d.params.restart))
                warn(`restart=${d.params.restart}: what switching a part on does to its time is restart, resume or free — this plays as restart`, span);
            else if (a?.value === 'number' && !c.voice && typeof d.params[k] === 'string')
                warn(`${k}= takes a number: '${d.params[k]}' does nothing`, span);
        }
        for (const k of ['gain', 'postgain']) {
            const v = d.params[k];
            if (typeof v === 'number' && v < 0 && !d.gate && (k === 'postgain' || c.voice))
                warn(`${k}=${v}: a gain is 0 or more, and a negative one doesn't play softer — write ${-v}`, d.paramSpans[k] ?? d.span);
        }
        if (!d.gate)
            for (const t of d.braid.kind === 'list' ? d.braid.tokens : [])
                if (t.atom.kind === 'mix')
                    for (const e of t.atom.exprs)
                        for (const n of negativeFactors(e))
                            warn(`* ${n.value}: a factor in a product is a gain, 0 or more, and a negative one doesn't play softer — write ${-n.value}`, n.span);
        if (d.gate) {
            const timing = d.step ? (d.step.whole ? 'loop' : 'step') : null;
            for (const [k, span] of [
                ['over', d.over?.span],
                [timing, d.step?.span],
                ['shift', d.shift !== null ? d.paramSpans.shift : undefined],
                ['stride', d.stride !== null ? d.paramSpans.stride : undefined],
                ['map', d.map?.span],
                ['cycle', d.cycle !== null ? d.span : undefined],
            ])
                if (k && span)
                    warn(`${k}= on a gate does nothing: a gate plays with each note of play=&${d.gate.notes}, so it times and reads nothing itself — put it on &${d.gate.notes}`, span);
            if (d.gate.gain < 0)
                warn(`${d.gate.port === 'trigger' ? 'gain' : 'level'}=${d.gate.gain}: a level is 0 or more, and a negative one doesn't play softer — write ${-d.gate.gain}`, d.paramSpans[d.gate.port === 'trigger' ? 'gain' : 'level'] ?? d.span);
        }
    }
    const shown = new Set([...decls.values()].flatMap((d) => (d.show ? [d.show.split(':')[0]] : [])));
    for (const p of plugins.values())
        if (!p.builtin && !shown.has(p.name))
            warn(`the piece carries the plugin "${p.name}", but no cell says show=${p.name}`, { line: p.line, col: 1, len: `=== plugin ${p.name} ===`.length });
}
