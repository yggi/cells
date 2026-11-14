### Added

- A ninth drum role, `ostinato` (#717; the feel contract's version 3, minor 1, yggi/music-commons#66): a drum line that repeats a pitched figure on toms or congas, named by what it does (decision 075), weighed by the default performer as a Euclid or a clave. `DrumRole` gains it, `role=ostinato` reads as it, and `salsa_drums`' `&tumbao` writes it. A frontend that keeps its own list of the roles adds it.
- Every line of every rhythm fragment but `electro_swing_drums` writes a `role=` (#717), 31 of 32, so a performer weighs every hit: each by what it does, as Jambot's drummer reads a kit's sound (`roleOfSound`): a snare's or a clap's backbeat line `backbeat`, the hats' and the ride's lines `hat` (`salsa_drums`' cáscara among them), the waltz's pedal hat `pedal`, `quiet_pulse`'s claves and `salsa_drums`' clave `clave`, and the kicks `kick`. What each plays doesn't move; a performer that read these lines as no role now plays them with the feel.

### Fixed

- The default performer's `played` gives an event none of the feel's (a drum hit of a role not among the nine, or of none, or a part not among the five) cells' own velocity and length, as the feel contract says, where a drum role it didn't know gave a velocity of NaN (found by yggi/jambot#668).
