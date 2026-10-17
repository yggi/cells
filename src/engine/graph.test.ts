import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { writtenGraph } from './graph';
import { cellId } from './ids';
import { edgeLabel } from './transform';

describe('a tap on a belt says itself on its wire (#92)', () => {
  const label = (step: string) => {
    const r = compileSource(`&bar meter("4/4") step=120bpm\n&bells ${step} belt=3000 0 2\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&bells * &v]`);
    const e = writtenGraph(r).edges.find((x) => x.port === 'step' && x.source === cellId('bells'));
    return e ? edgeLabel(e) : undefined;
  };
  it('step=8n belt=3000 is 8n · belt, as step=&bar*2 belt=3000 was ×2 · belt', () => {
    expect(label('step=8n')).toBe('8n · belt');
    expect(label('step=&bar:beat')).toBe('beat · belt');
  });
});
