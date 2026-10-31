const LEVELS = ['16n', '8n'];
function spansOf(level, groups) {
    const steps = 2 * groups.reduce((a, b) => a + b, 0);
    if (level === '16n')
        return Array.from({ length: steps / 2 }, (_, i) => [2 * i, 2]);
    let start = 0;
    return groups.flatMap((size) => {
        const span = size === 2 ? [[start, 4]] : [];
        start += 2 * size;
        return span;
    });
}
function through(x, groups, { level, share }, back) {
    const span = spansOf(level, groups).find(([s, l]) => x >= s && x < s + l);
    if (!span)
        return x;
    const [start, length] = span;
    const within = x - start;
    const [from, to] = back ? [share * length, length / 2] : [length / 2, share * length];
    return start + (within < from ? (within * to) / from : to + ((within - from) * (length - to)) / (length - from));
}
const ordered = (swing, back) => {
    const levels = LEVELS.flatMap((l) => swing.filter((s) => s.level === l));
    return back ? levels.reverse() : levels;
};
function overBars(x, groups, f) {
    const steps = 2 * groups.reduce((a, b) => a + b, 0);
    const bar = Math.floor(x / steps);
    return bar * steps + f(x - bar * steps);
}
export const swungAt = (written, groups, swing) => overBars(written, groups, (x) => ordered(swing, false).reduce((y, l) => through(y, groups, l, false), x));
export const writtenAt = (played, groups, swing) => overBars(played, groups, (x) => ordered(swing, true).reduce((y, l) => through(y, groups, l, true), x));
