import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const onboardingStyles = StyleSheet.create({
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
  },

  disabledInput: {
    backgroundColor: colors.disabled,
  },

  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },

  halfButton: {
    flex: 1,
  },

  spacingRight: {
    marginRight: 10,
  },
});