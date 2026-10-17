import { leaves } from "./subseq.js";
export function refsOf(cell) {
    return (cell?.units ?? []).flatMap((u) => leaves(u.atom).flatMap((a) => (a.kind === 'ref' ? [a.name] : [])));
}
export function ownRate(cell) {
    return cell.clock === cell.name ? 1 : cell.rate;
}
export function stepsPerSecond(result, name) {
    const c = result.cells.get(name);
    const clock = c?.clock ? result.clocks.get(c.clock) : undefined;
    return c && clock ? clock.perSecond * ownRate(c) : null;
}
export function lapOf(result, name) {
    return Math.max(1, result.cells.get(name)?.steps ?? 1);
}
export function stepsAt(clk, cell) {
    return clk.stepOf(cell.clock ?? cell.name) * ownRate(cell);
}
