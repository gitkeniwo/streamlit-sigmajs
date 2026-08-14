import { mixColors } from './colorUtils';

export type ThemeName = 'streamlit' | 'humanistic';

export interface GraphThemeTokens {
  palette: string[];
  node: string;
  edge: string;
  edgeMuted: string;
  selected: string;
  text: string;
  background: string;
}

const THEMES: Record<ThemeName, GraphThemeTokens> = {
  streamlit: {
    palette: ['#ff4b4b', '#0068c9', '#09ab3b', '#faca2b', '#7d44cf', '#00c0f2', '#ff8700', '#6d3fc0', '#83c9ff', '#ffabab', '#7defa1', '#ffd16a'],
    node: '#0068c9',
    edge: '#a3a8b8',
    edgeMuted: '#d5d8e2',
    selected: '#ff4b4b',
    text: '#31333f',
    background: '#ffffff',
  },
  humanistic: {
    palette: ['#CC8B65', '#B4846C', '#8B9D83', '#D4A574', '#9B8579', '#C99A6E', '#A8968D', '#B89B88', '#7D8B7F', '#D4B59E', '#8E7968', '#9FA89A'],
    node: '#9B8579',
    edge: '#d4c4b0',
    edgeMuted: '#e8e3d8',
    selected: '#CC8B65',
    text: '#4a4137',
    background: '#fdfcfb',
  },
};

const cssValue = (styles: CSSStyleDeclaration, name: string, fallback: string): string => {
  const value = styles.getPropertyValue(name).trim();
  return value && !['unset', 'inherit', 'initial'].includes(value.toLowerCase())
    ? value
    : fallback;
};

const parsePalette = (value: string): string[] => {
  const matches = value.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi);
  return matches?.filter(Boolean) || [];
};

export const getThemeTokens = (
  theme: ThemeName,
  container?: Element | null,
): GraphThemeTokens => {
  const fallback = THEMES[theme];
  if (theme !== 'streamlit' || !container) return { ...fallback, palette: [...fallback.palette] };

  const styles = getComputedStyle(container);
  const background = cssValue(styles, '--st-background-color', fallback.background);
  const text = cssValue(styles, '--st-text-color', fallback.text);
  const selected = cssValue(styles, '--st-primary-color', fallback.selected);
  const configuredPalette = parsePalette(styles.getPropertyValue('--st-chart-categorical-colors'));

  return {
    palette: configuredPalette.length ? configuredPalette : [...fallback.palette],
    node: mixColors(text, background, 0.5),
    edge: mixColors(text, background, 0.58),
    edgeMuted: mixColors(text, background, 0.82),
    selected,
    text,
    background,
  };
};
