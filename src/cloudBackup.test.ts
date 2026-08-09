import { describe, expect, it } from 'vitest';
import { cloudAuthErrorMessage, cloudBackupErrorMessage } from './cloudBackup';

describe('cloudAuthErrorMessage', () => {
  it('ログイン認証情報のエラーを具体的な案内へ変換する', () => {
    expect(cloudAuthErrorMessage({ code: 'auth/invalid-credential' }, 'signIn')).toBe(
      'メールアドレスまたはパスワードが正しくありません',
    );
  });

  it('通信エラーを操作にかかわらず接続確認の案内へ変換する', () => {
    expect(cloudAuthErrorMessage({ code: 'auth/network-request-failed' }, 'passwordReset')).toBe(
      '通信に失敗しました。インターネット接続を確認してください',
    );
  });

  it('応答待ちの上限超過を再試行できる案内へ変換する', () => {
    expect(cloudAuthErrorMessage({ code: 'auth/request-timeout' }, 'signIn')).toBe(
      '認証サーバーから応答がありません。通信環境を確認して再度お試しください',
    );
  });

  it('未知のエラーでは操作ごとの既定メッセージを返す', () => {
    expect(cloudAuthErrorMessage(new Error('unknown'), 'passwordReset')).toBe(
      'パスワード再設定メールの送信に失敗しました',
    );
  });
});

describe('cloudBackupErrorMessage', () => {
  it('Firestoreの権限エラーを設定確認の案内へ変換する', () => {
    expect(cloudBackupErrorMessage({ code: 'permission-denied' })).toBe(
      'Firestoreの権限設定を確認してください',
    );
  });

  it('Firestoreの一時的な接続エラーを再試行の案内へ変換する', () => {
    expect(cloudBackupErrorMessage({ code: 'unavailable' })).toBe(
      'クラウドへ接続できませんでした。通信環境を確認して再度お試しください',
    );
  });

  it('未知のFirestoreエラーでは診断用コードを表示する', () => {
    expect(cloudBackupErrorMessage({ code: 'internal' })).toBe(
      'クラウドバックアップに失敗しました（internal）',
    );
  });
});
