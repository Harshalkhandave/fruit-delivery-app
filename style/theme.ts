import { MD3LightTheme } from 'react-native-paper';
import { colors } from './colors';

export const appTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    error: colors.error,
  },
};