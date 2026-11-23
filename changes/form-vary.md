### Added

- **Vary varies a form and a song plan, by one set of slot operators at every scale** (decision 052, point 10; #51): a form's letters (`&chorus step=8n &a &a &b &a`) and a song plan's sections (`&verseChorus &intro &verse …`, its plan of who plays carried slot for slot) are lines of slots, as a progression's chords are, varied by `rotate`, `reverse`, `swap` (two adjacent slots, `swap &verseChorus 1`) and `substitute` (a slot given another's, `substitute &chorus 1 2`), around their first and last slot. The progression gains `swap` and `substitute` too (`HARMONY_OPERATORS`, after its own; 789 variations of the 17 seeds over C, from 419). `FORM_OPERATORS` names them; a form is varied only where a frontend asks for `swap` or `substitute`. **`VaryOptions.fixed`**, a mask by line, fixes other slots in place of a level's anchors, the same at every scale (`{ '&harm': [0, -1] }`). On the 6 seed forms and 7 song plans: 186 variations.

### Fixed

- **Vary varies only the fragment's own lines:** a pitched line of the workbench (a motif a form takes) was offered as a variation of the fragment, with an empty text; no seed's variations change.
