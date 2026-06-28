import { useActionState } from 'react';
import { ChevronLeft } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';

/**
 * クラウドバックアップ用の新規登録・ログイン画面
 */
export function CloudAuthScreen() {
  const { actions } = useFitLogContext();
  const cloud = actions.cloud;

  /**
   * ログイン成功後はバックアップ一覧へ進む
   */
  const [, signInAction, signInPending] = useActionState(async (_: boolean, formData: FormData) => {
    const signedIn = await cloud.signIn(formData);
    if (signedIn) actions.setScreen('cloudBackups');
    return signedIn;
  }, false);
  const [, signUpAction, signUpPending] = useActionState(
    async (_: boolean, formData: FormData) => cloud.signUp(formData),
    false,
  );
  const authPending = signInPending || signUpPending || cloud.loading;

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
          <div className="bar-title">クラウドバックアップ</div>
          <span />
        </div>
      </header>
      <div className="settings-content">
        <section className="settings-section" aria-labelledby="cloud-login-title">
          <h2 className="settings-section-title" id="cloud-login-title">
            新規登録 / ログイン
          </h2>
          {!cloud.enabled ? (
            <div className="settings-cloud-panel">
              <p className="settings-help">
                Supabaseの設定がないため、クラウドバックアップは無効です。ローカル保存とJSONバックアップはそのまま使えます。
              </p>
            </div>
          ) : (
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
                disabled={authPending}
                formAction={signInAction}
              >
                ログイン
              </button>
              <button
                className="settings-small-button"
                type="submit"
                disabled={authPending}
                formAction={signUpAction}
              >
                新規登録
              </button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}
