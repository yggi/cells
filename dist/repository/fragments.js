const isFiniteNumber = (x) => typeof x === 'number' && Number.isFinite(x);
function pointProblems(point, where) {
    if (typeof point !== 'object' || point === null)
        return [`${where}: not a style point`];
    const axes = Object.entries(point);
    if (!axes.length)
        return [`${where}: an empty point (no axes)`];
    return axes.flatMap(([axis, value]) => (isFiniteNumber(value) ? [] : [`${where}: ${axis} is ${String(value)}, not a number`]));
}
export function fragmentProblems(entry) {
    const problems = [];
    const { id, text, association } = entry;
    if (typeof id !== 'string' || !id.trim())
        problems.push('no id');
    const name = typeof id === 'string' && id.trim() ? id : '(no id)';
    if (typeof text !== 'string' || !text.trim())
        problems.push(`${name}: no text`);
    if (!Array.isArray(association) || !association.length)
        problems.push(`${name}: no style point in its association`);
    else
        association.forEach((wp, i) => {
            const where = `${name}: point ${i + 1}`;
            if (!wp || !isFiniteNumber(wp.weight) || wp.weight <= 0)
                problems.push(`${where}: weight ${String(wp?.weight)}, not a number > 0`);
            problems.push(...pointProblems(wp?.point, where));
        });
    return problems;
}
export function pointDistance(a, b, axisWeights = {}) {
    let sum = 0;
    let weights = 0;
    for (const axis of Object.keys(a)) {
        if (!Object.hasOwn(b, axis))
            continue;
        const w = axisWeights[axis] ?? 1;
        sum += w * (a[axis] - b[axis]) ** 2;
        weights += w;
    }
    return weights > 0 ? Math.sqrt(sum / weights) : Infinity;
}
export function fragmentDistance(fragment, point, axisWeights = {}) {
    return Math.min(...fragment.association.map((wp) => pointDistance(wp.point, point, axisWeights) / wp.weight));
}
export function createRepository(entries) {
    const problems = entries.flatMap(fragmentProblems);
    const seen = new Set();
    for (const { id } of entries) {
        if (seen.has(id))
            problems.push(`${id}: the id is given twice`);
        seen.add(id);
    }
    if (problems.length)
        throw new Error(`A malformed repository: ${problems.join('; ')}`);
    const fragments = [...entries];
    return {
        fragments,
        query(point, k, axisWeights = {}) {
            if (!(Number.isInteger(k) && k >= 0))
                throw new Error(`query: k is ${k}, not a whole number ≥ 0`);
            const wrong = [
                ...Object.entries(point).flatMap(([axis, v]) => (isFiniteNumber(v) ? [] : [`${axis} is ${String(v)}`])),
                ...Object.entries(axisWeights).flatMap(([axis, w]) => (isFiniteNumber(w) && w > 0 ? [] : [`${axis}'s weight is ${String(w)}`])),
            ];
            if (wrong.length)
                throw new Error(`query: ${wrong.join(', ')}`);
            return fragments
                .map((fragment) => ({ fragment, distance: fragmentDistance(fragment, point, axisWeights) }))
                .sort((a, b) => a.distance - b.distance || (a.fragment.id < b.fragment.id ? -1 : a.fragment.id > b.fragment.id ? 1 : 0))
                .slice(0, k);
        },
    };
}
