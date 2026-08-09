import { useCallback, useEffect, useState } from 'react';
import {
  CloudBackup,
  cloudAuthErrorMessage,
  cloudBackupErrorMessage,
  cloudBackupAvailable,
  createCloudBackup,
  deleteCloudAccount,
  deleteCloudBackup,
  ensureCloudProfile,
  fetchCloudBackupState,
  getCloudSession,
  listCloudBackups,
  onCloudAuthChange,
  sendCloudPasswordReset,
  signInWithPassword,
  signOutCloud,
  signUpWithPassword,
  updateCloudPassword,
} from '../cloudBackup';
import { parseImportedState } from '../storage';
import { normalizeState } from '../storageNormalization';
import { State } from '../types';
import { localDate } from '../utils';

type BackupDeps = {
  state: State;
  setState: (state: State) => void;
  flushState: () => void;
  showToast: (message: string, action?: { actionLabel?: string; onAction?: () => void }) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  setCurrentWorkoutId: (workoutId: string | null) => void;
  setCurrentPresetId: (presetId: string | null) => void;
};

export type ImportSummary = {
  exercises: number;
  workouts: number;
  presets: number;
  goalAchievements: number;
};

export type PendingImport = {
  fileName: string;
  state: State;
  currentSummary: ImportSummary;
  incomingSummary: ImportSummary;
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
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null);
  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  /**
   * インポート確認で表示する件数を作る
   */
  function summarizeImportState(data: State): ImportSummary {
    return {
      exercises: data.exercises.length,
      workouts: data.workouts.length,
      presets: data.presets.length,
      goalAchievements: data.goalAchievements.length,
    };
  }

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
    downloadStateBackup(state, `smithnote-backup-${selectedDate}.json`);
    showToast('データをエクスポートしました');
  }

  /**
   * JSON ファイルを読み込んで正規化し、確定前の確認対象として保持する
   */
  async function importState(file: File) {
    try {
      const normalized = parseImportedState(await file.text());
      if (!normalized) return showToast('インポートできるデータが見つかりません');
      setPendingImport({
        fileName: file.name || 'backup.json',
        state: normalized,
        currentSummary: summarizeImportState(state),
        incomingSummary: summarizeImportState(normalized),
      });
    } catch {
      showToast('JSONの読み込みに失敗しました');
    }
  }

  /**
   * 確認済みのインポートデータで state を置き換える。
   * 置き換え前のデータは JSON と Undo の両方で戻せるようにする
   */
  function confirmImportState() {
    if (!pendingImport) return;
    const previousState = state;
    const nextState = pendingImport.state;
    downloadStateBackup(previousState, `smithnote-before-local-import-${localDate(new Date())}.json`);
    setState(nextState);
    setCurrentWorkoutId(null);
    setCurrentPresetId(nextState.presets[0]?.id || null);
    setSelectedDate(localDate(new Date()));
    setPendingImport(null);
    showToast('データをインポートしました', {
      actionLabel: '元に戻す',
      onAction: () => {
        setState(previousState);
        setCurrentWorkoutId(null);
        setCurrentPresetId(previousState.presets[0]?.id || null);
        setSelectedDate(localDate(new Date()));
        showToast('インポート前のデータに戻しました');
      },
    });
  }

  /**
   * 読み込んだインポート候補を破棄する
   */
  function cancelImportState() {
    setPendingImport(null);
  }

  /**
   * クラウドバックアップ一覧を読み込む
   */
  const refreshCloudBackups = useCallback(async () => {
    if (!cloudEnabled || !cloudUserEmail) return;
    try {
      setCloudBackups(await listCloudBackups());
    } catch (error) {
      console.error('Cloud backup list failed', error);
      showToast(cloudBackupErrorMessage(error));
    }
  }, [cloudEnabled, cloudUserEmail, showToast]);

  /**
   * 認証フォームの入力値を取り出して検証する
   */
  function readAuthFields(formData: FormData) {
    const emailValue = formData.get('email');
    const passwordValue = formData.get('password');
    const email = (typeof emailValue === 'string' ? emailValue : '').trim();
    const password = typeof passwordValue === 'string' ? passwordValue : '';
    if (!email) {
      showToast('メールアドレスを入力してください');
      return null;
    }
    return { email, password };
  }

  /**
   * メールアドレスとパスワードで新規登録する
   */
  async function signUp(formData: FormData) {
    const fields = readAuthFields(formData);
    if (!fields) return false;
    if (fields.password.length < 6) {
      showToast('パスワードは6文字以上で入力してください');
      return false;
    }
    try {
      const result = await signUpWithPassword(fields.email, fields.password);
      if (result.alreadyRegistered) {
        showToast('このメールアドレスはすでに登録されています');
        return false;
      }
      showToast('登録しました。確認メールを送信しました');
      return true;
    } catch (error) {
      showToast(cloudAuthErrorMessage(error, 'signUp'));
      return false;
    }
  }

  /**
   * メールアドレスとパスワードでログインする
   */
  async function signIn(formData: FormData) {
    const fields = readAuthFields(formData);
    if (!fields) return false;
    if (!fields.password) {
      showToast('パスワードを入力してください');
      return false;
    }
    try {
      await signInWithPassword(fields.email, fields.password);
      showToast('ログインしました');
      return true;
    } catch (error) {
      showToast(cloudAuthErrorMessage(error, 'signIn'));
      return false;
    }
  }

  /**
   * ログイン中ユーザーのパスワードを変更する
   */
  async function changePassword(formData: FormData) {
    const passwordValue = formData.get('newPassword');
    const confirmationValue = formData.get('confirmPassword');
    const password = typeof passwordValue === 'string' ? passwordValue : '';
    const confirmation = typeof confirmationValue === 'string' ? confirmationValue : '';
    if (!cloudUserEmail) {
      showToast('ログインしてください');
      return false;
    }
    if (password.length < 6) {
      showToast('新しいパスワードは6文字以上で入力してください');
      return false;
    }
    if (password !== confirmation) {
      showToast('確認用パスワードが一致しません');
      return false;
    }
    setCloudLoading(true);
    try {
      await updateCloudPassword(password);
      showToast('パスワードを変更しました');
      return true;
    } catch {
      showToast('パスワード変更に失敗しました');
      return false;
    } finally {
      setCloudLoading(false);
    }
  }

  /**
   * パスワード再設定メールを送信する
   */
  async function resetPassword(formData: FormData) {
    const emailValue = formData.get('email');
    const email = (typeof emailValue === 'string' ? emailValue : '').trim();
    if (!email) {
      showToast('メールアドレスを入力してください');
      return false;
    }
    setCloudLoading(true);
    try {
      await sendCloudPasswordReset(email);
      showToast('パスワード再設定メールを送信しました');
      return true;
    } catch (error) {
      showToast(cloudAuthErrorMessage(error, 'passwordReset'));
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
    try {
      await createCloudBackup(state);
      setCloudBackups(await listCloudBackups());
      showToast('クラウドへバックアップしました');
    } catch (error) {
      console.error('Cloud backup failed', error);
      showToast(cloudBackupErrorMessage(error));
    }
  }

  /**
   * クラウドバックアップからローカル state を復元する
   */
  async function restoreFromCloud(backupId: string) {
    try {
      const cloudState = await fetchCloudBackupState(backupId);
      const normalized = normalizeState(cloudState);
      if (!normalized) {
        showToast('復元できるデータが見つかりません');
        return;
      }
      downloadStateBackup(state, `smithnote-before-cloud-restore-${localDate(new Date())}.json`);
      setState(normalized);
      setCurrentWorkoutId(null);
      setCurrentPresetId(normalized.presets[0]?.id || null);
      setSelectedDate(localDate(new Date()));
      showToast('クラウドバックアップを復元しました');
    } catch (error) {
      console.error('Cloud restore failed', error);
      showToast(cloudBackupErrorMessage(error));
    }
  }

  /**
   * 指定したクラウドバックアップを削除する
   */
  async function deleteBackupFromCloud(backupId: string) {
    try {
      await deleteCloudBackup(backupId);
      setCloudBackups((current) => current.filter((backup) => backup.id !== backupId));
      showToast('クラウドバックアップを削除しました');
    } catch (error) {
      console.error('Cloud backup deletion failed', error);
      showToast(cloudBackupErrorMessage(error));
    }
  }

  /**
   * クラウドアカウントを削除する。ローカルデータは残す
   */
  async function deleteAccountFromCloud() {
    setCloudLoading(true);
    try {
      await deleteCloudAccount();
      setCloudUserEmail(null);
      setCloudBackups([]);
      showToast('クラウドアカウントを削除しました');
      return true;
    } catch {
      showToast('クラウドアカウントの削除に失敗しました');
      return false;
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
    pendingImport,
    confirmImportState,
    cancelImportState,
    cloud: {
      enabled: cloudEnabled,
      userEmail: cloudUserEmail,
      backups: cloudBackups,
      loading: cloudLoading,
      signUp,
      signIn,
      changePassword,
      resetPassword,
      signOut,
      backupToCloud,
      restoreFromCloud,
      deleteBackupFromCloud,
      deleteAccountFromCloud,
      refreshBackups: refreshCloudBackups,
    },
  };
}
