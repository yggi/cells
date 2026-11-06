### Fixed

- **`liveAt` draws a spliced line whose table doesn't exist, rather than throwing** (#307). A line spliced into another that read a table not in the text (`over=&missing`, mid-edit or a fragment the host can't resolve) threw a `TypeError` out of `resolveIn` (`engine/helix.ts`); it now stops at that table and marks the path so far. Nothing a piece plays changes.
