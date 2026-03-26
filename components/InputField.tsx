// components/InputField.tsx
import React from 'react';
import { Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';

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
    <View style={{ marginBottom: 12 }}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        error={!!(touched && error)}
        {...props}
      />
      {touched && error ? <Text style={{ color: 'red', marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}