import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import { colors } from '@/constants/theme';

type AppButtonVariant = 'primary' | 'secondary' | 'danger';

interface AppButtonProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  variant?: AppButtonVariant;
  loading?: boolean;
}

export function AppButton({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        variant === 'primary'
          ? styles.primary
          : variant === 'danger'
            ? styles.danger
            : styles.secondary,
        state.pressed && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary'
              ? colors.white
              : variant === 'danger'
                ? colors.danger
                : colors.primary
          }
          size="small"
        />
      ) : (
        <Text
          style={
            variant === 'primary'
              ? styles.primaryText
              : variant === 'danger'
                ? styles.dangerText
                : styles.secondaryText
          }
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
  },
  primaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  dangerText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.5,
  },
});
