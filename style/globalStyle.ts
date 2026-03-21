import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: colors.surface,
    elevation: 3,
  },

  title: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  input: {
    marginBottom: 16,
    marginTop: 8,
    height: 56,         // recommended for outlined
    backgroundColor: colors.inputBackground,
  },

  button: {
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  languageContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 100,
  },

  centerText: {
    textAlign: 'center',
    color: colors.textSecondary,
  },

  mt10: { marginTop: 10 },
  mt20: { marginTop: 20 },
  mb10: { marginBottom: 10 },
  mb20: { marginBottom: 20 },
});