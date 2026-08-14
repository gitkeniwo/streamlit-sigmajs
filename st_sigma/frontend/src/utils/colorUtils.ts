// 为不同的 labels 生成颜色
const channelToHex = (channel: number): string => (
  Math.round(channel * 255).toString(16).padStart(2, '0')
);

export const hslToHex = (hue: number, saturation: number, lightness: number): string => {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = ((hue % 360) + 360) % 360 / 60;
  const second = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1 ? [chroma, second, 0]
    : segment < 2 ? [second, chroma, 0]
      : segment < 3 ? [0, chroma, second]
        : segment < 4 ? [0, second, chroma]
          : segment < 5 ? [second, 0, chroma]
            : [chroma, 0, second];
  const offset = l - chroma / 2;
  return `#${channelToHex(red + offset)}${channelToHex(green + offset)}${channelToHex(blue + offset)}`;
};

export const generateColorPalette = (count: number, baseColors: string[]): string[] => {

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  const colors: string[] = [...baseColors];
  const goldenAngle = 137.507764;
  
  for (let i = baseColors.length; i < count; i++) {
    const hue = ((i - baseColors.length) + 1) * goldenAngle;
    colors.push(hslToHex(hue, 45, 60));
  }

  return colors;
};

const colorToNumber = (color: string): number | null => {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) return Number.parseInt(hex[1], 16);
  const shortHex = /^#([0-9a-f]{3})$/i.exec(color.trim());
  if (shortHex) {
    return Number.parseInt(shortHex[1].split('').map((value) => value + value).join(''), 16);
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color.trim());
  if (!rgb) return null;
  return (Number(rgb[1]) << 16) + (Number(rgb[2]) << 8) + Number(rgb[3]);
};

export const mixColors = (foreground: string, background: string, amount: number): string => {
  const from = colorToNumber(foreground);
  const to = colorToNumber(background);
  if (from === null || to === null) return foreground;
  const boundedAmount = Math.max(0, Math.min(1, amount));
  const channel = (shift: number) => Math.round(
    ((from >> shift) & 255) * (1 - boundedAmount) + ((to >> shift) & 255) * boundedAmount,
  );
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
};

// 为 labels 创建颜色映射
export const createLabelColorMap = (labels: string[], palette: string[]): Map<string, string> => {
  const colors = generateColorPalette(labels.length, palette);
  const colorMap = new Map<string, string>();
  
  labels.forEach((label, index) => {
    colorMap.set(label, colors[index]);
  });
  
  return colorMap;
};
