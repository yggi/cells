### Changed

- **The meter fragment is `bar`, and each style's feel a fragment of its own** (decision 103, #902). `&bar from bar(meter="3/4") &tempo` takes a common meter, straight; `funk_meter` (16n:.6), `swing_meter` (8n:2/3) and `lofi_meter` (16n:.65) are the swung 4/4s, `odd_meter` the 5/4, 7/8 and 10/8. Swing is the bar's own: `&bar swing=8n:2/3 from bar &tempo`. **Ambient's bar is straight** (its lean of 16n:31/60 dropped, the owner's ruling): what Ambient plays moves by that lean. No example's notes move.

  **What breaks at a frontend's next pin, and its map.** `from meter …` finds no fragment: there is no Migrate rule before 1.0 (#643). Write each old spelling or id as its new one:

  | old | new |
  |---|---|
  | `from meter &tempo`, id `meter` | `from bar &tempo`, id `bar` |
  | `meter(swing=8n:2/3)` | `swing_meter` |
  | `meter(swing=16n:.65)` | `lofi_meter` |
  | `meter(swing=16n:.6)` | `funk_meter` |
  | `meter(swing=16n:31/60)` | `bar` (straight) |
  | `meter(grouping=meter("2/4"))`, `"3/4"`, `"6/8"`, `"12/8"` | `bar(meter="2/4")`, … |
  | `meter(grouping=meter("2/2", 2))` | `bar(meter="4/4 in 2")`: its pulse a quarter now (decision 102) |
  | `meter(grouping=meter("5/4"))` | `odd_meter` |
  | `meter(grouping=meter("7/8"))`, `"10/8"` | `odd_meter(meter="7/8")`, `odd_meter(meter="10/8")` |
  | `from meter(swing=X) &tempo` in a piece | `&bar swing=X from bar &tempo` |
  | `from meter(grouping=meter("X")) &tempo` | `from bar(meter="X") &tempo` |

  A taken bar's private cell is `&bar_meter` (a text cell, kind `text`), where it was `&bar_grouping` and `&bar_swing`. A fragment's variant text is the plain line, `&bar meter("3/4") step=&tempo`; a style meter's, `&bar meter("4/4") step=&tempo swing=16n:.6`.
