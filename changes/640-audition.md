### Added

- **A fragment heard alone: `audition(text, options)`** (#640, rung C3 of yggi/cell-studio#621). A host gives a fragment what it lacks, by how the fragment reads it, never by a name it is expected to have (decision 075):
  - **Each hole gets a stand-in:** a tempo, a meter or a key as a piece writes one; a line, stepped; a sound, a voice, or the kit's own drum where the kit defines the name (`gm_kit` by default, `kit: null` for a voice everywhere).
  - **A style the fragment picks from** (`&style[…]`) stands at the point given (`style:`), with the centre of each axis it leaves out. An optional parameter's default line is written over, as a `from` line's argument is.
  - **Each head plays on one card:** a template's heads, or a collection's cells that nothing else in it reads. An envelope plays on a voice of its own.
  - **It lists the host's lines,** each with the hole it fills, so a frontend can show and change them. Where nothing can play, it says why.

  Every seed file plays alone but two, which say why: `band` (it plays a score) and `styles` (a style plays only through what reads it). `coreFragment` hears a fragment through the same host; its output is unchanged for every seed fragment. Nothing a piece plays changes.

### Removed

- **`repository/heard`** (#640): it heard a fragment on Jambot's channels by the names it expected (`&groove`, `&bassline`), against decision 075. A frontend hears a fragment through `audition`. The tests write their cards through `repository/benches`, from a fragment's heads (`headsOf`). Every hash those tests pin is unchanged.
