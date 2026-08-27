import { AppInput, type AppInputProps } from '@/components/ui/app-input';
import { isValidISODate } from '@/domain/input-values';

interface DateInputProps
  extends Omit<AppInputProps, 'inputMode' | 'onChangeText' | 'value'> {
  value: string;
  onChangeValue: (value: string) => void;
}

export function DateInput({
  value,
  onChangeValue,
  errorMessage,
  ...props
}: DateInputProps) {
  const validationError =
    !errorMessage && value.length > 0 && !isValidISODate(value)
      ? 'YYYY-MM-DD 형식의 올바른 날짜를 입력해 주세요.'
      : errorMessage;

  return (
    <AppInput
      inputMode="numeric"
      onChangeText={onChangeValue}
      placeholder="YYYY-MM-DD"
      value={value}
      {...(validationError ? { errorMessage: validationError } : {})}
      {...props}
    />
  );
}
