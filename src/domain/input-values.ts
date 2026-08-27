export function formatKRW(amount: number | null): string {
  return amount === null ? '' : new Intl.NumberFormat('ko-KR').format(amount);
}

export function parseKRWInput(input: string): number | null {
  const digits = input.replace(/[^0-9]/g, '');

  if (!digits) {
    return null;
  }

  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function isValidISODate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
