import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1F5FAF',
    primaryContainer: '#163F7A',
    secondary: '#F28C28',
    secondaryContainer: '#C96E1E',
    background: '#F7F9FC',
    surface: '#FFFFFF',
    error: '#D6452D',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#2B2B2B',
    onSurfaceVariant: '#6B6B6B',
    outline: '#E0E0E0',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#1F5FAF',
    primaryContainer: '#163F7A',
    secondary: '#F28C28',
    secondaryContainer: '#C96E1E',
    background: '#1A1A1A',
    surface: '#2B2B2B',
    error: '#D6452D',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#B0B0B0',
    outline: '#444444',
  },
};