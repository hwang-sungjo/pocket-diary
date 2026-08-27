import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppInput, type AppInputProps } from '@/components/ui/app-input';
import { colors } from '@/constants/theme';
import { normalizeLookupValue } from '@/domain/autocomplete';

export interface AutocompleteOption {
  id: string;
  label: string;
  value: string;
}

interface AutocompleteInputProps
  extends Omit<AppInputProps, 'onChangeText' | 'value'> {
  options: readonly AutocompleteOption[];
  value: string;
  onChangeValue: (value: string) => void;
  onSelectOption?: (option: AutocompleteOption) => void;
}

export function AutocompleteInput({
  options,
  value,
  onChangeValue,
  onSelectOption,
  ...props
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const query = normalizeLookupValue(value);
    return options
      .filter(
        (option) =>
          !query || normalizeLookupValue(option.label).includes(query),
      )
      .slice(0, 5);
  }, [options, value]);

  return (
    <View style={styles.container}>
      <AppInput
        autoComplete="off"
        onChangeText={(text) => {
          onChangeValue(text);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        value={value}
        {...props}
      />
      {open && matches.length > 0 ? (
        <View style={styles.suggestions}>
          {matches.map((option) => (
            <Pressable
              accessibilityLabel={`${option.label} 자동완성`}
              accessibilityRole="button"
              key={option.id}
              onPress={() => {
                onChangeValue(option.value);
                onSelectOption?.(option);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.suggestion,
                pressed && styles.suggestionPressed,
              ]}
            >
              <Text style={styles.suggestionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    width: '100%',
  },
  suggestions: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestion: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionPressed: {
    backgroundColor: colors.primarySoft,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 14,
  },
});
