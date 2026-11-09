### Removed

- **`PRESETS`, `Preset` and `PresetKey`, and `@yggi/cells/engine/presets`** (#551's aliases, deprecated since v0.19.0): read `EXAMPLES`, `Example` and `ExampleKey` from `@yggi/cells/engine/examples` (and `ExampleKey` from `engine/order`), or from the package's root. **Migration:** rename the import; nothing else changes. Cell studio moved at yggi/cell-studio#613 and Jambot never read them, so neither frontend's pin breaks.
