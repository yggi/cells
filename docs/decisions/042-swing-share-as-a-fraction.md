# 042 · A swing share is a decimal or a fraction

**Date:** 2026-10-17 · **Status:** accepted (the owner approved it on #101's pull request) · Issues: #101, #82

## Context

A swing share was a decimal from 0 to 1 (`swing=8n:.67`), so a share that is not a short decimal was written to sixteen digits.
The swung meters ([decision 041](041-fragments-by-style.md)) meet Jambot's swing to 1e-9, so two of them read `swing=8n:.6666666666666666` (the triplet swing, 2/3) and `swing=16n:.5166666666666667` (31/60).
`.67` misses the triplet by 0.013 of a sixteenth: a test at 1e-9 sees it, an ear doesn't.

## Decision

- **Yes: a share is a decimal or a fraction of whole numbers**, `swing=8n:2/3`, `swing=16n:31/60`. It reads as what it is, and the most common swing is exact in three characters.
  - A fraction is a share of a level, `n/d` with no spaces and whole numbers, read as `n / d`; `n > d` (above 1) and `d = 0` fail with a diagnostic at the fraction. A decimal reads as before.
  - `src/repository/meters.ts` writes the two swung meters with their fractions; their tests (every onset within 1e-9 of Jambot's `leanMap`) pass unchanged.
- **Not collided with:** `/` already divides a chain (`1m/4`) and a time signature (`"4/4"`, a string), and neither is read where a share is: the fraction is read only after `level:` in `swing=`.
- **Not yet:** a bare `swing=2/3` on a list, a `free(…)` share's value and range, and `legato=` shares (which may exceed 1). Each is a decimal still; a fraction there is a later rung if a piece wants it.
- **Not yet: Shorten** writing a long decimal as its fraction (a denominator of at most 64, within 1e-12). It changes no sound, so it can follow.

**Why not** only decimals to sixteen digits: it is unreadable and hides that a share is a ratio.
**Why not** a fraction everywhere at once: each of those places reads a number by its own rule, and the issue asks about the share.
