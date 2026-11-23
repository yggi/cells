import { it } from 'vitest';
import * as fs from 'fs';
import { compileSource } from './engine/compile';
import { expansion } from './engine/use';
import { resolveSeed } from './repository/library';
it('p', () => {
  const src = '&bar meter(&meter) step=120bpm\n&meter "4/4"\n&chorus from AABA &meter';
  const r = compileSource(src, undefined, { resolve: resolveSeed });
  fs.writeFileSync('/tmp/claude-0/-home-user/de3031a9-e8c7-53c5-9f1d-f95ee7767812/scratchpad/aaba.txt', expansion(src, { resolve: resolveSeed }).text + '\n---\n' + r.diagnostics.map((d) => d.severity + ' ' + d.message).join('\n'));
});
