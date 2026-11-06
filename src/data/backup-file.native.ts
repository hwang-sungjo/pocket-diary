import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { MAX_BACKUP_SIZE } from '@/domain/local-backup';

export async function saveBackupFile(name: string, text: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('이 기기에서는 백업 파일을 공유할 수 없습니다.');
  }
  const file = new File(Paths.cache, name);
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    type: '*/*',
  });
  if (result.canceled) {
    return null;
  }
  const asset = result.assets[0];
  if (!asset) {
    throw new Error('선택한 백업 파일을 읽을 수 없습니다.');
  }
  if (asset.size !== undefined && asset.size > MAX_BACKUP_SIZE) {
    throw new Error('백업 파일이 너무 큽니다. 최대 25MB까지 가져올 수 있습니다.');
  }
  const file = new File(asset.uri);
  if (file.size > MAX_BACKUP_SIZE) {
    throw new Error('백업 파일이 너무 큽니다. 최대 25MB까지 가져올 수 있습니다.');
  }
  return file.text();
}
