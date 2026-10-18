import { mainLength } from "../duration.js";
const DAY = 86400;
export function listening(t, cycles = 3) {
    const one = mainLength(t);
    if (one === null || !(one > 0))
        return null;
    if (t.ends !== null)
        return { seconds: Math.min(one, DAY), cycle: null, rounds: 1 };
    const rounds = Math.max(1, Math.min(cycles, Math.floor(DAY / one)));
    return { seconds: one * rounds, cycle: one, rounds };
}
