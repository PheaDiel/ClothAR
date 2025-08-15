// central theme file — change the colors here to match your reference image
import { MD3LightTheme as PaperDefault } from 'react-native-paper';
import { DefaultTheme as NavigationDefault } from '@react-navigation/native';

export const theme = {
  ...PaperDefault,
  colors: {
    ...PaperDefault.colors,
    primary: '#1E88E5',      // <-- replace these 4 colors with your palette
    secondary: '#FFB300',
    background: '#FBFCFF',
    surface: '#FFFFFF',
    error: '#B00020',
  },
  // other theme customizations ...
};

export const navigationTheme = {
  ...NavigationDefault,
  colors: {
    ...NavigationDefault.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: '#222',
  },
};
