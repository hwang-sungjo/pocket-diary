import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/constants/theme';

export interface AppInputProps extends TextInputProps {
  label: string;
  required?: boolean;
  helperText?: string;
  errorMessage?: string;
}

export function AppInput({
  label,
  required = false,
  helperText,
  errorMessage,
  style,
  ...props
}: AppInputProps) {
  const supportingText = errorMessage ?? helperText;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        accessibilityHint={errorMessage ?? props.accessibilityHint}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={colors.muted}
        style={[styles.input, errorMessage ? styles.inputError : null, style]}
        {...props}
      />
      {supportingText ? (
        <Text
          accessibilityLiveRegion={errorMessage ? 'assertive' : 'none'}
          style={errorMessage ? styles.error : styles.helper}
        >
          {supportingText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
    width: '100%',
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  required: {
    color: colors.danger,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inputError: {
    borderColor: colors.danger,
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
  },
});
