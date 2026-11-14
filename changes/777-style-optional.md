### Changed

- A fragment of no style is found by no query (decision 090, #777): its kind (`association: - facet: module`) says what part it fills, and it is taken by its name, in a piece or in a fragment that has a style. The 8 modules and the 2 expressions no longer come back from `query`; Cell studio finds its modules by kind, as before. #765's `ANY_DISTANCE` (unreleased) is gone; `styledPointsOf` gives a fragment's points a query finds it by.
