### Fixed

- A fragment's hash is taken once a text (#788): since the `e2:` hash (decision 089) each `from` line expanded and each fragment a query tried read the text's signature and counted its runs again, and a fitting query over the library took about 65 % longer. No hash changes.
