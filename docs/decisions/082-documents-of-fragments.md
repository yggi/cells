# 082 · A document gives fragments: a file of several signatures, each a part taken by its head; a piece and a fragment one kind of file

**Date:** 2026-11-09 · **Status:** proposed (the owner on yggi/cell-studio#621, 2026-11-09: "multiple fragments per document as proposed. very good proposal"; the rulings 1a–1e there, each "accepted"; the move "breaking, no need for ceremony"). Two questions are open (below). · Issues: #642 (rung C5 of yggi/cell-studio#621), #436

*Read with 065 (fragments take arguments: a signature, one main parameter and optional ones), 047 (fragments are files; a piece and a fragment the same kind of file), 048 (the learned layer; identity by `sameText` until the hash), 051 (literate cells) and 075 (a name is only a name).*

## Context

The owner's example: Kinderlieder written as one file, defining `&twinkle`, `&wonder` and the other tunes and building the piece from them, while still giving each tune as a fragment another piece can take (`&twinkle from kinderlied &key`).

Today a file holds one fragment, in one of two forms:
- **a collection** (no signature): a line takes the names it asks for, and every line they read;
- **a template** (one signature): a copy, its head named as the line names it, its parameters bound to the arguments, the rest its own.

`engine/use.ts` refuses a second signature ("a fragment has one"). A piece file and a fragment file are read by two readers (`readPiece`, `readFragment`), though decision 047 made them one kind of file. The six Kinderlied tunes are six seed files (`fragments/motifs/41-twinkle.md` …), each giving the Kinderlied style's point. #670 cuts four more tunes out of their examples into motif files the same way.

## Decision

### 1. A file may hold several signatures; each declares a part

```text
# Kinderlieder: the tunes, each a part this file gives
&twinkle from &key
&twinkle over=&key step=8n 0 0 4 4 5 5 4@2
&wonder from &key
&wonder over=&key step=8n 3 3 2 2 1 1 0@2
# … and the piece, built from them
&key from diatonic(mode=ionian) C
&twinkleSong from ternary(answer=&wonder) &twinkle
```

- **A part is its signature's heads and every line they read** (a collection's closure, wherever the lines sit in the file), its parameters bound as 065 binds a template's.
- **Lines no part reaches are the piece's own:** they play when the file is opened and are never given.
- **Two signatures naming one head are an error.**
- A file with one signature is a template, as 065 has it, and a file with none a collection.

### 2. A part is taken by its head

- `&twinkle from kinderlied &key` takes the part whose signature names `&twinkle`.
- In a file of several signatures, a line names the part by its head's name: 065's "the one head takes the name the using line gives" holds for a file of one signature only, since in a document the name is what picks the part. A line that names no part's head is an error naming the parts.
- A part's other heads are taken by their names, as 065 takes several heads.

### 3. A document's main parameter may have a line

- In a document, `&key` has a line of its own: the line the file plays with when it is opened as a piece.
- **Taken, the parameter stays required** (`&twinkle from kinderlied &key`), so a part never keeps the document's key unasked. The document's line is never the part's default.
- This amends 065 §2 ("the main parameter has none") for documents only.

### 4. A part is addressed and hashed by its head

- **In a text,** by its head (§2).
- **In the catalogue** (`catalogue`, #638), as `kinderlied › twinkle`: an entry per part, its file the document's.
- **Hashed alone:** a part's hash is its own lines' (its signature and what it reads), so editing the piece's own lines changes no part's hash. A lockfile records each head as `kinderlied/twinkle` (the id, a slash, the head), so two parts of one document are two entries.

### 5. A part's association is keyed by its head

- **For now, in the frontmatter:**

  ```text
  parts:
    twinkle:
      association: [ … ]
  ```

  A part with none is found by no query; it can still be taken by its head.
- **With #436,** each part carries its association in its own text, beside its signature (#436, rung C6 of yggi/cell-studio#621).

### 6. A piece and a fragment are one kind of file

- One reader reads both. Which keys its frontmatter holds (`id`, `association`, `parts`, `title`, `tags`, `tier`) says what it is; a file may be both a piece and a document of parts.
- `readPiece` and `readFragment` merge into it.

### 7. Kinderlieder moves in, breaking

- The six motif files (`twinkle`, `wonder`, `haenschen`, `hinein`, `heim`, `weinet`) become the parts of `examples/kinderlied.md`.
- Their ids are respelled in one change, with no forwarding release: Migrate rewrites `&twinkle from twinkle &key` as `&twinkle from kinderlied &key`.
- The changelog names the migration; Jambot's pin move names what it asks for by id.

## Open (the owner's, before the code)

1. **One namespace for pieces and fragments.** A piece that gives parts is resolved by its key, so an example's key and a fragment's id must not clash. Today `twinkle` and `waltz` are each both an example and a motif (85 keys, 141 ids at 4c91d35); §7 removes `twinkle`'s clash.
   - **(a) Recommended:** one namespace, held by a test; `waltz` respelled on one side.
   - **(b)** Pieces addressed apart from fragments (`from piece:kinderlied`); no clash to rule, but a second spelling of `from`.
2. **#670's tunes.** #670 cuts four tunes out of their examples into motif files (`royalTheme`, `bluesRiff`, `drunkenSailor`, `korobeiniki`), the opposite way from §1.
   - **Recommended:** #670 lands as it is, and C5's migration moves those four into their documents with Kinderlieder's six, so every example tune is a part of its piece.

## Why

- **A union of signatures, not a new form:** a document is what a collection already is (lines taken by name with their closure) with a template's binding per head. Nothing new is spelled, and a file of one signature reads as it did.
- **A part picked by its head:** a name is only a name (075), but in a document it is also the address, as a collection's names are; the one-head renaming stays where there is one head to rename.
- **The main parameter's line is the document's, not the part's:** the piece plays in its own key, and another piece never inherits that key without saying so.
- **One file kind:** a piece's tunes become reusable without copying them out, and the library's tunes stay beside the piece they were heard in.

## Alternatives

- **A block per fragment** (```` ```cells id=twinkle ````, addressed `kinderlied/twinkle`): clean, but new syntax, and it splits literate files (051) into units by fence rather than by meaning.
- **A folder as a document:** no language change, but a piece then can't give its own tunes.
- **Cutting tunes out into seed files** (as #670 does): works today, but a tune then lives apart from the piece it belongs to, and the piece takes it back from the library.
