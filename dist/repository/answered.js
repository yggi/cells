import { answeredIn } from "../engine/use.js";
import { resolveSeed } from "./library.js";
export const answered = (text, resolve = resolveSeed) => answeredIn(text, resolve);
