import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

export interface ChoiceOption<T extends string> {
  label: string;
  value: T;
}

interface ChoiceChipsProps<T extends string> {
  accessibilityLabel: string;
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export function ChoiceChips<T extends string>({
  accessibilityLabel,
  options,
  value,
  onChange,
}: ChoiceChipsProps<T>) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.selectedChip,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.text, selected && styles.selectedText]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  text: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedText: {
    color: colors.white,
  },
  pressed: {
    opacity: 0.75,
  },
});
