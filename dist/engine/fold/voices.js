const NEW = 7;
const CROSS = 12;
const THICK = 0.06;
export function voiceCount(notes) {
    const edges = notes.flatMap((n) => [
        [n.start, 1],
        [n.end, -1],
    ]);
    edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const time = new Map();
    let now = 0;
    for (let i = 0; i < edges.length; i++) {
        now += edges[i][1];
        const next = edges[i + 1]?.[0] ?? edges[i][0];
        time.set(now, (time.get(now) ?? 0) + next - edges[i][0]);
    }
    const total = [...time.values()].reduce((a, b) => a + b, 0);
    let count = Math.max(0, ...time.keys());
    let thicker = 0;
    while (count > 1 && thicker + (time.get(count) ?? 0) <= THICK * total)
        thicker += time.get(count--) ?? 0;
    return count;
}
export function voicesOf(notes) {
    const count = voiceCount(notes);
    const voice = new Array(notes.length).fill(0);
    if (count <= 1)
        return { voice, count };
    const order = notes.map((_, i) => i).sort((a, b) => notes[a].start - notes[b].start || notes[b].key - notes[a].key);
    const register = registers(notes, order, count);
    const last = new Array(count).fill(null);
    const busy = new Array(count).fill(-Infinity);
    const sounding = new Array(count).fill(0);
    for (let g = 0; g < order.length;) {
        let h = g;
        const t = notes[order[g]].start;
        while (h < order.length && notes[order[h]].start === t)
            h++;
        const group = order.slice(g, h);
        const free = [...Array(count).keys()].filter((v) => busy[v] <= t);
        for (const v of [...Array(count).keys()].filter((x) => !free.includes(x)).sort((a, b) => busy[a] - busy[b])) {
            if (free.length >= group.length)
                break;
            free.push(v);
        }
        free.sort((a, b) => a - b);
        const extra = group.splice(free.length);
        const take = assign(group.map((i) => notes[i].key), free, (k, v) => {
            let c = last[v] === null ? NEW + Math.abs(k - register[v]) : Math.abs(k - last[v]);
            for (let u = 0; u < count; u++)
                if (busy[u] > t && ((u < v && sounding[u] < k) || (u > v && sounding[u] > k)))
                    c += CROSS;
            return c;
        });
        for (const i of extra) {
            const v = take[take.length - 1];
            voice[i] = v;
            busy[v] = Math.max(busy[v], notes[i].end);
        }
        group.forEach((i, j) => {
            const v = take[j];
            voice[i] = v;
            last[v] = notes[i].key;
            sounding[v] = notes[i].key;
            busy[v] = Math.max(busy[v], notes[i].end);
        });
        g = h;
    }
    return { voice, count };
}
function registers(notes, order, count) {
    for (const i of order) {
        const t = notes[i].start;
        const now = notes.filter((n) => n.start <= t && n.end > t).map((n) => n.key);
        if (now.length >= count)
            return now.sort((a, b) => b - a).slice(0, count);
    }
    const keys = notes.map((n) => n.key);
    const [hi, lo] = [Math.max(...keys), Math.min(...keys)];
    return Array.from({ length: count }, (_, v) => hi - ((hi - lo) * v) / (count - 1));
}
function assign(keys, free, cost) {
    const [n, m] = [keys.length, free.length];
    const best = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
    for (let j = 0; j <= m; j++)
        best[n][j] = 0;
    for (let i = n - 1; i >= 0; i--)
        for (let j = m - (n - i); j >= 0; j--)
            best[i][j] = Math.min(best[i][j + 1], cost(keys[i], free[j]) + best[i + 1][j + 1]);
    const out = [];
    for (let i = 0, j = 0; i < n; j++) {
        if (best[i][j] === cost(keys[i], free[j]) + best[i + 1][j + 1]) {
            out.push(free[j]);
            i++;
        }
    }
    return out;
}
