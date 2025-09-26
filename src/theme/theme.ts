// central theme file — change the colors here to match your reference image
import { MD3LightTheme as PaperDefault } from 'react-native-paper';
import { DefaultTheme as NavigationDefault } from '@react-navigation/native';
import { rf } from '../utils/responsiveUtils';

export const theme = {
  ...PaperDefault,
  colors: {
    ...PaperDefault.colors,
    primary: '#007BFF',      // Primary blue
    secondary: '#0056B3',    // Dark blue for accents
    tertiary: '#4DABF7',     // Secondary blue for secondary elements
    background: '#FFFFFF',   // White for backgrounds
    surface: '#FFFFFF',
    error: '#B00020',
    onSurface: '#000000', // Darker text for better contrast
    onBackground: '#000000',
  },
  fonts: {
    ...PaperDefault.fonts,
    headlineLarge: { ...PaperDefault.fonts.headlineLarge, fontSize: rf(32) },
    headlineMedium: { ...PaperDefault.fonts.headlineMedium, fontSize: rf(28) },
    headlineSmall: { ...PaperDefault.fonts.headlineSmall, fontSize: rf(24) },
    titleLarge: { ...PaperDefault.fonts.titleLarge, fontSize: rf(22) },
    titleMedium: { ...PaperDefault.fonts.titleMedium, fontSize: rf(20) },
    titleSmall: { ...PaperDefault.fonts.titleSmall, fontSize: rf(18) },
    bodyLarge: { ...PaperDefault.fonts.bodyLarge, fontSize: rf(18) },
    bodyMedium: { ...PaperDefault.fonts.bodyMedium, fontSize: rf(16) },
    bodySmall: { ...PaperDefault.fonts.bodySmall, fontSize: rf(14) },
    labelLarge: { ...PaperDefault.fonts.labelLarge, fontSize: rf(16) },
    labelMedium: { ...PaperDefault.fonts.labelMedium, fontSize: rf(14) },
    labelSmall: { ...PaperDefault.fonts.labelSmall, fontSize: rf(12) },
  },
};

export const navigationTheme = {
  ...NavigationDefault,
  colors: {
    ...NavigationDefault.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: '#000000',
  },
};
