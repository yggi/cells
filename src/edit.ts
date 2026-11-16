/**
 * `@yggi/cells/edit`: change a text, and the files and operators around it. Edit a line's attributes (`setAttr`,
 * `setTiming`, `setBraid`, `setShift`, `setOff`, `setFree`), add, rename and delete a cell, read what a text holds
 * (`attrsOf`, `usersOf`, `declLine`), patch a cable (`patch`, `unpatch`), record a take into a cell (`recordTarget`),
 * hold a `free()` still (`withHeld`), vary a fragment (`variations`, `varied`, `anchorsOf`), write a piece shorter
 * (`shorten`), canonical (`normalise`), in the core grammar (`toCore`) or as the current version (`migrate`), and read
 * and write a piece's file (`readPiece`, `writePiece`, `readLiterate`). Nothing here is new: each name is what a frontend
 * reached by a module path (`docs/api.md` lists them), now from one place. A `Take` here is a recording
 * (`engine/capture`); the root's `Take` is a score's take, a different type.
 */
export {
  addCell,
  attrValue,
  attrsOf,
  declLine,
  declWords,
  deleteCell,
  nameProblem,
  offProblem,
  renameCell,
  setAttr,
  setBraid,
  setFree,
  setOff,
  setShift,
  setTiming,
  spansLines,
  splitComment,
  splitToken,
  splitWords,
  usersOf,
} from './engine/edit';
export { freeIndex, freeList, withHeld } from './engine/held';
export { recordTarget, tableReader, type RecordTarget, type Take, type Written } from './engine/capture';
export { jacksOf, MOVING, patch, PatchError, unpatch, type Jack } from './engine/patch';
export {
  anchorsOf,
  drawn,
  PITCHED_OPERATORS,
  readVariations,
  RHYTHM_OPERATORS,
  varied,
  variations,
  type Anchor,
  type Operator,
  type Variation,
  type VaryOptions,
} from './engine/vary';
export { linesOf, tapWhole } from './engine/vary/lines';
export { shorten, shortenAll, type ShortenOptions, type Suggestion } from './engine/shorten';
export { movedCard } from './engine/shorten/card';
export { normalise } from './engine/normalise';
export { migrate } from './engine/migrate';
export { toCore, type Core, type CoreOptions, type Interface } from './engine/core';
export {
  isPieceFile,
  lockChanges,
  lockfileOf,
  readPiece,
  textLockfile,
  withLockfile,
  writePiece,
  type LockChange,
  type PieceFile,
  type PieceFileProblems,
  type PieceFrontmatter,
} from './engine/piecefile';
export { fileLine, readLiterate, rewrite, type CodeLine, type Layout, type Literate, type LiterateProblems } from './engine/literate';
export { outlineOf, type Outline, type OutlineNode, type OutlineOptions, type OutlinePart } from './engine/outline';
