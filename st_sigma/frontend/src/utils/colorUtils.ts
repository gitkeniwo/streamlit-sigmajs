// colorUtils.ts
export const generateColorPalette = (count: number): string[] => {
  // Vintage color palette 
  const baseColors = [
    '#CC8B65', // Warm terracotta
    '#B4846C', // Dusty rose brown
    '#8B9D83', // Sage green
    '#D4A574', // Vintage gold
    '#9B8579', // Warm taupe
    '#C99A6E', // Caramel
    '#A8968D', // Stone gray
    '#B89B88', // Sandy brown
    '#7D8B7F', // Moss green
    '#D4B59E', // Beige
    '#8E7968', // Cocoa
    '#9FA89A', // Sage gray
  ];

  // If count is less than or equal to baseColors length, return a slice
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

// Create a mapping from labels to colors
export const createLabelColorMap = (labels: string[]): Map<string, string> => {
  const colors = generateColorPalette(labels.length);
  const colorMap = new Map<string, string>();
  
  labels.forEach((label, index) => {
    colorMap.set(label, colors[index]);
  });
  
  return colorMap;
};