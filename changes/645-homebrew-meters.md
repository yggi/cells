### Changed

- **Normalise writes a meter built by hand as the meter it is** (#645, part of #15). `normalise/meter.ts` has two rules, each written only where it sounds identical (S1):
  - **Even beats as a signature.** The main meter as a scan of equal beats, `scan(1 1 1)` or `scan(4 4 4 4)`, is `meter("3/4")` or `meter("4/4")`, for two beats to twelve. This replaces `names.ts`'s `fourFour`, which wrote `scan(1 1 1 1)` alone. A scan of 3s may be 6/8 or 3/16, so it stays as written.
  - **A swing clock as the meter's swing.** A clock of two that lines tap by its pulse becomes the main meter's swing, and its lines move to the note value:
    - `&swing scan(2 1) step=8n`, read by `step=&swing:pulse`, becomes `&bar … swing=&swing` and `&swing swing=8n:2/3`, with the lines on `step=8n`.
    - A ratio left free becomes a share left free: `free(2, 1..3)` → `free(2/3, 1/2..3/4)`. It starts at the same notes, but its slider now moves the share.
- **The examples:** `jazz`, `coltrane` and `five` swing their meter, `phase` and `musicbox` are `meter("3/4")`, `five` is `meter("5/4")`, and `bell` is `meter("12/8")` (by hand: its 4/4 with a "12/8" comment, its eighth triplets now `8n`). No `notes` or `events` hash moves. Their `values` hashes and their graphs do (a cell fewer, `&swing` a swing alone, `&tempo` named).
- The docs' and the parser tables' `scan(4 4 4 4)` are `meter("4/4")`.

### Added

- **A fraction in `free(…)`**: `free(2/3, 1/2..3/4)`, a share as `swing=` writes one. Before, a slider's start and ends were decimals only.

**What a frontend sees at its next pin:** a slider written as a fraction (its `FreeSpec`'s numbers are as before). Cell studio's slider for jazz's, coltrane's and five's swing is now the share, 0.5 to 0.75, not the ratio, 1 to 3.
