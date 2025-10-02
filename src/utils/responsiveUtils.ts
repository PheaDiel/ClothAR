import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Get screen dimensions (accounting for orientation)
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return {
    width: Math.min(width, height), // Always use smaller dimension as width
    height: Math.max(width, height), // Always use larger dimension as height
    isLandscape: width > height,
  };
};

const { width, height } = getScreenDimensions();

// Base dimensions for scaling (iPhone 6/7/8 as reference)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 667;

// Get width percentage
export const wp = (percentage: number) => (width * percentage) / 100;

// Get height percentage
export const hp = (percentage: number) => (height * percentage) / 100;

// Get responsive font size with better scaling
export const rf = (size: number, factor = 0.5) => {
  const scale = width / guidelineBaseWidth;
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

// Get responsive width (scales with screen width)
export const rw = (size: number) => {
  const scale = width / guidelineBaseWidth;
  return size * scale;
};

// Get responsive height (scales with screen height)
export const rh = (size: number) => {
  const scale = height / guidelineBaseHeight;
  return size * scale;
};

// Get number of columns based on screen width with better breakpoints
export const getNumColumns = () => {
  if (width < 360) return 1; // Very small screens
  if (width < 600) return 2; // Small screens (phones)
  if (width < 900) return 3; // Medium screens (tablets)
  if (width < 1200) return 4; // Large screens
  return 5; // Extra large screens
};

// Get responsive margin/padding
export const rmp = (size: number) => {
  const scale = Math.min(width / guidelineBaseWidth, height / guidelineBaseHeight);
  return size * scale;
};

// Check if device is tablet
export const isTablet = () => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = width * pixelDensity;
  const adjustedHeight = height * pixelDensity;
  return (
    (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) ||
    (pixelDensity === 2 && (adjustedWidth >= 1920 || adjustedHeight >= 1920))
  );
};

// Get device type
export const getDeviceType = () => {
  if (isTablet()) return 'tablet';
  if (width < 360) return 'small-phone';
  if (width < 600) return 'phone';
  return 'large-phone';
};