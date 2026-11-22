### Added

- A host's plugin-fragment plays its stream (#792, rung 6e of #691; decision 085 §6). The program keeps the plugins a compile was handed (`CompileResult.pluginFragments`), and realize plays a stream's laps with the host's code; `lawIn`, `lawAt` and the new `pluginIn(result, fragment)` find it before the built-ins, and laps kept for one plugin's code never answer for another's of the same id. `docs/language/plugin-wire.md` says the host's side. No piece sounds different.
