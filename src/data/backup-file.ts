import { MAX_BACKUP_SIZE } from '@/domain/local-backup';

export async function saveBackupFile(name: string, text: string): Promise<void> {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);
    const finish = () => input.remove();
    input.addEventListener('cancel', () => {
      finish();
      resolve(null);
    }, { once: true });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      finish();
      if (!file) {
        resolve(null);
      } else if (file.size > MAX_BACKUP_SIZE) {
        reject(new Error('백업 파일이 너무 큽니다. 최대 25MB까지 가져올 수 있습니다.'));
      } else {
        file.text().then(resolve, reject);
      }
    }, { once: true });
    input.click();
  });
}
