### Added

- **The section kinds, fragments of the facet `section`** (#810 rung 2): `intro`, `verse`, `chorus`, `groove`, `bridge`, `build`, `drop`, `breakdown` and `outro`. Each holds its intensity, the song's plus its offset (`&breakdown [&song + -.45]`, decision 096; the build a ramp by the bar from −0.15 to +0.3, the outro a fall to −0.45), and who plays, the band's entries (`&breakdownPlays [0,1,2]`). Taken by name, `&breakdown, &breakdownPlays from breakdown &song`, they have no style, so no query returns them (decision 090). A section plan splices them (decision 097). Jambot's six are lifted from its section chain (`ENERGY_OFFSET`, `barEnergy`, and who rests in an intro and a breakdown). The verse (−0.1, no stab), the chorus (+0.15, all) and the outro (a fall, no lead) are cells' own.

### Changed

- A sum written out with one term, `[&song + 0]`, is a sum of values (decision 079), as `[&song + -.3]` is; a bare cell alone, `[&a]`, still names what it mixes.
- A fragment's holes: a name a mix adds a number or a line of values to (`[&song + -.3]`, `[&song + &fall * -.45]`) is read as a line or a value, not a sound, so nothing stands in a voice for it.
- A fragment heard alone (`audition`): a head that is a sum of values is heard as the level of the host's line.
