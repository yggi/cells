import { parse } from "./parser/index.js";
import { compile as compileIn } from "./compiler/index.js";
import { DEFAULT_ENV } from "./program.js";
function compile(parsed, env = DEFAULT_ENV) {
    return compileIn(parsed, env);
}
export const compileSource = (source, env = DEFAULT_ENV) => compile(parse(source), env);
