---
name: pianoroll
description: Draw what a cells text plays as a piano roll, rendered to PNG, for a decision or a review - one text, two texts side by side, or the same text before and after a change to the language, with the notes one plays and the other doesn't outlined. Use when a decision or a review is about what a piece plays and a picture would compare the options faster than the event snapshot's hashes or a table of notes, or when asked to show, draw or picture a piece's notes.
---

# Piano roll: what a text plays, as a picture

The tool is `tools/pianoroll.ts`, its test `tools/pianoroll.test.ts` (in `npm run verify`).
It compiles each text with this checkout's language, takes the notes that start in a window (8 s by default), and draws them as one SVG: a panel per text, stacked on one time axis and one pitch axis, a colour per voice kept across the panels, every C shaded and named.
With two panels, a note the other panel lacks (its voice, onset, length or pitch differ) is outlined in ink, and each panel's header counts them.
`--png` renders the SVG in Chromium's headless shell at twice its pixels.
Lifted in spirit from yggi/jambot `.claude/skills/screenshot` @ ef79048: inline SVG drawn from the numbers, no library, looked at before it is sent.

## 1. Draw

```sh
S=<your scratchpad>
node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/pianoroll.ts \
  --to 16 --title "Twinkle: &mid as &down^1 or &down^2?" -o $S/twinkle.svg --png \
  before=example:twinkle after=$S/twinkle-after.cells
```

- An input is `example:<key>` (`examples/<key>.cells`), a `.cells` file, or a `.json` of notes (below), each optionally `label=<input>`.
- `--from` and `--to` set the window in seconds; pick it by a measure (the first bar where the two differ, the section a change reaches), and say which it is.
- `--title` is the question the picture answers.
- A note that started before `--from` isn't drawn; one held past `--to` is clipped to it.

`tools/node-ts.mjs` lets Node run the source, whose imports carry no extension; without it Node stops at the first import.

## 2. Before and after a change to the language

The same text under two versions of the language is two checkouts: the tool writes a text's notes with `--notes` in one and draws them beside the other's.

```sh
git worktree add --detach $S/cells-main origin/main && (cd $S/cells-main && npm ci --no-audit --no-fund)
(cd $S/cells-main && node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs \
  tools/pianoroll.ts --to 16 --notes $S/before.json before=example:canon)
node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/pianoroll.ts \
  --to 16 -o $S/canon.svg --png $S/before.json after=example:canon
```

`src/engine/snapshot.txt` names the pieces whose notes moved (`npx vitest run src/engine/snapshot.test.ts`); draw those, one picture each, and the one that moved most first.
The review skill's `prepare.sh` puts a pull request in a worktree, so its head is the *after* and `main` the *before*.

## 3. Look before sending

Read every PNG. Nothing checks these:

- **The window shows the difference.** An outline count of 0 in a window where the snapshot says the piece changed means the change is elsewhere: move the window.
- **The range.** Rows run from the lowest pitch to the highest over all panels, so a single high note squeezes the rest; a narrower window may drop it.
- **The claims.** Every sentence that goes with the picture is checked against the notes (`--notes` writes them as JSON).
- **Colour is not the only mark.** The legend names each voice, and an outline, not a colour, marks what differs. A voice past the eighth is grey, named in the legend as "n more": draw fewer voices rather than more hues.

## 4. Send, and where things go

Send the PNGs (`SendUserFile`, or attach them where the session can); an issue or a pull request gets the numbers as text beside them, since a comment can't carry a local image.
The pictures stay in the scratchpad: they are views of what the repository already holds.

## The family's other pictures

A decision can borrow the form that fits:
- **Cell studio's `gallery`** draws what the graph draws: contact sheets of every wheel and every edge, and design mock-ups (yggi/cell-studio `.claude/skills/gallery`).
- **Jambot's `screenshot`** draws measured options side by side: piano rolls of bars that differ, a measure over bars, a tuning as a circle, and what plays as audio through its synth (yggi/jambot `.claude/skills/screenshot`).
- **This one** draws what a cells text plays, before and after a change to the language.

## Pitfalls

- The full browser (`/opt/pw-browsers/chromium`) crops `--screenshot` to less than its window; the tool uses the headless shell (`/opt/pw-browsers/chromium_headless_shell-*`, or `CHROME_SHELL`).
- Pitch is the note's frequency at its start, as a MIDI number: a bend while it sounds isn't drawn, and a note without a pitch (a noise) is left out.
