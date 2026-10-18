import { pickLabel, shiftLabel } from "./ast.js";
export const rateChain = (by) => by.map((r) => `${r.op}${r.n}`).join('');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
export function stepLabel(s) {
    switch (s.kind) {
        case 'pick':
            return pickLabel(s.pick);
        case 'delay':
            return s.unit === 'step' ? shiftLabel(-s.by) : `at=${+s.by.toFixed(3)}`;
        case 'degree':
            return `^${s.by}`;
        case 'inverse':
            return 'inverse';
        case 'transpose':
            return s.unit === 'grid' ? `^$${s.by}` : signed(s.by);
        case 'negate':
            return '−';
        case 'gain':
            return `×${+s.by.toFixed(3)}`;
        case 'rate':
            return [s.whole ? 'loop' : '', s.tap ?? '', (s.per === 'cycle' ? '⟳' : '') + rateChain(s.by), s.belt !== undefined ? '· belt' : ''].filter(Boolean).join(' ');
    }
}
export const transformLabel = (t) => t.map(stepLabel).filter(Boolean).join(' ');
const UNNAMED = new Set(['over', 'braid', 'step', 'mix', 'midi', 'is', 'about', 'voice', 'env', 'level', 'pitch']);
export const isAttribute = (port) => !UNNAMED.has(port);
const OPERATOR = {
    env: () => '×',
    level: () => '×',
    pitch: (t) => (t.some((s) => s.kind === 'negate') ? '' : '+'),
};
const NAMED = 3;
export function edgeLabel(e) {
    const drawn = (st) => e.port === 'braid' && st.kind === 'pick' && !st.pick.abs;
    const told = e.transforms.map((t) => t.filter((st) => !drawn(st)));
    const each = [...new Set(told.map(transformLabel))].filter(Boolean);
    const picked = e.transforms.length > 0 && e.transforms.every((t) => t.length > 0 && t.every(drawn));
    const parts = [
        e.count > 1 && !picked ? `×${e.count}` : '',
        isAttribute(e.port) ? e.port : '',
        ...each.slice(0, NAMED),
        each.length > NAMED ? '…' : '',
        OPERATOR[e.port]?.(e.transforms[0] ?? []) ?? '',
    ];
    return parts.filter(Boolean).join(' ') || undefined;
}
