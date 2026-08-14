import { afterEach, describe, expect, it, vi } from 'vitest';

import { getThemeTokens } from './theme';

afterEach(() => vi.unstubAllGlobals());

describe('getThemeTokens', () => {
  it('reads Streamlit canvas colors and categorical palette from CSS variables', () => {
    const variables: Record<string, string> = {
      '--st-background-color': '#101010',
      '--st-text-color': '#f0f0f0',
      '--st-primary-color': '#ff00aa',
      '--st-chart-categorical-colors': '["#112233", "#445566", "rgb(1, 2, 3)"]',
    };
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => variables[name] || '',
    }));

    const theme = getThemeTokens('streamlit', {} as Element);

    expect(theme.background).toBe('#101010');
    expect(theme.text).toBe('#f0f0f0');
    expect(theme.selected).toBe('#ff00aa');
    expect(theme.palette).toEqual(['#112233', '#445566', 'rgb(1, 2, 3)']);
    expect(theme.edge).not.toBe('#a3a8b8');
    expect(theme.node).not.toBe(theme.palette[0]);
  });

  it.each(['unset', 'inherit', 'initial'])('falls back when CSS tokens are %s', (missing) => {
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => (
        name === '--st-chart-categorical-colors' ? '' : missing
      ),
    }));

    const theme = getThemeTokens('streamlit', {} as Element);

    expect(theme.background).toBe('#ffffff');
    expect(theme.text).toBe('#31333f');
    expect(theme.selected).toBe('#ff4b4b');
    expect(theme.edge).not.toBe(theme.text);
  });
});
