import { rewriteAll, ROUNDS } from "../rewrite.js";
import { argumentsByName } from "./arguments.js";
export const migrations = (options = {}) => (source, result) => [...argumentsByName(source, result, options.resolve)];
export const migrate = (source, options = {}) => {
    const old = { ...options, old: true };
    return rewriteAll(source, migrations(old), ROUNDS, old);
};
