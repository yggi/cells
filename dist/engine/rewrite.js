import { compileSource } from "./compile.js";
import { soundsIdentical } from "./sameness.js";
export const ROUNDS = 20;
export function rewriteAll(source, find, rounds = ROUNDS) {
    let now = source;
    const steps = [];
    for (let i = 0; i < rounds; i++) {
        const result = compileSource(now);
        if (!result.ok)
            break;
        let taken = null;
        for (const r of find(now, result)) {
            let next;
            try {
                next = r.apply(now);
            }
            catch {
                continue;
            }
            if (next !== now && soundsIdentical(now, next)) {
                taken = { next, title: r.title };
                break;
            }
        }
        if (!taken)
            break;
        steps.push(taken.title);
        now = taken.next;
    }
    return { source: now, steps };
}
