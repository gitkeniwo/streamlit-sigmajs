import { describe, expect, it } from 'vitest';

import { generateColorPalette, hslToHex, mixColors } from './colorUtils';

describe('generateColorPalette', () => {
  it('uses Sigma-compatible hex colors after the base palette is exhausted', () => {
    const colors = generateColorPalette(15, ['#ff0000', '#00ff00']);

    expect(colors).toHaveLength(15);
    expect(colors.every((color) => /^#[0-9a-f]{6}$/i.test(color))).toBe(true);
    expect(colors.some((color) => color.startsWith('hsl('))).toBe(false);
    expect(colors[2]).not.toBe('#c76b6b');
  });

  it('converts HSL values deterministically', () => {
    expect(hslToHex(0, 45, 60)).toBe('#c76b6b');
    expect(hslToHex(120, 45, 60)).toBe('#6bc76b');
  });
});

describe('mixColors', () => {
  it('mixes hex and rgb colors for selection dimming', () => {
    expect(mixColors('#000000', 'rgb(255, 255, 255)', 0.5)).toBe('#808080');
  });
});
