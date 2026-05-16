import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

const BASE_WIDTH = 390;

export const W = width;
export const H = height;

export const scale = (size) => Math.round((width / BASE_WIDTH) * size);

export const fontScale = (size) => {
  const scaled = (width / BASE_WIDTH) * size;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

export const isTablet = width >= 768;

export const tileWidth = isTablet ? '22%' : '29%';
