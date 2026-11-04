import { readFragments } from "./files.js";
import { variantsOf } from "./variants.js";
import { SEED_FILES } from "./seed.generated.js";
function readSeed() {
    const read = readFragments(SEED_FILES);
    if ('problems' in read)
        throw new Error(`The seed library doesn't read: ${read.problems.join('; ')}`);
    return read.files;
}
export const SEED = readSeed();
export const fragmentsOf = (file) => variantsOf(file.fragment);
export const seedFragments = (folder) => SEED.filter((f) => f.path.startsWith(`${folder}/`)).flatMap(fragmentsOf);
