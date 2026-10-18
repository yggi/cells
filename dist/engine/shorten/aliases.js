import { aliases as written } from "../normalise/aliases.js";
import { saves } from "./harness.js";
export function aliases(source, result) {
    return written(source, result, (alias, ours) => ours.length < alias.length).filter((s) => (saves(source, s) ?? 0) > 0);
}
