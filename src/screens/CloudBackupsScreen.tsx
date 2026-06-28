import { useState } from 'react';
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
   * 確認後にクラウドバックアップを復元する
   */
  async function confirmRestore() {
    if (!restoreTarget) return;
    const targetId = restoreTarget.id;
    setRestoreTarget(null);
    await cloud.restoreFromCloud(targetId);
  }

  /**
   * 確認後にクラウドバックアップを削除する
   */
  async function confirmDelete() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleteTarget(null);
    await cloud.deleteBackupFromCloud(targetId);
  }

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
              <button
                className="settings-primary-button"
                type="button"
                disabled={cloud.loading}
                onClick={() => void cloud.backupToCloud()}
              >
                今すぐクラウドへバックアップ
              </button>
              <div className="settings-cloud-list" aria-label="クラウドバックアップ一覧">
                <div className="settings-cloud-list-head">
                  <span>最新バックアップ</span>
                  <button
                    className="settings-text-button"
                    type="button"
                    disabled={cloud.loading}
                    onClick={() => void cloud.refreshBackups()}
                  >
                    更新
                  </button>
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
                          disabled={cloud.loading}
                          onClick={() => setRestoreTarget(backup)}
                        >
                          復元
                        </button>
                        <button
                          className="settings-icon-button danger"
                          type="button"
                          aria-label={`${formatBackupDate(backup.createdAt)} のバックアップを削除`}
                          disabled={cloud.loading}
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
            <div className="confirm-actions">
              <button
                className="small-outline"
                type="button"
                onClick={() => setRestoreTarget(null)}
              >
                キャンセル
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => void confirmRestore()}
              >
                復元
              </button>
            </div>
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
            <div className="confirm-actions">
              <button
                className="small-outline"
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                キャンセル
              </button>
              <button className="danger-button" type="button" onClick={() => void confirmDelete()}>
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
