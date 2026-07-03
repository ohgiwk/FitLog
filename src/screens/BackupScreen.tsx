import { ChangeEvent, useRef, useState, useActionState } from 'react';
import { ChevronLeft, ExportIcon, ImportIcon, TrashIcon } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';

type CloudBackupItem = ReturnType<typeof useFitLogContext>['actions']['cloud']['backups'][number];

/**
 * FormData から文字列の値だけを取り出す
 */
function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

/**
 * バックアップ作成日時を表示用に整える
 */
function formatBackupDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/**
 * ローカルとクラウドのバックアップ操作をまとめて扱う画面
 */
export function BackupScreen() {
  const { actions } = useFitLogContext();
  const cloud = actions.cloud;
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<CloudBackupItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CloudBackupItem | null>(null);

  /**
   * 選択されたバックアップファイルを読み込み処理へ渡す
   */
  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await actions.importState(file);
  }

  const [, signInAction, signInPending] = useActionState(
    async (_: boolean, formData: FormData) => cloud.signIn(formData),
    false,
  );
  const [, signUpAction, signUpPending] = useActionState(
    async (_: boolean, formData: FormData) => cloud.signUp(formData),
    false,
  );
  const [, backupAction, backupPending] = useActionState(async () => {
    await cloud.backupToCloud();
    return null;
  }, null);
  const [, refreshAction, refreshPending] = useActionState(async () => {
    await cloud.refreshBackups();
    return null;
  }, null);
  const [, restoreAction, restorePending] = useActionState(async (_: null, formData: FormData) => {
    const targetId = readFormString(formData, 'backupId');
    if (!targetId) return null;
    setRestoreTarget(null);
    await cloud.restoreFromCloud(targetId);
    return null;
  }, null);
  const [, deleteAction, deletePending] = useActionState(async (_: null, formData: FormData) => {
    const targetId = readFormString(formData, 'backupId');
    if (!targetId) return null;
    setDeleteTarget(null);
    await cloud.deleteBackupFromCloud(targetId);
    return null;
  }, null);
  const [, signOutAction, signOutPending] = useActionState(async () => {
    await cloud.signOut();
    return null;
  }, null);
  const cloudPending =
    signInPending ||
    signUpPending ||
    backupPending ||
    refreshPending ||
    restorePending ||
    deletePending ||
    signOutPending ||
    cloud.loading;

  return (
    <section className="screen active settings-screen">
      <header className="topbar">
        <div className="bar-row">
          <button
            className="bar-btn"
            type="button"
            aria-label="戻る"
            onClick={() => actions.setScreen('settings')}
          >
            <ChevronLeft />
          </button>
          <div className="bar-title">バックアップ</div>
          <span />
        </div>
      </header>
      <div className="settings-content">
        <input
          ref={importInputRef}
          hidden
          accept="application/json,.json"
          type="file"
          onChange={(event) => void handleImport(event)}
        />
        <section className="settings-section" aria-labelledby="local-backup-title">
          <h2 className="settings-section-title" id="local-backup-title">
            ローカルバックアップ
          </h2>
          <p className="settings-help settings-section-body">
            端末内の記録をJSONファイルとして保存したり、保存済みのJSONファイルから復元できます。
          </p>
          <button className="settings-link-row" type="button" onClick={actions.exportState}>
            <ExportIcon />
            <span>記録を書き出す</span>
          </button>
          <button
            className="settings-link-row"
            type="button"
            onClick={() => importInputRef.current?.click()}
          >
            <ImportIcon />
            <span>記録を読み込む</span>
          </button>
        </section>
        <section className="settings-section" aria-labelledby="cloud-backup-title">
          <h2 className="settings-section-title" id="cloud-backup-title">
            クラウドバックアップ
          </h2>
          {!cloud.enabled ? (
            <div className="settings-cloud-panel">
              <p className="settings-help">
                Supabaseの設定がないため、クラウドバックアップは無効です。ローカル保存とJSONバックアップはそのまま使えます。
              </p>
            </div>
          ) : !cloud.userEmail ? (
            <form className="settings-cloud-panel">
              <p className="settings-help">
                機種変更やバックアップが必要な場合だけログインしてください。未ログインでも記録は端末内に保存されます。
              </p>
              <label className="form-field settings-cloud-email">
                <span>メールアドレス</span>
                <input
                  className="form-input"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <label className="form-field settings-cloud-email">
                <span>パスワード</span>
                <input
                  className="form-input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="6文字以上"
                />
              </label>
              <button
                className="settings-primary-button"
                type="submit"
                disabled={cloudPending}
                formAction={signInAction}
              >
                ログイン
              </button>
              <button
                className="settings-small-button"
                type="submit"
                disabled={cloudPending}
                formAction={signUpAction}
              >
                新規登録
              </button>
            </form>
          ) : (
            <div className="settings-cloud-panel">
              <form className="settings-cloud-action-form" action={backupAction}>
                <button className="settings-primary-button" type="submit" disabled={cloudPending}>
                  今すぐクラウドへバックアップ
                </button>
              </form>
              <div className="settings-cloud-list" aria-label="クラウドバックアップ一覧">
                <div className="settings-cloud-list-head">
                  <span>最新バックアップ</span>
                  <form action={refreshAction}>
                    <button className="settings-text-button" type="submit" disabled={cloudPending}>
                      更新
                    </button>
                  </form>
                </div>
                {cloud.backups.length === 0 ? (
                  <p className="settings-help">まだクラウドバックアップはありません。</p>
                ) : (
                  cloud.backups.map((backup) => (
                    <div className="settings-backup-row" key={backup.id}>
                      <div className="settings-label">
                        <span>{formatBackupDate(backup.createdAt)}</span>
                        <strong>
                          種目{backup.exerciseCount}件 / 記録{backup.workoutCount}件
                          {backup.lastWorkoutDate ? ` / 最終 ${backup.lastWorkoutDate}` : ''}
                        </strong>
                      </div>
                      <div className="settings-backup-actions">
                        <button
                          className="settings-small-button"
                          type="button"
                          disabled={cloudPending}
                          onClick={() => setRestoreTarget(backup)}
                        >
                          復元
                        </button>
                        <button
                          className="settings-icon-button danger"
                          type="button"
                          aria-label={`${formatBackupDate(backup.createdAt)} のバックアップを削除`}
                          disabled={cloudPending}
                          onClick={() => setDeleteTarget(backup)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
        {cloud.enabled && cloud.userEmail && (
          <section className="settings-section" aria-labelledby="account-management-title">
            <h2 className="settings-section-title" id="account-management-title">
              アカウント
            </h2>
            <div className="settings-cloud-panel">
              <div className="settings-cloud-account">
                <div className="settings-label">
                  <span>ログイン中</span>
                  <strong>{cloud.userEmail}</strong>
                </div>
                <div className="settings-account-actions">
                  <button
                    className="settings-small-button"
                    type="button"
                    onClick={() => actions.setScreen('accountManagement')}
                  >
                    管理
                  </button>
                  <form action={signOutAction}>
                    <button className="settings-small-button" type="submit" disabled={cloudPending}>
                      ログアウト
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
      {restoreTarget && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cloud-restore-title"
          >
            <div className="confirm-title" id="cloud-restore-title">
              バックアップを復元しますか？
            </div>
            <p>
              {formatBackupDate(restoreTarget.createdAt)}
              のバックアップで現在の端末データを置き換えます。復元前に現在のデータはJSONとして退避されます。
            </p>
            <form className="confirm-actions" action={restoreAction}>
              <input name="backupId" type="hidden" value={restoreTarget.id} />
              <button
                className="small-outline"
                type="button"
                disabled={cloudPending}
                onClick={() => setRestoreTarget(null)}
              >
                キャンセル
              </button>
              <button className="danger-button" type="submit" disabled={cloudPending}>
                復元
              </button>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cloud-delete-title"
          >
            <div className="confirm-title" id="cloud-delete-title">
              バックアップを削除しますか？
            </div>
            <p>
              {formatBackupDate(deleteTarget.createdAt)}
              のクラウドバックアップを削除します。この操作は元に戻せません。
            </p>
            <form className="confirm-actions" action={deleteAction}>
              <input name="backupId" type="hidden" value={deleteTarget.id} />
              <button
                className="small-outline"
                type="button"
                disabled={cloudPending}
                onClick={() => setDeleteTarget(null)}
              >
                キャンセル
              </button>
              <button className="danger-button" type="submit" disabled={cloudPending}>
                削除
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
