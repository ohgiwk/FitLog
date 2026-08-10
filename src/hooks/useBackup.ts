import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CloudBackup,
  cloudAuthErrorMessage,
  cloudBackupErrorMessage,
  cloudBackupAvailable,
  deleteCloudAccount,
  deleteCloudBackup,
  ensureCloudProfile,
  fetchCloudBackupState,
  getCloudSession,
  listCloudBackups,
  onCloudAuthChange,
  saveDeviceCloudBackup,
  sendCloudPasswordReset,
  signInWithPassword,
  signInWithGoogle,
  signOutCloud,
  signUpWithPassword,
  updateCloudPassword,
} from '../cloudBackup';
import { getDeviceId } from '../device';
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

export type CloudSyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';

const cloudResolutionKey = (userId: string) =>
  `fit-log-cloud-resolution:${userId}:${getDeviceId()}`;

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
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudAuthReady, setCloudAuthReady] = useState(!cloudEnabled);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [cloudLastSyncedAt, setCloudLastSyncedAt] = useState<string | null>(null);
  const [cloudConflict, setCloudConflict] = useState<CloudBackup | null>(null);
  const [cloudSyncAllowed, setCloudSyncAllowed] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const lastSyncedStateUpdatedAtRef = useRef<string | null>(null);
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
    if (!cloudEnabled || !cloudUserId) return;
    try {
      setCloudBackups(await listCloudBackups());
    } catch (error) {
      console.error('Cloud backup list failed', error);
      showToast(cloudBackupErrorMessage(error));
    }
  }, [cloudEnabled, cloudUserId, showToast]);

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
   * Googleアカウントでログインする
   */
  async function googleSignIn() {
    setCloudLoading(true);
    try {
      await signInWithGoogle();
      showToast('Googleアカウントでログインしました');
      return true;
    } catch (error) {
      showToast(cloudAuthErrorMessage(error, 'googleSignIn'));
      return false;
    } finally {
      setCloudLoading(false);
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
      setCloudUserId(null);
      setCloudBackups([]);
      setCloudSyncAllowed(false);
      setCloudConflict(null);
      setCloudSyncStatus('idle');
      showToast('ログアウトしました');
    } catch {
      showToast('ログアウトに失敗しました');
    } finally {
      setCloudLoading(false);
    }
  }

  /**
   * クラウドバックアップからローカル state を復元する
   */
  async function restoreFromCloud(backupId: string, source: CloudBackup['source'] = 'legacy') {
    try {
      const cloudState = await fetchCloudBackupState(backupId, source);
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
  async function deleteBackupFromCloud(backupId: string, source: CloudBackup['source'] = 'legacy') {
    try {
      await deleteCloudBackup(backupId, source);
      setCloudBackups((current) =>
        current.filter((backup) => backup.id !== backupId || backup.source !== source),
      );
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
      setCloudUserId(null);
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
   * ログインした端末で同期開始前の復元要否を判定する
   */
  const prepareCloudSession = useCallback(
    async (session: Awaited<ReturnType<typeof getCloudSession>>) => {
      if (!session) return;
      setCloudUserId(session.user.uid);
      setCloudUserEmail(session.user.email ?? 'Googleアカウント');
      await ensureCloudProfile(session.user);
      const backups = await listCloudBackups();
      setCloudBackups(backups);
      const resolved = localStorage.getItem(cloudResolutionKey(session.user.uid)) === 'resolved';
      if (backups.length > 0 && !resolved) {
        setCloudConflict(backups[0]);
        setCloudSyncAllowed(false);
        setCloudSyncStatus('conflict');
        return;
      }
      if (!resolved) localStorage.setItem(cloudResolutionKey(session.user.uid), 'resolved');
      setCloudConflict(null);
      setCloudSyncAllowed(true);
      setCloudSyncStatus('pending');
    },
    [],
  );

  /**
   * クラウド復元または端末優先を確定して自動同期を開始する
   */
  async function resolveCloudConflict(choice: 'cloud' | 'device') {
    if (!cloudUserId || !cloudConflict) return;
    setCloudLoading(true);
    try {
      if (choice === 'cloud') {
        const cloudState = await fetchCloudBackupState(cloudConflict.id, cloudConflict.source);
        const normalized = normalizeState(cloudState);
        if (!normalized) throw new Error('Backup is invalid');
        downloadStateBackup(state, `smithnote-before-cloud-restore-${localDate(new Date())}.json`);
        setState(normalized);
        setCurrentWorkoutId(null);
        setCurrentPresetId(normalized.presets[0]?.id || null);
        setSelectedDate(localDate(new Date()));
        lastSyncedStateUpdatedAtRef.current = normalized.updatedAt;
      }
      localStorage.setItem(cloudResolutionKey(cloudUserId), 'resolved');
      setCloudConflict(null);
      setCloudSyncAllowed(true);
      setCloudSyncStatus(choice === 'cloud' ? 'synced' : 'pending');
      showToast(choice === 'cloud' ? 'クラウドデータを復元しました' : 'この端末のデータを使用します');
    } catch (error) {
      console.error('Cloud conflict resolution failed', error);
      showToast(cloudBackupErrorMessage(error));
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
        if (session) await prepareCloudSession(session);
        else {
          setCloudUserEmail(null);
          setCloudUserId(null);
        }
      })
      .catch(() => showToast('ログイン状態の確認に失敗しました'));
    const unsubscribe = onCloudAuthChange((session) => {
      if (session) {
        window.setTimeout(() => {
          prepareCloudSession(session).catch(() => showToast('ユーザー情報の更新に失敗しました'));
        }, 0);
      } else {
        setCloudUserEmail(null);
        setCloudUserId(null);
        setCloudBackups([]);
        setCloudSyncAllowed(false);
        setCloudConflict(null);
        setCloudSyncStatus('idle');
      }
      setCloudAuthReady(true);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [cloudEnabled, prepareCloudSession, showToast]);

  /**
   * ログイン後にバックアップ一覧を取得する
   */
  useEffect(() => {
    if (!cloudEnabled || !cloudUserId) return;
    void refreshCloudBackups();
  }, [cloudEnabled, cloudUserId, refreshCloudBackups]);

  /**
   * 変更が落ち着いた後、現在端末の固定バックアップへ自動保存する
   */
  useEffect(() => {
    if (!cloudEnabled || !cloudUserId || !cloudSyncAllowed || cloudConflict) return undefined;
    if (lastSyncedStateUpdatedAtRef.current === state.updatedAt) return undefined;
    setCloudSyncStatus('pending');
    const timer = window.setTimeout(async () => {
      setCloudSyncStatus('syncing');
      setCloudSyncError(null);
      flushState();
      try {
        const syncedAt = await saveDeviceCloudBackup(state);
        lastSyncedStateUpdatedAtRef.current = state.updatedAt;
        setCloudLastSyncedAt(syncedAt);
        setCloudSyncStatus('synced');
        setCloudBackups(await listCloudBackups());
      } catch (error) {
        console.error('Automatic cloud backup failed', error);
        setCloudSyncError(cloudBackupErrorMessage(error));
        setCloudSyncStatus('error');
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [cloudConflict, cloudEnabled, cloudSyncAllowed, cloudUserId, flushState, retryVersion, state]);

  useEffect(() => {
    const retry = () => setRetryVersion((current) => current + 1);
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, []);

  return {
    exportState,
    importState,
    pendingImport,
    confirmImportState,
    cancelImportState,
    cloud: {
      enabled: cloudEnabled,
      authReady: cloudAuthReady,
      signedIn: Boolean(cloudUserId),
      userEmail: cloudUserEmail,
      backups: cloudBackups,
      loading: cloudLoading,
      syncStatus: cloudSyncStatus,
      syncError: cloudSyncError,
      lastSyncedAt: cloudLastSyncedAt,
      conflict: cloudConflict,
      signUp,
      signIn,
      googleSignIn,
      changePassword,
      resetPassword,
      signOut,
      restoreFromCloud,
      deleteBackupFromCloud,
      deleteAccountFromCloud,
      refreshBackups: refreshCloudBackups,
      resolveConflict: resolveCloudConflict,
    },
  };
}
