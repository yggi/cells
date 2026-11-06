### Changed

- **A meter is two applications of `even`** (decision 072, #506; yggi/music-commons `contracts/meter` v2, which cells now passes: all 149 vectors).
  - **The table of signature names is gone, and a signature is grouped by rule.**
    - x/8 and x/16 are the canonical even set of ⌈x/3⌉ groups: 3/8 is one beat, 8/8 3+3+2, 11/8 3+3+3+2, 13/8 3+3+2+3+2.
    - x/4 and x/2 are beats of the denominator, or threes where x is a multiple of 3 from 6. So 2/2, 3/2, 6/4, 7/4 and 4/2 now read.
    - Every name that read before keeps its grouping, its levels and its numbers.
  - **Groups of four or more are halved again, a tier for each halving**, as the contract has it. So 7/4's second halving is its own tier (`*:-:+--`).
  - **Sizes take a unit and groups of 4 and 6:** `meter("2+2+3/4")` is a seven of quarters, and `meter("4+3")` a seven of eighths counted 4+3.
  - **A meter's tiers have grades mapped from the ends** (`*` the bar, `,` the step, `.` the eighth, `+ - : ;` between), and the numbers it writes are its tiers from the ends into five. So a kit read by a meter is a plain index, and every existing meter writes the numbers it wrote.
  - **The second argument can be a note value:** `meter("6/8", 16n)` is `meter("6/8", 2)`, and written levels take their step's (`meter("*,.,+,.,", 8n)`, alla breve).
  - **Written levels: every mark but `.` and `,` starts a beat** (#15, item 3). `meter("*.-.+.-.")` is 4/4, four beats, where it was two, and `:` and `;` read.

  **What changes how a piece sounds:** a text that wrote levels with a `-` now has a beat at each `-`, so its bpm counts more beats and its bar is longer. No example or fragment writes one, and no event snapshot moves.

  **What a frontend sees at its next pin:**
  - `SIGNATURES` is gone from the package; `groupingOf(sig)` gives a signature's grouping.
  - `meterLevels` gives grades from the seven-symbol alphabet.
  - Signatures that were errors now compile.
