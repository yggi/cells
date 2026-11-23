import { rewriteAll, ROUNDS } from "../rewrite.js";
export const migrations = (_options = {}) => () => [];
export const migrate = (source, options = {}) => rewriteAll(source, migrations(options), ROUNDS, options);
