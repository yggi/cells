### Changed

- **A frame's section kind is any kind of the library** (#851): `SectionType` in the feel is a `string`, so the song forms' `verse`, `chorus` and `outro` (ids of `SECTION_KINDS`) type a frame beside the six (`SECTION_TYPES`, the contract's first list), and a kind the library gains is one a frame may name. The feel plays any kind as a groove is played but a breakdown: no piece sounds different (0 event snapshots move).
- **For a host:** a frame's `section` is any string; check a host's name against `SECTION_KINDS` where the contract refuses what the library lacks (session version 2 minor 3 refuses `coda`).
