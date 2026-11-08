### Added

- **`toCore(text, { interface })`: the core up to a named interface** (decision 077 §2; #581, rung 2). An interface is a list of names, or a preset:
  - `'roles'`: the role cells and the gates each lists (a score cored up to its gates, for the band);
  - `'signature'`: a fragment's heads and parameters.

  Each interface cell keeps its name, stays a cell read by name and is a root of the fold. A step that would lose one isn't taken. `interfaceOf` says which names an interface keeps.

### Changed

- **With no interface, the core is what plays and nothing more** (decision 077 §1). A role goes, and the gates it read become products, each gate checked on its own by S1, so a gate over a kit stays without holding the others back. Spooky, Electroswing and Kinderlied have no performer left in their core. Up to their roles they keep them, and cored further to nothing they give their source's core. Nothing a piece plays changes.
