import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { sharedStyles } from '@/components/screen';
import { AppButton } from '@/components/ui/app-button';
import { colors } from '@/constants/theme';
import { pickBackupFile, saveBackupFile } from '@/data/backup-file';
import { localBackupRepository } from '@/data/local-backup-repository';
import { parseLocalBackup, serializeLocalBackup, type LocalBackup } from '@/domain/local-backup';

interface LocalBackupCardProps {
  onRestored?: () => void;
}

interface RestorePreview {
  backup: LocalBackup;
  currentTransactionCount: number;
}

function backupFileName(now: Date): string {
  return `pocket-diary-${now.toISOString().replace(/[:.]/g, '-')}.json`;
}

export function LocalBackupCard({ onRestored }: LocalBackupCardProps) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function exportBackup() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const backup = await localBackupRepository.exportData();
      await saveBackupFile(backupFileName(new Date()), serializeLocalBackup(backup));
      setMessage(`백업 파일을 준비했습니다. 거래 ${backup.transactions.length}건이 포함됐습니다.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '백업 파일을 만들지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function selectBackup() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setPreview(null);
    try {
      const text = await pickBackupFile();
      if (text === null) {
        return;
      }
      const backup = parseLocalBackup(text);
      const current = await localBackupRepository.exportData();
      setPreview({ backup, currentTransactionCount: current.transactions.length });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '백업 파일을 읽지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup() {
    if (!preview) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await localBackupRepository.replaceData(preview.backup);
      setMessage(`복원을 완료했습니다. 거래 ${preview.backup.transactions.length}건을 확인할 수 있습니다.`);
      setPreview(null);
      onRestored?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '백업을 복원하지 못했습니다. 기존 데이터는 유지됩니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={sharedStyles.card} testID="local-backup-card">
      <Text style={sharedStyles.cardTitle}>로컬 데이터 백업·복원</Text>
      <Text style={sharedStyles.body}>
        거래, 상세 품목, 카테고리, 반복 규칙을 JSON 파일로 보관하거나 복원합니다.
        백업 파일에는 개인 거래 정보가 포함됩니다.
      </Text>
      <View style={styles.actions}>
        <AppButton disabled={busy} onPress={() => void exportBackup()} testID="export-backup">
          백업 파일 저장
        </AppButton>
        <AppButton
          disabled={busy}
          onPress={() => void selectBackup()}
          testID="select-backup"
          variant="secondary"
        >
          복원 파일 선택
        </AppButton>
      </View>

      {preview ? (
        <View style={styles.preview} testID="restore-preview">
          <Text style={styles.previewTitle}>복원 전 확인</Text>
          <Text style={sharedStyles.body}>
            백업 생성: {new Date(preview.backup.createdAt).toLocaleString('ko-KR')}
          </Text>
          <Text style={sharedStyles.body}>
            파일: 거래 {preview.backup.transactions.length}건 · 품목{' '}
            {preview.backup.transactions.reduce((count, entry) => count + entry.items.length, 0)}개 ·
            카테고리 {preview.backup.categories.length}개 · 반복 규칙{' '}
            {preview.backup.recurringRules.length}개
          </Text>
          <Text style={styles.warning}>
            현재 거래 {preview.currentTransactionCount}건을 포함한 이 기기의 로컬 데이터 전체가
            백업 파일의 내용으로 교체됩니다.
          </Text>
          <View style={styles.actions}>
            <AppButton
              disabled={busy}
              onPress={() => void restoreBackup()}
              testID="confirm-restore"
              variant="danger"
            >
              기존 데이터 교체
            </AppButton>
            <AppButton
              disabled={busy}
              onPress={() => setPreview(null)}
              variant="secondary"
            >
              취소
            </AppButton>
          </View>
        </View>
      ) : null}

      {busy ? (
        <Text accessibilityLiveRegion="polite" style={sharedStyles.body}>
          백업 파일을 처리하는 중입니다.
        </Text>
      ) : null}

      {error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error} testID="backup-error">
          {error}
        </Text>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message} testID="backup-message">
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  preview: { borderTopColor: colors.border, borderTopWidth: 1, gap: 8, paddingTop: 14 },
  previewTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  warning: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 14 },
  message: { color: colors.success, fontSize: 14 },
});
