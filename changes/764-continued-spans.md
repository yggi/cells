### Fixed

- A span on a continued line (a mix over several lines) names the line and column it is written at (#764): a product, a factor or a parse error on the second line of a mix was placed on the first line, past its end. A frontend that draws a diagnostic or rewrites by span reads the right place.
