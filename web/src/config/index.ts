import fontsConfig from './fonts.json';

export interface FontConfig {
  name: string;
  family: string;
}

export interface FontsConfig {
  default: string;
  defaultLineHeight: number;
  fonts: FontConfig[];
}

export const fonts: FontsConfig = fontsConfig as FontsConfig;

export function getFont(name: string): FontConfig | undefined {
  return fonts.fonts.find(f => f.name === name);
}

export function getDefaultFont(): string {
  return fonts.default;
}

export function getDefaultLineHeight(): number {
  return fonts.defaultLineHeight;
}

