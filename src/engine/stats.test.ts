import { describe, expect, it } from 'vitest';
import { spread } from './stats';

describe('spread', () => {
  it('min, max, mean and median; an even count takes the middle two', () => {
    expect(spread([4, 1, 3, 2])).toEqual({ min: 1, max: 4, mean: 2.5, median: 2.5 });
    expect(spread([5, 1, 9])).toEqual({ min: 1, max: 9, mean: 5, median: 5 });
    expect(spread([])).toEqual({ min: 0, max: 0, mean: 0, median: 0 });
  });
});
