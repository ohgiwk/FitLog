import { ChangeEvent, useRef, useState, useActionState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { ExportIcon, ImportIcon, TrashIcon } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';

type CloudBackupItem = ReturnType<typeof useFitLogContext>['actions']['cloud']['backups'][number];
type ImportSummary = NonNullable<
  ReturnType<typeof useFitLogContext>['actions']['pendingImport']
>['currentSummary'];

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

function ImportSummaryRows({
  current,
  incoming,
}: {
  current: ImportSummary;
  incoming: ImportSummary;
}) {
  const rows = [
    ['種目', current.exercises, incoming.exercises],
    ['記録', current.workouts, incoming.workouts],
    ['メニュー', current.presets, incoming.presets],
    ['目標達成', current.goalAchievements, incoming.goalAchievements],
  ];

  return (
    <dl className="settings-import-summary">
      {rows.map(([label, currentCount, incomingCount]) => (
        <div className="settings-import-summary-row" key={label}>
          <dt>{label}</dt>
          <dd>
            {currentCount}件 → {incomingCount}件
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * ローカルとクラウドのバックアップ操作をまとめて扱う画面
 */
export function BackupScreen() {
  const { actions } = useFitLogContext();
  const cloud = actions.cloud;
  const pendingImport = actions.pendingImport;
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

  const [, restoreAction, restorePending] = useActionState(async (_: null, formData: FormData) => {
    const targetId = readFormString(formData, 'backupId');
    const source = readFormString(formData, 'source') as CloudBackupItem['source'];
    if (!targetId) return null;
    setRestoreTarget(null);
    await cloud.restoreFromCloud(targetId, source);
    return null;
  }, null);
  const [, deleteAction, deletePending] = useActionState(async (_: null, formData: FormData) => {
    const targetId = readFormString(formData, 'backupId');
    const source = readFormString(formData, 'source') as CloudBackupItem['source'];
    if (!targetId) return null;
    setDeleteTarget(null);
    await cloud.deleteBackupFromCloud(targetId, source);
    return null;
  }, null);
  const cloudPending = restorePending || deletePending || cloud.loading;

  return (
    <section className="screen active settings-screen">
      <ScreenHeader title="バックアップ" />
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
                Firebaseの設定がないため、クラウドバックアップは無効です。ローカル保存とJSONバックアップはそのまま使えます。
              </p>
            </div>
          ) : !cloud.signedIn ? (
            <div className="settings-cloud-panel">
              <p className="settings-help">
                ログインすると、記録の変更後にクラウドへ自動バックアップします。
              </p>
              <button
                className="settings-primary-button"
                type="button"
                onClick={() => actions.setScreen('auth')}
              >
                ログイン・新規登録
              </button>
            </div>
          ) : (
            <div className="settings-cloud-panel">
              <div className={`settings-sync-status ${cloud.syncStatus}`} role="status">
                <strong>
                  {cloud.syncStatus === 'syncing'
                    ? '同期中…'
                    : cloud.syncStatus === 'pending'
                      ? '変更をバックアップ待ち'
                      : cloud.syncStatus === 'error'
                        ? '自動バックアップに失敗'
                        : cloud.syncStatus === 'conflict'
                          ? '復元方法を選択してください'
                          : cloud.syncStatus === 'synced'
                            ? '自動バックアップ済み'
                            : '自動バックアップ待機中'}
                </strong>
                {cloud.lastSyncedAt && <span>最終同期 {formatBackupDate(cloud.lastSyncedAt)}</span>}
                {cloud.syncError && <p>{cloud.syncError}</p>}
              </div>
              <div className="settings-cloud-list" aria-label="クラウドバックアップ一覧">
                <div className="settings-cloud-list-head">
                  <span>端末別の最新バックアップ</span>
                </div>
                {cloud.backups.length === 0 ? (
                  <p className="settings-help">まだクラウドバックアップはありません。</p>
                ) : (
                  cloud.backups.map((backup) => (
                    <div className="settings-backup-row" key={backup.id}>
                      <div className="settings-label">
                        <span>{formatBackupDate(backup.createdAt)}</span>
                        <span>
                          {backup.source === 'device' ? '端末バックアップ' : '旧バックアップ'}
                        </span>
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
              <input name="source" type="hidden" value={restoreTarget.source} />
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
      {pendingImport && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="local-import-title"
          >
            <div className="confirm-title" id="local-import-title">
              記録を読み込みますか？
            </div>
            <p>
              {pendingImport.fileName}
              の内容で現在の端末データを置き換えます。読み込み前に現在のデータはJSONとして退避されます。
            </p>
            <ImportSummaryRows
              current={pendingImport.currentSummary}
              incoming={pendingImport.incomingSummary}
            />
            <div className="confirm-actions">
              <button
                className="small-outline"
                type="button"
                disabled={cloudPending}
                onClick={actions.cancelImportState}
              >
                キャンセル
              </button>
              <button
                className="danger-button"
                type="button"
                disabled={cloudPending}
                onClick={actions.confirmImportState}
              >
                読み込む
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
            <form className="confirm-actions" action={deleteAction}>
              <input name="backupId" type="hidden" value={deleteTarget.id} />
              <input name="source" type="hidden" value={deleteTarget.source} />
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
