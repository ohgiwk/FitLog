import { FormEvent, useEffect, useRef, useState } from 'react';
import { completeAuthIntro, consumeAuthEntryMode } from '../authState';
import { useFitLogContext } from '../hooks/useFitLogContext';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

/**
 * ログインと新規登録を切り替えて扱う独立認証画面
 */
export function AuthScreen() {
  const { actions } = useFitLogContext();
  const cloud = actions.cloud;
  const formRef = useRef<HTMLFormElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const modeTimerRef = useRef<number | null>(null);
  const [mode, setMode] = useState<AuthMode>(consumeAuthEntryMode);
  const [pending, setPending] = useState<'password' | 'google' | null>(null);
  const [closing, setClosing] = useState(false);
  const [contentTransition, setContentTransition] = useState<'visible' | 'out' | 'in'>('visible');

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      if (modeTimerRef.current !== null) window.clearTimeout(modeTimerRef.current);
    },
    [],
  );

  function finishAuth() {
    completeAuthIntro();
    actions.setScreen('home');
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current || pending) return;
    setPending('password');
    try {
      const formData = new FormData(formRef.current);
      const succeeded =
        mode === 'signIn' ? await cloud.signIn(formData) : await cloud.signUp(formData);
      if (succeeded) finishAuth();
    } finally {
      setPending(null);
    }
  }

  async function submitGoogle() {
    if (pending) return;
    setPending('google');
    try {
      if (await cloud.googleSignIn()) finishAuth();
    } finally {
      setPending(null);
    }
  }

  async function submitPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current || pending) return;
    setPending('password');
    try {
      const succeeded = await cloud.resetPassword(new FormData(formRef.current));
      if (succeeded) changeAuthMode('signIn');
    } finally {
      setPending(null);
    }
  }

  function changeAuthMode(nextMode: AuthMode) {
    if (mode === nextMode || contentTransition === 'out') return;
    setContentTransition('out');
    if (modeTimerRef.current !== null) window.clearTimeout(modeTimerRef.current);
    modeTimerRef.current = window.setTimeout(() => {
      setMode(nextMode);
      setContentTransition('in');
      modeTimerRef.current = window.setTimeout(() => setContentTransition('visible'), 180);
    }, 140);
  }

  function skipAuth() {
    if (closing) return;
    completeAuthIntro();
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => actions.setScreen('home'), 240);
  }

  const disabled = pending !== null || cloud.loading || closing || contentTransition === 'out';

  return (
    <section className="screen active auth-screen">
      <div
        className={`auth-card ${closing ? 'closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="ログイン・新規登録"
      >
        <div className={`auth-brand fade-${contentTransition}`}>
          <img className="auth-logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="" />
          <span>Smith Note</span>
        </div>
        <div className={`auth-content fade-${contentTransition}`}>
          {!cloud.enabled ? (
            <p className="auth-error">Firebaseが設定されていないため、現在ログインできません。</p>
          ) : (
            <>
              {mode !== 'forgotPassword' && (
                <div className="auth-tabs" role="tablist" aria-label="認証方法">
                  <button
                    className={mode === 'signIn' ? 'active' : ''}
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signIn'}
                    onClick={() => setMode('signIn')}
                  >
                    ログイン
                  </button>
                  <button
                    className={mode === 'signUp' ? 'active' : ''}
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signUp'}
                    onClick={() => setMode('signUp')}
                  >
                    新規登録
                  </button>
                </div>
              )}
              {mode === 'forgotPassword' ? (
                <form
                  ref={formRef}
                  className="auth-form auth-reset-form"
                  onSubmit={(event) => void submitPasswordReset(event)}
                >
                  <label className="form-field">
                    <span>メールアドレス</span>
                    <input
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                    />
                  </label>
                  <button className="settings-primary-button" type="submit" disabled={disabled}>
                    {pending === 'password' ? '送信中…' : '再設定メールを送信'}
                  </button>
                  <button
                    className="settings-text-button auth-forgot"
                    type="button"
                    disabled={disabled}
                    onClick={() => changeAuthMode('signIn')}
                  >
                    ログインに戻る
                  </button>
                </form>
              ) : (
                <>
                  <form
                    ref={formRef}
                    className="auth-form"
                    onSubmit={(event) => void submitPassword(event)}
                  >
                    <label className="form-field">
                      <span>メールアドレス</span>
                      <input
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        required
                      />
                    </label>
                    <label className="form-field">
                      <span>パスワード</span>
                      <input
                        name="password"
                        type="password"
                        autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                        minLength={6}
                        required
                      />
                    </label>
                    <button className="settings-primary-button" type="submit" disabled={disabled}>
                      {pending === 'password'
                        ? mode === 'signIn'
                          ? 'ログイン中…'
                          : '登録中…'
                        : mode === 'signIn'
                          ? 'ログイン'
                          : '登録する'}
                    </button>
                  </form>
                  {mode === 'signIn' && (
                    <button
                      className="settings-text-button auth-forgot"
                      type="button"
                      disabled={disabled}
                      onClick={() => changeAuthMode('forgotPassword')}
                    >
                      パスワードを忘れた場合
                    </button>
                  )}
                  <div className="settings-auth-divider" aria-hidden="true">
                    または
                  </div>
                  <button
                    className="auth-google-button"
                    type="button"
                    disabled={disabled}
                    onClick={() => void submitGoogle()}
                  >
                    <span aria-hidden="true">G</span>
                    {pending === 'google' ? 'Googleに接続中…' : 'Googleアカウントで続ける'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
        {mode !== 'forgotPassword' && (
          <button
            className={`auth-skip-button fade-${contentTransition}`}
            type="button"
            disabled={disabled}
            onClick={skipAuth}
          >
            あとで
          </button>
        )}
      </div>
    </section>
  );
}
