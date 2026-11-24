### Fixed

- A `from` line's fills are asked in the order the plugin-fragment's manifest names them (`PluginFragment.fills`), whatever order the fragment writes its lines in (#747, decision 085 §8.1). A solver whose one search answers several fills may keep its last answer and give the rest from it. They were asked in the fragment's line order, which agreed with the manifest's for `five_to_twelve` and `metric_accent`, so no piece sounds different.
