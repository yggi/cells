### Changed

- **Normalise folds a second clock into the main meter where it is one** (#668, part of #15; `normalise/meter.ts`):
  - **`tapClock`:** a clock whose every tick is a tick of one of the main meter's taps has its readers read that tap (`step=&sixteenths:16n` → `step=8n` under alla breve), and the clock goes.
  - **`shadowMeter`:** a second meter on the main meter's own rate that differs only by a swing or a legato gives it to the main meter.
  - **Neither folds** a clock with a slider of its own, a rhythm or a table.
  - **Each is checked past S1's window:** a clock's first 64 ticks against the tap's, to 1e-9 s (#669).
- **No example changes.** Every example with such a clock has it as its lesson, `breve` (a scan of sixteenths) and `daytime` (clock time), and keeps it (`normalise/kept.ts`).
