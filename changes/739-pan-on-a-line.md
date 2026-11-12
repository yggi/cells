### Added

- `pan=` on a line, as `legato=` is (#739): written on the line a voice plays, fixed or moving (`&t step=4 pan=&space 0 2 4 7`), it places the notes the line plays, read at each note's start, a balance after the voice's own. `pan=` alone no longer makes a cell a voice (`VOICE_MAKERS`: the sound parameters but `pan=`); no example wrote it so. On a cell that plays no notes it warns. No example changes how it sounds.
