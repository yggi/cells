### Fixed

- **Extraction takes what a `from` line passes as the fragment's main parameter** (#807): lines that take from the library, as Kinderlieder's `&harm from vamp_to_the_fifth &key` does, extract with `&key` as the main parameter (`&harm, &bassline from my_vamp_bass &key`), and the piece plays the same. Before, it was left as a sound read by name and the piece played differently. Nothing a piece plays changes.
