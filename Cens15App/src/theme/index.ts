import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    primaryContainer: '#bb86ec',
    secondary: '#03dac6',
    secondaryContainer: '#018786',
    background: '#ffffff',
    surface: '#ffffff',
    error: '#b00020',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#bb86ec',
    primaryContainer: '#6200ee',
    secondary: '#03dac6',
    secondaryContainer: '#018786',
    background: '#121212',
    surface: '#121212',
    error: '#cf6679',
  },
};