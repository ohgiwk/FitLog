import { useActionState, useState } from 'react';
import { ChevronLeft, TrashIcon } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';

type CloudBackupItem = ReturnType<typeof useFitLogContext>['actions']['cloud']['backups'][number];

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
 * クラウドバックアップの作成・復元を管理する画面
 */
export function CloudBackupsScreen() {
  const { actions } = useFitLogContext();
  const cloud = actions.cloud;
  const [restoreTarget, setRestoreTarget] = useState<CloudBackupItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CloudBackupItem | null>(null);

  /**
   * クラウド操作中は対象操作だけ React の Action pending に任せる
   */
  const [, backupAction, backupPending] = useActionState(async () => {
    await cloud.backupToCloud();
    return null;
  }, null);
  const [, refreshAction, refreshPending] = useActionState(async () => {
    await cloud.refreshBackups();
    return null;
  }, null);
  const [, restoreAction, restorePending] = useActionState(async (_: null, formData: FormData) => {
    const targetId = String(formData.get('backupId') ?? '');
    if (!targetId) return null;
    setRestoreTarget(null);
    await cloud.restoreFromCloud(targetId);
    return null;
  }, null);
  const [, deleteAction, deletePending] = useActionState(async (_: null, formData: FormData) => {
    const targetId = String(formData.get('backupId') ?? '');
    if (!targetId) return null;
    setDeleteTarget(null);
    await cloud.deleteBackupFromCloud(targetId);
    return null;
  }, null);
  const cloudPending =
    backupPending || refreshPending || restorePending || deletePending || cloud.loading;

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
          <div className="bar-title">バックアップ一覧</div>
          <span />
        </div>
      </header>
      <div className="settings-content">
        <section className="settings-section" aria-labelledby="cloud-backup-list-title">
          <h2 className="settings-section-title" id="cloud-backup-list-title">
            クラウドバックアップ
          </h2>
          {!cloud.enabled ? (
            <div className="settings-cloud-panel">
              <p className="settings-help">
                Supabaseの設定がないため、クラウドバックアップは無効です。
              </p>
            </div>
          ) : !cloud.userEmail ? (
            <div className="settings-cloud-panel">
              <p className="settings-help">バックアップ一覧を使うにはログインしてください。</p>
              <button
                className="settings-primary-button"
                type="button"
                onClick={() => actions.setScreen('cloudAuth')}
              >
                新規登録 / ログインへ
              </button>
            </div>
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
