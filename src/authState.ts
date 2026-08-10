export const authIntroCompletedKey = 'fit-log-auth-intro-completed';
const authEntryModeKey = 'fit-log-auth-entry-mode';

export type AuthEntryMode = 'signIn' | 'signUp';

/**
 * 初回の認証案内を完了済みとして端末へ保存する
 */
export function completeAuthIntro() {
  localStorage.setItem(authIntroCompletedKey, 'true');
}

/**
 * 初回の認証案内を表示済みか返す
 */
export function hasCompletedAuthIntro() {
  return localStorage.getItem(authIntroCompletedKey) === 'true';
}

/**
 * 次に開く認証ボトムシートの初期タブを保持する
 */
export function setAuthEntryMode(mode: AuthEntryMode) {
  sessionStorage.setItem(authEntryModeKey, mode);
}

/**
 * 指定済みの認証タブを一度だけ取得する
 */
export function consumeAuthEntryMode(): AuthEntryMode {
  const mode = sessionStorage.getItem(authEntryModeKey);
  sessionStorage.removeItem(authEntryModeKey);
  return mode === 'signUp' ? 'signUp' : 'signIn';
}
