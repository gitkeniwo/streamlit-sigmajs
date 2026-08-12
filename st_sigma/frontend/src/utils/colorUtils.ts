// 为不同的 labels 生成颜色
export const generateColorPalette = (count: number, baseColors: string[]): string[] => {

  // 如果需要的颜色数量超过基础颜色，使用 HSL 生成更多
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  const colors: string[] = [...baseColors];
  const step = 360 / (count - baseColors.length);
  
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i - baseColors.length) * step;
    colors.push(`hsl(${hue}, 45%, 60%)`);
  }

  return colors;
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
