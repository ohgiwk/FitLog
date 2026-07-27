import { useRef, useState, useActionState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { useFitLogContext } from '../hooks/useFitLogContext';

/**
 * クラウドアカウントのパスワード変更と削除を行う画面
 */
export function AccountManagementScreen() {
  const { actions } = useFitLogContext();
  const cloud = actions.cloud;
  const passwordFormRef = useRef<HTMLFormElement | null>(null);
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false);

  const [, passwordChangeAction, passwordChangePending] = useActionState(
    async (_: boolean, formData: FormData) => {
      const changed = await cloud.changePassword(formData);
      if (changed) passwordFormRef.current?.reset();
      return changed;
    },
    false,
  );
  const [, accountDeleteAction, accountDeletePending] = useActionState(async () => {
    setAccountDeleteOpen(false);
    await cloud.deleteAccountFromCloud();
    return null;
  }, null);
  const cloudPending = passwordChangePending || accountDeletePending || cloud.loading;

  return (
    <section className="screen active settings-screen">
      <ScreenHeader title="アカウント管理" />
      <div className="settings-content">
        {!cloud.enabled ? (
          <section className="settings-section" aria-labelledby="account-disabled-title">
            <h2 className="settings-section-title" id="account-disabled-title">
              アカウント
            </h2>
            <div className="settings-cloud-panel">
              <p className="settings-help">
                Firebaseの設定がないため、クラウドアカウント管理は無効です。
              </p>
            </div>
          </section>
        ) : !cloud.userEmail ? (
          <section className="settings-section" aria-labelledby="account-login-required-title">
            <h2 className="settings-section-title" id="account-login-required-title">
              アカウント
            </h2>
            <div className="settings-cloud-panel">
              <p className="settings-help">
                パスワード変更とアカウント削除にはログインが必要です。バックアップ画面からログインしてください。
              </p>
              <button
                className="settings-primary-button"
                type="button"
                onClick={() => actions.setScreen('backup')}
              >
                バックアップへ戻る
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="settings-section" aria-labelledby="password-change-title">
              <h2 className="settings-section-title" id="password-change-title">
                パスワード変更
              </h2>
              <form
                ref={passwordFormRef}
                className="settings-cloud-panel"
                action={passwordChangeAction}
              >
                <label className="form-field settings-cloud-email">
                  <span>新しいパスワード</span>
                  <input
                    className="form-input"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="6文字以上"
                  />
                </label>
                <label className="form-field settings-cloud-email">
                  <span>新しいパスワード(確認)</span>
                  <input
                    className="form-input"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="もう一度入力"
                  />
                </label>
                <button className="settings-primary-button" type="submit" disabled={cloudPending}>
                  パスワードを変更
                </button>
              </form>
            </section>
            <section className="settings-section" aria-labelledby="account-delete-title">
              <h2 className="settings-section-title" id="account-delete-title">
                アカウント削除
              </h2>
              <div className="settings-cloud-panel">
                <p className="settings-help">
                  クラウドアカウントと保存済みバックアップを削除します。端末内の記録は残ります。
                </p>
                <button
                  className="danger-button"
                  type="button"
                  disabled={cloudPending}
                  onClick={() => setAccountDeleteOpen(true)}
                >
                  アカウントを削除
                </button>
              </div>
            </section>
          </>
        )}
      </div>
      {accountDeleteOpen && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cloud-account-delete-confirm-title"
          >
            <div className="confirm-title" id="cloud-account-delete-confirm-title">
              アカウントを削除しますか？
            </div>
            <p>
              {cloud.userEmail}
              のクラウドアカウントと保存済みバックアップを削除します。この操作は元に戻せません。端末内の記録は削除されません。
            </p>
            <form className="confirm-actions" action={accountDeleteAction}>
              <button
                className="small-outline"
                type="button"
                disabled={cloudPending}
                onClick={() => setAccountDeleteOpen(false)}
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
