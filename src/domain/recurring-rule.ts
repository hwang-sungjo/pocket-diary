import { isValidISODate } from '@/domain/input-values';
import type { TransactionType } from '@/domain/transaction';

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurringRule {
  id: string;
  type: TransactionType;
  name: string;
  totalAmount: number;
  categoryId: string;
  frequency: RecurringFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  scheduledTime: string;
  nextScheduledDate: string;
  requiresConfirmation: boolean;
  notificationEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringRuleDraft {
  type: TransactionType;
  name: string;
  totalAmount: number | null;
  categoryId: string;
  frequency: RecurringFrequency;
  interval: string;
  startDate: string;
  endDate: string;
  requiresConfirmation: boolean;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parseDateParts(value: string): DateParts {
  if (!isValidISODate(value)) {
    throw new Error('올바른 반복 예정일이 아닙니다.');
  }

  const [year, month, day] = value.split('-').map(Number);
  return { year: year!, month: month!, day: day! };
}

function formatDateParts({ year, month, day }: DateParts): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(value: string, amount: number): string {
  const { year, month, day } = parseDateParts(value);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

export function createRecurringRuleDraft(now = new Date()): RecurringRuleDraft {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return {
    type: 'expense',
    name: '',
    totalAmount: null,
    categoryId: '',
    frequency: 'monthly',
    interval: '1',
    startDate: `${year}-${month}-${day}`,
    endDate: '',
    requiresConfirmation: false,
  };
}

export function getRecurringRuleDraftErrors(
  draft: RecurringRuleDraft,
): string[] {
  const errors: string[] = [];
  const interval = Number(draft.interval);

  if (!draft.name.trim()) {
    errors.push('반복 거래명을 입력해 주세요.');
  }

  if (
    draft.totalAmount === null ||
    !Number.isSafeInteger(draft.totalAmount) ||
    draft.totalAmount <= 0
  ) {
    errors.push('반복 금액은 0보다 큰 정수 원화로 입력해 주세요.');
  }

  if (!draft.categoryId) {
    errors.push('반복 거래 카테고리를 선택해 주세요.');
  }

  if (!Number.isInteger(interval) || interval <= 0) {
    errors.push('반복 간격은 1 이상의 정수여야 합니다.');
  }

  if (!isValidISODate(draft.startDate)) {
    errors.push('올바른 시작일을 입력해 주세요.');
  }

  if (draft.endDate && !isValidISODate(draft.endDate)) {
    errors.push('올바른 종료일을 입력해 주세요.');
  } else if (draft.endDate && draft.endDate < draft.startDate) {
    errors.push('종료일은 시작일보다 빠를 수 없습니다.');
  }

  return errors;
}

export function buildRecurringRule(
  draft: RecurringRuleDraft,
  id: string,
  now = new Date(),
): RecurringRule {
  const errors = getRecurringRuleDraftErrors(draft);

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  const timestamp = now.toISOString();

  return {
    id,
    type: draft.type,
    name: draft.name.trim(),
    totalAmount: draft.totalAmount as number,
    categoryId: draft.categoryId,
    frequency: draft.frequency,
    interval: Number(draft.interval),
    startDate: draft.startDate,
    endDate: draft.endDate || null,
    scheduledTime: '09:00',
    nextScheduledDate: draft.startDate,
    requiresConfirmation: draft.requiresConfirmation,
    notificationEnabled: false,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getNextScheduledDate(
  rule: RecurringRule,
  scheduledDate: string,
): string {
  if (rule.frequency === 'weekly') {
    return addDays(scheduledDate, rule.interval * 7);
  }

  if (rule.frequency === 'custom') {
    return addDays(scheduledDate, rule.interval);
  }

  const current = parseDateParts(scheduledDate);
  const anchor = parseDateParts(rule.startDate);

  if (rule.frequency === 'monthly') {
    const monthIndex = current.year * 12 + current.month - 1 + rule.interval;
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    return formatDateParts({
      year,
      month,
      day: Math.min(anchor.day, daysInMonth(year, month)),
    });
  }

  const year = current.year + rule.interval;
  return formatDateParts({
    year,
    month: anchor.month,
    day: Math.min(anchor.day, daysInMonth(year, anchor.month)),
  });
}

export function recurringFrequencyLabel(rule: RecurringRule): string {
  const count = rule.interval === 1 ? '' : `${rule.interval}`;

  switch (rule.frequency) {
    case 'weekly':
      return count ? `${count}주마다` : '매주';
    case 'monthly':
      return count ? `${count}개월마다` : '매월';
    case 'yearly':
      return count ? `${count}년마다` : '매년';
    case 'custom':
      return `${rule.interval}일마다`;
  }
}
