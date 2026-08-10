import { useRef, useActionState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { useSmithNoteContext } from '../hooks/useSmithNoteContext';

/**
 * パスワード再設定メールを送信する画面
 */
export function ForgotPasswordScreen() {
  const { actions } = useSmithNoteContext();
  const cloud = actions.cloud;
  const formRef = useRef<HTMLFormElement | null>(null);
  const [, resetPasswordAction, resetPasswordPending] = useActionState(
    async (_: boolean, formData: FormData) => {
      const sent = await cloud.resetPassword(formData);
      if (sent) formRef.current?.reset();
      return sent;
    },
    false,
  );
  const cloudPending = resetPasswordPending || cloud.loading;

  return (
    <section className="screen active settings-screen">
      <ScreenHeader title="パスワード再設定" />
      <div className="settings-content">
        <section className="settings-section" aria-labelledby="forgot-password-title">
          <h2 className="settings-section-title" id="forgot-password-title">
            パスワードを忘れた場合
          </h2>
          {!cloud.enabled ? (
            <div className="settings-cloud-panel">
              <p className="settings-help">
                Firebaseの設定がないため、パスワード再設定メールは送信できません。
              </p>
            </div>
          ) : cloud.userEmail ? (
            <div className="settings-cloud-panel">
              <p className="settings-help">
                すでにログインしています。パスワード変更はアカウント管理から行えます。
              </p>
              <button
                className="settings-primary-button"
                type="button"
                onClick={() => actions.setScreen('accountManagement')}
              >
                アカウント管理へ
              </button>
            </div>
          ) : (
            <form ref={formRef} className="settings-cloud-panel" action={resetPasswordAction}>
              <p className="settings-help">
                登録したメールアドレスを入力してください。パスワード再設定用のメールを送信します。
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
              <button className="settings-primary-button" type="submit" disabled={cloudPending}>
                再設定メールを送信
              </button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}
