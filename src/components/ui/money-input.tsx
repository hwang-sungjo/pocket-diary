import { AppInput, type AppInputProps } from '@/components/ui/app-input';
import { formatKRW, parseKRWInput } from '@/domain/input-values';

interface MoneyInputProps
  extends Omit<AppInputProps, 'inputMode' | 'keyboardType' | 'onChangeText' | 'value'> {
  value: number | null;
  onChangeValue: (value: number | null) => void;
}

export function MoneyInput({ value, onChangeValue, ...props }: MoneyInputProps) {
  return (
    <AppInput
      inputMode="numeric"
      keyboardType="number-pad"
      onChangeText={(text) => onChangeValue(parseKRWInput(text))}
      value={formatKRW(value)}
      {...props}
    />
  );
}
