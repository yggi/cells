### Changed

- **Filing a fragment is twice as fast** (#867): `fileFragment` compared a new text with every fragment of the library by their canonical forms, and read those 216 texts again on every filing (87 % of its 45 ms). `canonicalText` is kept per text now (bounded to 4,096 texts, then started afresh), so a filing costs about 22 ms and a composer that files at each miss pays it once for the library. Answers are the same.
