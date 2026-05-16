import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

// Base dimensions (iPhone 11 / standard Android)
const BASE_WIDTH = 390;

export const W = width;
export const H = height;

// Scale a size relative to screen width
export const scale = (size) => Math.round((width / BASE_WIDTH) * size);

// For fonts — slightly less aggressive scaling
export const fontScale = (size) => {
  const scaled = (width / BASE_WIDTH) * size;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

// Is the device a tablet?
export const isTablet = width >= 768;

// Responsive tile width for grid (3 per row on phone, 4 on tablet)
export const tileWidth = isTablet ? '22%' : '29%';
