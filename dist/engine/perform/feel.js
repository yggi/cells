const PARTS = ['drums', 'bass', 'pad', 'stab', 'lead'];
const ROLES = new Set(['kick', 'backbeat', 'ghost', 'hat', 'pedal', 'euclid', 'clave', 'fill']);
export function readingOf(output) {
    const [first, second, third] = (output ?? '').split(':');
    if (first === 'kit' && second === 'voices')
        return third !== undefined && ROLES.has(third) ? { part: 'drums', role: third } : null;
    return isPitched(second) ? { part: second } : null;
}
const isPitched = (name) => name !== 'drums' && PARTS.includes(name);
export function readerOf(result) {
    const roles = new Map(result.performers.flatMap((p) => (isPitched(p.role) ? [[p.name, p.role]] : [])));
    const parts = new Map();
    for (const o of result.outputs) {
        const gate = [...o.via, ...o.through].find((name) => roles.has(name));
        if (gate !== undefined && readingOf(o.id)?.part !== 'drums')
            parts.set(o.id, { part: roles.get(gate) });
    }
    return (output) => (output !== undefined && parts.get(output)) || readingOf(output);
}
const VELOCITY = { drums: 4, bass: 17, pad: 18, stab: 19, lead: 20 };
const LENGTH = { drums: 21, bass: 22, pad: 23, stab: 24, lead: 25 };
const OWN_ACCENT = 27;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
function draw(seed, stream, ...keys) {
    let h = seed >>> 0;
    for (const k of [0, stream, ...keys])
        h = Math.imul(h ^ (k | 0), 2654435761) >>> 0;
    const a = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function feelOf({ style, swing }) {
    const weight = clamp01((swing.share - 0.5) * 6 * (swing.level === '8n' ? 1 : 0.5));
    return 0.5 * weight + 0.3 * style.entropy + 0.2 * (1 - style.artic);
}
function baseOf({ groups, section, style, energy }, { part, role, step }) {
    const steps = 2 * sum(groups);
    const starts = groups.map((_, g) => 2 * sum(groups.slice(0, g)));
    const onBeat = starts.includes(step);
    const half = 2 * Math.floor(steps / 4);
    const backbeat = starts.filter((_, p) => (starts.length <= 3 ? p > 0 : p % 2 === 1)).at(-1);
    const accent = () => {
        if (section === 'breakdown')
            return role === 'fill' ? 45 + (step - half) * 9 : 55;
        switch (role) {
            case 'kick':
                return step === 0 || step === half ? 112 : 92;
            case 'backbeat':
                return step === backbeat ? 106 : 100;
            case 'ghost':
                return 32 + 14 * style.sync;
            case 'hat':
                return onBeat ? 78 : step % 2 === 0 ? 66 : 50;
            case 'pedal':
                return 58;
            case 'euclid':
            case 'clave':
                return 72;
            case 'fill': {
                const from = section === 'build' ? half : 2 * Math.floor((steps * 3) / 8);
                return 50 + (step - from) * (60 / (steps - from));
            }
            default:
                return NaN;
        }
    };
    switch (part) {
        case 'drums':
            return accent() * (0.65 + 0.35 * energy);
        case 'bass':
            return section === 'breakdown' ? 70 : (onBeat ? 100 : 84) * (0.75 + 0.25 * energy);
        case 'stab':
            return 70 + 20 * energy;
        case 'pad': {
            const quiet = section === 'breakdown' || energy < 0.3;
            const w = quiet ? Math.max(0.85, 1 - style.artic) : 1 - style.artic;
            return 48 + 30 * energy * (0.5 + w / 2);
        }
        case 'lead':
            return onBeat ? 100 : 82;
    }
}
export const CONTRACT_WIDTHS = { licence: 1, accents: 1 };
export function played(frame, event, feel = feelOf(frame), widths = CONTRACT_WIDTHS) {
    const { seed, bar } = frame;
    const { part, step, note } = event;
    const base = baseOf(frame, event);
    const level = event.velocity + (base - Math.round(base));
    const keys = part === 'drums' ? [bar, step, note] : [bar, step];
    const loose = (draw(seed, VELOCITY[part], ...keys) - 0.5) * feel * 24 * widths.licence;
    const d = draw(seed, OWN_ACCENT, PARTS.indexOf(part), ...keys);
    const own = (step % 2 === 1 ? -d * 14 * feel : step % 4 === 2 ? d * 10 * feel : (d - 0.5) * 2 * 4 * feel) * widths.accents;
    const total = part === 'drums' ? level + loose + own : level + (loose + own);
    return { velocity: Math.max(1, Math.min(127, Math.round(total))), length: event.length * (1 - draw(seed, LENGTH[part], ...keys) * feel * 0.15 * widths.licence) };
}
