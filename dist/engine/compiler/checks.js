import { AXES } from "../style.js";
import { BODIES, isMidiCard } from "../program.js";
import { MOVING_PARAMS } from "../attributes.js";
import { refsOf } from "../readers.js";
import { leaves } from "../subseq.js";
export function checkCells(ctx, decls, cells, sections = new Map(), bands = new Map()) {
    const { error, warn, unknownCell } = ctx;
    for (const c of cells.values()) {
        const span = (k) => decls.get(c.name)?.paramSpans?.[k] ?? decls.get(c.name).span;
        if (typeof c.params.body === 'string' && !(c.params.body in BODIES))
            error(`body=${c.params.body}: one of ${Object.keys(BODIES).join(', ')}`, span('body'));
        if (typeof c.params.board === 'string' && c.params.board !== 'none' && !(c.params.board in BODIES))
            error(`board=${c.params.board}: none, or one of ${Object.keys(BODIES).join(', ')}`, span('board'));
        if (typeof c.params.couple === 'string') {
            const o = cells.get(c.params.couple);
            if (!o)
                unknownCell(c.params.couple, span('couple'));
            else if (typeof o.params.body !== 'string')
                error(`couple=&${o.name}: it couples to another resonator (a cell with body=)`, span('couple'));
        }
        if (typeof c.params.excite === 'string' && !cells.get(c.params.excite)?.mix)
            error(`excite=&${c.params.excite}: a resonator is driven by sound — a mix`, span('excite'));
    }
    for (const c of cells.values()) {
        const named = c.show?.startsWith('mix:&') ? c.show.slice('mix:&'.length) : null;
        if (named === null)
            continue;
        const span = decls.get(c.name)?.paramSpans?.show ?? decls.get(c.name).span;
        const g = cells.get(named);
        if (!c.mix)
            warn(`show=mix:&${named} does nothing on &${c.name}: it names the grid a mix's colours follow, and &${c.name} isn't a mix`, span);
        else if (!g)
            unknownCell(named, span);
        else if (!g.root)
            warn(`show=mix:&${named}: a mix's colours follow a grid (a cell with cycle= or map=edo), not &${named}`, span);
    }
    for (const c of cells.values()) {
        const span = (k) => decls.get(c.name)?.paramSpans?.[k] ?? decls.get(c.name).span;
        if (typeof c.params.write === 'string') {
            const w = cells.get(c.params.write);
            if (!w)
                unknownCell(c.params.write, span('write'));
            else if (w.voice)
                error(`write=&${w.name}: a tape records what plays — a melody, not a voice`, span('write'));
        }
        if (typeof c.params.play === 'string') {
            const t = cells.get(c.params.play);
            if (!t)
                unknownCell(c.params.play, span('play'));
            else if (typeof t.params.write !== 'string')
                error(`play=&${t.name}: a read head plays a tape — a cell with write= (what it records)`, span('play'));
        }
    }
    for (const c of cells.values()) {
        const first = c.params.fm;
        if (typeof first !== 'string')
            continue;
        const span = decls.get(c.name)?.paramSpans?.fm ?? decls.get(c.name).span;
        const m = cells.get(first);
        if (!m)
            unknownCell(first, span);
        else if (!m.voice)
            error(`fm=&${first}: a modulator is a voice (s=sine ratio=…)`, span);
        else {
            const seen = new Set([c.name]);
            for (let at = first; at; at = typeof cells.get(at)?.params.fm === 'string' ? cells.get(at).params.fm : undefined) {
                if (seen.has(at)) {
                    error(`fm=&${first}: the modulators come back round to &${at} — FM chains can't loop`, span);
                    break;
                }
                seen.add(at);
            }
        }
    }
    for (const d of decls.values())
        for (const [key, pc] of Object.entries(d.paramCells ?? {})) {
            if (!MOVING_PARAMS.has(key))
                error(`${key}= can't move: it takes a number (these can: ${[...MOVING_PARAMS].join(' ')})`, pc.span);
            if (pc.range && !(pc.range[0] >= 0 && pc.range[1] >= 0))
                error(`${key}=: a range of positive values, low..high`, pc.span);
            let envs = 0;
            for (const f of pc.factors) {
                const fc = cells.get(f.name);
                if (!fc)
                    unknownCell(f.name, f.span);
                else if (fc.map?.kind === 'adsr')
                    envs++;
            }
            if (envs > 1)
                error(`${key}=: one envelope (map=adsr) at most — the other factors scale it`, pc.span);
            if (envs && !pc.range)
                error(`${key}=&env: an envelope runs 0 to 1 — give it a range: ${key}=200..3000 * &env`, pc.span);
        }
    for (const d of decls.values()) {
        const share = d.params.legato;
        const span = d.paramSpans.legato ?? d.span;
        const free = d.frees?.find((f) => f.key === 'param' && f.param === 'legato');
        const bad = (what) => error(`legato=${what}: a share of each note's held length is above 0 (.5 staccato, 1 as written, 1.5 into the next)`, span);
        if (typeof share === 'string')
            error(`legato=${share}: a share (.5), free(.5, .25..2.5) or a cell of shares (&artic)`, span);
        else if (typeof share === 'number' && !(share > 0))
            bad(String(share));
        else if (free && !(free.lo > 0))
            bad(`free(${free.value}, ${free.lo}..${free.hi})`);
        const low = d.legato?.find((l) => !(l.share > 0));
        if (low)
            bad(`${low.level}:${low.share}`);
        if (d.legato && !cells.get(d.name)?.meter)
            warn(`legato=${d.legato.map((l) => `${l.level}:${l.share}`).join(',')} gives the lines tapping a meter their share: &${d.name} is not a meter, so it does nothing`, span);
        const pc = d.paramCells?.legato;
        if (pc?.range && !(pc.range[0] > 0))
            bad(`${pc.range[0]}..${pc.range[1]}`);
        for (const f of pc && !pc.range ? pc.factors : []) {
            const fd = decls.get(f.name);
            const shares = fd?.braid.kind === 'list'
                ? fd.braid.tokens.flatMap((t) => leaves(t.atom)).flatMap((a) => (a.kind === 'note' ? [a.value + a.alter] : a.kind === 'chord' ? a.notes : []))
                : [];
            const low = shares.find((v) => !(v > 0));
            if (low !== undefined)
                bad(`&${f.name}: its ${low}`);
        }
    }
    for (const d of decls.values())
        if (d.stride !== null && d.step?.kind !== 'driven' && d.step?.kind !== 'tap')
            warn(`stride= only matters with step=&cell or a tap (step=1m)`, d.paramSpans?.stride ?? d.span);
    for (const d of decls.values()) {
        for (const [key, r] of [
            ['env', d.env],
            ['pitch', d.pitch],
        ]) {
            if (!r)
                continue;
            const t = cells.get(r.name);
            if (!t)
                unknownCell(r.name, r.span);
            else if (key === 'env' && t.map?.kind !== 'adsr' && t.map?.kind !== 'amp' && t.map?.kind !== 'lin' && t.map?.kind !== 'db')
                error(`env= takes a volume: a cell with map=adsr (an envelope), map=amp, map=db or map=lin`, r.span);
            else if (key === 'pitch' && (t.map?.kind === 'adsr' || t.map?.kind === 'amp' || t.map?.kind === 'db'))
                error(`pitch= takes a pitch (a vibrato, map=lin to glide), not a volume`, r.span);
        }
    }
    for (const d of decls.values()) {
        if (d.map?.kind !== 'adsr')
            continue;
        const vals = d.braid.kind === 'list' ? d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [];
        if (vals.length !== 4 || vals.some((v) => !(v >= 0)) || vals[2] > 1)
            error(`map=adsr takes four numbers: attack decay sustain release — seconds, and sustain a level 0…1 (map=adsr .01 .3 .5 .4)`, d.map.span);
    }
    for (const d of decls.values()) {
        if (d.map?.kind !== 'style')
            continue;
        const vals = d.braid.kind === 'list' ? d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [];
        if (vals.length !== AXES.length || vals.some((v, i) => !(v >= AXES[i].range[0] && v <= AXES[i].range[1])))
            error(`map=style takes a value for each axis, in order: ${AXES.map((a) => `${a.name} (${a.range[0]} to ${a.range[1]})`).join(', ')} (map=style .3 .45 .55 .55, or sync=.3 harm=.45 artic=.55 energy=.55)`, d.map.span);
    }
    for (const d of decls.values()) {
        if (d.map?.kind !== 'ratios')
            continue;
        const vals = d.braid.kind === 'list' ? d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [];
        if (d.over !== null)
            error(`A grid (map=ratios) reads nothing: its braid is its tones`, d.map.span);
        else if (vals.length < 2 || vals.some((v, i) => !(v > 0) || (i > 0 && !(v > vals[i - 1]))))
            error(`map=ratios lists one period's tones as rising ratios, the last the period: map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2`, d.map.span);
    }
    for (const d of decls.values())
        if (d.map?.kind === 'edo' && (d.over !== null || d.braid.kind !== 'blank'))
            error(`A grid (map=edo, map=ed(r)) reads nothing and has no braid: &${d.name} cycle=19 map=edo`, d.map.span);
    for (const d of decls.values()) {
        const t = d.over ? cells.get(d.over.name) : undefined;
        if (!t || t.kit || bands.has(t.name))
            continue;
        const refs = refsOf(t);
        if (!refs.length || refs.every((r) => sections.get(r) === t.name) || ctx.broken.has(d.name))
            continue;
        const listed = [...new Set(refs)].map((r) => '&' + r).join(' ');
        warn(`&${t.name} is read as a table, but its cells (${listed}) aren't entries: a table is its numbers. To play cells one after another, splice them into a braid (&${d.name} ${listed}); choosing a melody per step isn't built yet (#29)`, d.over.span);
    }
    for (const [section, table] of sections)
        if (![...cells.values()].some((c) => c.step?.driver === section || Object.values(c.paramClocks).some((p) => p.driver === section)))
            warn(`&${section} is a section of &${table}, but nothing is stepped by it: step=&${section} on what it should play (or a name mistyped)`, decls.get(section).span);
    for (const d of decls.values()) {
        const t = d.map?.kind === 'table' ? cells.get(d.map.table.name) : undefined;
        if (t && (t.mix || t.sink || isMidiCard(t)))
            warn(`map=&${t.name}: a map reads a table's numbers, and &${t.name} is ${isMidiCard(t) ? 'a MIDI card' : t.sink ? 'the sound card' : 'a mix'}, which has none: nothing is mapped`, d.map.span);
    }
    for (const c of cells.values()) {
        const channel = c.map?.kind === 'midi' ? c.map.channel : null;
        if (channel === null)
            continue;
        const d = decls.get(c.name);
        const toks = d?.braid.kind === 'list' ? d.braid.tokens : [];
        toks.forEach((t) => {
            if (t.repeat > 1 && t.atom.kind !== 'rest')
                warn(`!${t.repeat} on a card with one channel (map=midi(${channel})): each note goes out ${t.repeat.toLocaleString('en')} times on it, at once — leave out the !${t.repeat}`, t.span);
        });
    }
    for (const table of new Set(sections.values()))
        if (![...decls.values()].some((d) => d.over?.name === table)) {
            const names = [...sections].filter(([, t]) => t === table).map(([section]) => section);
            const st = decls.get(names[0])?.step;
            const clock = st?.kind === 'driven' ? st.driver.name : 'bar';
            warn(`&${table} declares sections (${names.map((n) => '&' + n).join(' ')}), and nothing selects them: every part plays all the time. A selector reads the table and switches them, a step of the form at a time: &song over=&${table} step=&${clock}/16 0 [0,1]`, decls.get(table).span);
        }
    const farDegrees = Math.max(12, ...[...cells.values()].filter((c) => c.root).map((c) => c.cycle)) * FAR_OCTAVES;
    for (const c of cells.values()) {
        const d = decls.get(c.name);
        if (!d || c.implicit)
            continue;
        const toks = d.braid.kind === 'list' ? d.braid.tokens : [];
        c.units.forEach((u, i) => {
            const a = u.atom;
            if (a.kind !== 'ref' || !a.values || Math.abs(a.values.add) <= farDegrees)
                return;
            const moved = cells.get(a.name);
            warn(`degree(${moved?.lambda ? '&( … )' : '&' + a.name}, ${a.values.add}) moves it ${Math.abs(a.values.add).toLocaleString('en')} steps, over a hundred octaves: ${a.values.add > 0 ? 'its notes land above 20 kHz and are dropped' : 'its notes fall below hearing'}, nothing plays`, toks[i]?.span ?? c.span);
        });
        const laps = Math.abs(c.shift) / Math.max(1, c.units.length);
        if (laps > FAR_LAPS)
            warn(`shift=${c.shift} turns ${c.lambda ? 'an unnamed cell &( … )' : '&' + c.name} about ${Math.round(laps).toLocaleString('en')} laps, and every lap climbs a lap of the grid: its notes leave hearing`, d.paramSpans?.shift ?? d.span);
    }
}
const FAR_OCTAVES = 100;
const FAR_LAPS = 20;
