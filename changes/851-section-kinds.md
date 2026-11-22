### Changed

- **A section's kind is the library's, not a list in code** (#851): `SectionType` in the feel is a `string`, and the kinds are the ids of the fragments of the facet `section` (`SECTION_KINDS`, `isSectionKind`, exported), so the song forms' `verse`, `chorus` and `outro` are kinds beside the six, and a kind the library gains is one a frame may name. The feel plays any kind as a groove is played but a breakdown: no piece sounds different (0 event snapshots move).
- **For a host:** a frame's `section` is any string; check a host's name against `isSectionKind` where the contract refuses what the library lacks (session version 2 minor 3 refuses `coda`).
