# The MIDI library: Bach, Musikalisches Opfer (1747)

MIDI files the app comes with: a collection of its MIDI library, a cell of its own in the library ([docs/ui/midi.md](../../docs/ui/midi.md#the-midi-library)). The two keyboard ricercars Mutopia has from the Musical Offering: the Ricercar a 3 (two staves) and the Ricercar a 6 (a track a voice). A test piece for the disassembler too ([docs/notes/disassembler.md](../../docs/notes/disassembler.md)): six voices on one theme, the hardest voice separation in the library.

Each is the file as the [Mutopia Project](https://www.mutopiaproject.org/) publishes it, renamed; [index.json](index.json) says the same as this table, for the app, which shows each file's credit in its details, puts it in the copyright field of a `.mid` saved from it and writes it as comments into the cells it converts to. [voices/](voices/) has each piece again with a track a voice, built from its LilyPond source (`tools/mutopia.py voice`): the voices as the typesetter wrote them, the ground truth the disassembler's voice separation is measured against; not in the app.

The music and these typesettings are in the public domain.

| File | Piece | Typeset by | Licence | Source |
| --- | --- | --- | --- | --- |
| [ricercar3.mid](ricercar3.mid) | Musikalisches Opfer, Ricercare, BWV 1079 | Arnaud Gossart | Public Domain | [Mutopia-2006/03/02-690](https://www.mutopiaproject.org/ftp/BachJS/BWV1079/ricercare/) |
| [ricercar6.mid](ricercar6.mid) | Musikalisches Opfer, Ricercare a 6, BWV 1079 | Arnaud Gossart | Public Domain | [Mutopia-2006/03/23-702](https://www.mutopiaproject.org/ftp/BachJS/BWV1079/ricercare6/) |
