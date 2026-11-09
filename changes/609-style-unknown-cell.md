### Fixed

- **`style=` that names no cell is an error** (#609): `style=&nowhere`, an end of a range (`style=&funk..&nope`), a mix's term or a curve that no line declares says `Unknown cell &nope` at the reference, as any other reference does. It compiled with nothing said, and what read the style read 0. A piece that compiled with no error plays as before.
