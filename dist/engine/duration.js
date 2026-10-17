import { BLOCK_NAMES, DAY_MODES, MODE_NAMES } from "./fiveto12.js";
import { codeShifts } from "./program.js";
import { clocking, selects } from "./clocking.js";
import { plan } from "./realize.js";
export function mainLength(t) {
    if (t.ends !== null)
        return t.ends;
    if (t.cycle !== null && Number.isFinite(t.cycle) && t.cycle <= 1800)
        return t.cycle;
    return t.longest;
}
function fraction(x) {
    let [h0, h1, k0, k1] = [0n, 1n, 1n, 0n];
    let v = x;
    for (let i = 0; i < 32; i++) {
        const a = BigInt(Math.floor(v));
        [h0, h1] = [h1, a * h1 + h0];
        [k0, k1] = [k1, a * k1 + k0];
        if (k1 > 10000n)
            return [h0, k0];
        const r = v - Math.floor(v);
        if (r < 1e-9 || Math.abs(Number(h1) / Number(k1) - x) < 1e-9 * Math.max(1, x))
            break;
        v = 1 / r;
    }
    return [h1, k1];
}
const gcd = (a, b) => (b === 0n ? a : gcd(b, a % b));
export function pieceTime(result, seen) {
    if ([...result.cells.values()].some((c) => c.params.law === 'fiveto12'))
        return { ends: 86400, cycle: 86400, chance: false, longest: 86400 };
    const statics = codeShifts(result);
    const p = plan(result, statics);
    const clk = clocking(result, statics);
    const secondsOf = (clock, steps) => {
        if (!clock)
            return null;
        const tm = clk.map(clock);
        const s = tm.q(steps) - tm.q(0);
        return Number.isFinite(s) && s > 1e-6 ? s : null;
    };
    const periods = [];
    let chance = false;
    for (const t of p.tracks) {
        const lap = secondsOf(t.clock, t.period / t.rate);
        const laps = t.events.reduce((m, e) => (e.laps ? Number((BigInt(m) * BigInt(e.laps.of)) / gcd(BigInt(m), BigInt(e.laps.of))) : m), 1);
        if (lap)
            periods.push(lap * laps);
        if (t.events.some((e) => e.chance !== undefined || e.options || e.chosen))
            chance = true;
        for (const m of [...t.mods, ...t.levels, ...t.selects.map((x) => x.series)]) {
            const s = m.clock ? secondsOf(m.clock, m.period / m.rate) : null;
            if (s)
                periods.push(s);
        }
    }
    for (const params of p.voiceParams.values())
        for (const prm of Object.values(params))
            for (const m of prm.series) {
                const s = m.clock ? secondsOf(m.clock, m.period / m.rate) : null;
                if (s)
                    periods.push(s);
            }
    const played = new Set(result.outputs.map((o) => o.cell));
    const read = new Set([...result.cells.values()].flatMap((c) => (c.over ? [c.over] : [])));
    for (const c of result.cells.values()) {
        if (!read.has(c.name) || !c.step || !c.clock || played.has(c.name) || c.loops || result.clocks.has(c.name) || !c.cycle)
            continue;
        const turn = secondsOf(c.clock, 1 / c.rate);
        if (!turn)
            continue;
        const stride = Math.max(1, Math.abs(Math.round(c.stride || 1)));
        const wrap = Math.max(1, Math.round(c.wrap ?? (c.units.length || c.cycle)));
        const turns = wrap / Number(gcd(BigInt(wrap), BigInt(stride)));
        periods.push(turn * turns);
    }
    seen?.push(...periods);
    const ends = Number.isFinite(p.end) ? p.end : null;
    const longest = periods.length ? Math.max(...periods) : null;
    if (periods.length === 0)
        return { ends, cycle: null, chance, longest };
    let num = 1n;
    let den = 0n;
    for (const s of periods) {
        const [n, d] = fraction(s);
        if (n === 0n)
            continue;
        num = (num / gcd(num, n)) * n;
        den = den === 0n ? d : gcd(den, d);
    }
    const cycle = den === 0n ? null : num / den > 10n ** 18n ? Infinity : Number(num) / Number(den);
    return { ends, cycle, chance, longest };
}
export function clockText(seconds, hours = false) {
    const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
    return hours ? `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${ss}` : `${Math.floor(seconds / 60)}:${ss}`;
}
export function durationText(seconds) {
    if (!Number.isFinite(seconds))
        return 'longer than the universe has been around';
    const s = Math.round(seconds);
    if (s < 3600)
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (s < 86400)
        return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
    const days = s / 86400;
    if (days < 365)
        return `${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'}`;
    const years = days / 365.25;
    if (years < 1e6)
        return `${Math.round(years).toLocaleString('en')} years`;
    return `10^${Math.floor(Math.log10(years))} years`;
}
export function sections(result) {
    if ([...result.cells.values()].some((c) => c.params.law === 'fiveto12'))
        return DAY_MODES.map((m, b) => ({ at: b * 7200, label: `${MODE_NAMES[m]} · ${BLOCK_NAMES[b]}` }));
    const statics = codeShifts(result);
    const clk = clocking(result, statics);
    for (const c of result.cells.values()) {
        if (!selects(result, c.name) || !c.clock || !c.steps)
            continue;
        const tm = clk.map(c.clock);
        const t0 = tm.q(0);
        const names = (c.label ?? '')
            .split('·')
            .map((x) => x.trim().replace(/\{[^}]*\}/g, ''))
            .filter(Boolean);
        const out = [];
        for (let i = 0; i < c.steps; i++)
            out.push({ at: tm.q(i / c.rate) - t0, label: names.length === c.steps ? names[i] : String(i + 1) });
        return out;
    }
    return null;
}
export function mainTempo(result) {
    const statics = codeShifts(result);
    const first = plan(result, statics).tracks[0];
    if (!first?.clock)
        return null;
    for (let name = result.clocks.get(first.clock)?.cell ?? first.clock, guard = 0; name && guard < 8; guard++) {
        const c = result.cells.get(name);
        if (!c)
            break;
        const free = c.frees.find((f) => f.key === 'step');
        if (free)
            return { cell: name, free };
        name = c.step?.driver;
    }
    return null;
}
export function anchoredAt(result, now) {
    const anchor = [...result.cells.values()].find((c) => typeof c.params.anchor === 'number' && c.params.law === undefined)?.params.anchor;
    if (anchor === undefined)
        return null;
    const sec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const at = Math.floor(anchor) * 3600 + Math.round((anchor % 1) * 100) * 60;
    return (((sec - at) % 86400) + 86400) % 86400;
}
