// components/InputField.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { colors } from '../style/colors';

interface Props {
  label: string;
  value: string;
  error?: string;
  touched?: boolean;
  onChange: (text: string) => void;
  onBlur: () => void;
  [key: string]: any; // any extra props for TextInput
}

export default function InputField({ label, value, error, touched, onChange, onBlur, ...props }: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        mode='flat'
        label={label}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        error={!!(touched && error)}
        {...props}
      />
      {touched && error ? <Text style={styles.container}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    errorText: {
      color: colors.error,
      marginTop: 4,
    },
  });