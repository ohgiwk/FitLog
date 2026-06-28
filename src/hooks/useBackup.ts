import { useCallback, useEffect, useState } from 'react';
import {
  CloudBackup,
  cloudBackupAvailable,
  createCloudBackup,
  deleteCloudBackup,
  ensureCloudProfile,
  fetchCloudBackupState,
  getCloudSession,
  listCloudBackups,
  onCloudAuthChange,
  signInWithPassword,
  signOutCloud,
  signUpWithPassword,
} from '../cloudBackup';
import { parseImportedState } from '../storage';
import { normalizeState } from '../storageNormalization';
import { State } from '../types';
import { localDate } from '../utils';

type BackupDeps = {
  state: State;
  setState: (state: State) => void;
  flushState: () => void;
  showToast: (message: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  setCurrentWorkoutId: (workoutId: string | null) => void;
  setCurrentPresetId: (presetId: string | null) => void;
};

/**
 * データのエクスポート(バックアップ)とインポート(復元)を担うフック
 */
export function useBackup({
  state,
  setState,
  flushState,
  showToast,
  selectedDate,
  setSelectedDate,
  setCurrentWorkoutId,
  setCurrentPresetId,
}: BackupDeps) {
  const [cloudEnabled] = useState(cloudBackupAvailable);
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null);
  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);

  /**
   * 現在の state を JSON ファイルとしてダウンロードする
   */
  function downloadStateBackup(data: State, filename: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * 現在の state を JSON ファイルとしてダウンロードする
   */
  function exportState() {
    downloadStateBackup(state, `fitlog-backup-${selectedDate}.json`);
    showToast('データをエクスポートしました');
  }

  /**
   * JSON ファイルを読み込んで正規化し、state を置き換える
   */
  async function importState(file: File) {
    try {
      const normalized = parseImportedState(await file.text());
      if (!normalized) return showToast('インポートできるデータが見つかりません');
      setState(normalized);
      setCurrentWorkoutId(null);
      setCurrentPresetId(normalized.presets[0]?.id || null);
      setSelectedDate(localDate(new Date()));
      showToast('データをインポートしました');
    } catch {
      showToast('JSONの読み込みに失敗しました');
    }
  }

  /**
   * クラウドバックアップ一覧を読み込む
   */
  const refreshCloudBackups = useCallback(async () => {
    if (!cloudEnabled || !cloudUserEmail) return;
    setCloudLoading(true);
    try {
      setCloudBackups(await listCloudBackups());
    } catch {
      showToast('クラウドバックアップの取得に失敗しました');
    } finally {
      setCloudLoading(false);
    }
  }, [cloudEnabled, cloudUserEmail, showToast]);

  /**
   * メールアドレスとパスワードで新規登録する
   */
  async function signUp() {
    const email = cloudEmail.trim();
    if (!email) return showToast('メールアドレスを入力してください');
    if (cloudPassword.length < 6) return showToast('パスワードは6文字以上で入力してください');
    setCloudLoading(true);
    try {
      await signUpWithPassword(email, cloudPassword);
      showToast('登録しました。確認メールが届いた場合は承認してください');
    } catch {
      showToast('新規登録に失敗しました');
    } finally {
      setCloudLoading(false);
    }
  }

  /**
   * メールアドレスとパスワードでログインする
   */
  async function signIn() {
    const email = cloudEmail.trim();
    if (!email) {
      showToast('メールアドレスを入力してください');
      return false;
    }
    if (!cloudPassword) {
      showToast('パスワードを入力してください');
      return false;
    }
    setCloudLoading(true);
    try {
      await signInWithPassword(email, cloudPassword);
      showToast('ログインしました');
      return true;
    } catch {
      showToast('ログインに失敗しました');
      return false;
    } finally {
      setCloudLoading(false);
    }
  }

  /**
   * クラウドからログアウトする。ローカルデータは残す
   */
  async function signOut() {
    setCloudLoading(true);
    try {
      await signOutCloud();
      setCloudUserEmail(null);
      setCloudBackups([]);
      showToast('ログアウトしました');
    } catch {
      showToast('ログアウトに失敗しました');
    } finally {
      setCloudLoading(false);
    }
  }

  /**
   * 現在の state をクラウドへ保存する
   */
  async function backupToCloud() {
    if (!cloudUserEmail) return showToast('ログインしてください');
    flushState();
    setCloudLoading(true);
    try {
      await createCloudBackup(state);
      setCloudBackups(await listCloudBackups());
      showToast('クラウドへバックアップしました');
    } catch {
      showToast('クラウドバックアップに失敗しました');
    } finally {
      setCloudLoading(false);
    }
  }

  /**
   * クラウドバックアップからローカル state を復元する
   */
  async function restoreFromCloud(backupId: string) {
    setCloudLoading(true);
    try {
      const cloudState = await fetchCloudBackupState(backupId);
      const normalized = normalizeState(cloudState);
      if (!normalized) {
        showToast('復元できるデータが見つかりません');
        return;
      }
      downloadStateBackup(state, `fitlog-before-cloud-restore-${localDate(new Date())}.json`);
      setState(normalized);
      setCurrentWorkoutId(null);
      setCurrentPresetId(normalized.presets[0]?.id || null);
      setSelectedDate(localDate(new Date()));
      showToast('クラウドバックアップを復元しました');
    } catch {
      showToast('クラウド復元に失敗しました');
    } finally {
      setCloudLoading(false);
    }
  }

  /**
   * 指定したクラウドバックアップを削除する
   */
  async function deleteBackupFromCloud(backupId: string) {
    setCloudLoading(true);
    try {
      await deleteCloudBackup(backupId);
      setCloudBackups((current) => current.filter((backup) => backup.id !== backupId));
      showToast('クラウドバックアップを削除しました');
    } catch {
      showToast('クラウドバックアップの削除に失敗しました');
    } finally {
      setCloudLoading(false);
    }
  }

  /**
   * 起動時と認証変更時にログイン状態を同期する
   */
  useEffect(() => {
    if (!cloudEnabled) return;
    let cancelled = false;
    getCloudSession()
      .then(async (session) => {
        if (cancelled) return;
        setCloudUserEmail(session?.user.email ?? null);
        if (session) await ensureCloudProfile(session.user);
      })
      .catch(() => showToast('ログイン状態の確認に失敗しました'));
    const unsubscribe = onCloudAuthChange((session) => {
      setCloudUserEmail(session?.user.email ?? null);
      if (session) {
        window.setTimeout(() => {
          ensureCloudProfile(session.user).catch(() =>
            showToast('ユーザー情報の更新に失敗しました'),
          );
        }, 0);
      } else {
        setCloudBackups([]);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [cloudEnabled, showToast]);

  /**
   * ログイン後にバックアップ一覧を取得する
   */
  useEffect(() => {
    if (!cloudEnabled || !cloudUserEmail) return;
    void refreshCloudBackups();
  }, [cloudEnabled, cloudUserEmail, refreshCloudBackups]);

  return {
    exportState,
    importState,
    cloud: {
      enabled: cloudEnabled,
      email: cloudEmail,
      password: cloudPassword,
      userEmail: cloudUserEmail,
      backups: cloudBackups,
      loading: cloudLoading,
      setEmail: setCloudEmail,
      setPassword: setCloudPassword,
      signUp,
      signIn,
      signOut,
      backupToCloud,
      restoreFromCloud,
      deleteBackupFromCloud,
      refreshBackups: refreshCloudBackups,
    },
  };
}
