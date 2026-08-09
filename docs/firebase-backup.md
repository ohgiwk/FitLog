# Firebase クラウドバックアップ

作成日: 2026-07-03

FitLog は端末内の `localStorage` を正本にし、希望するユーザーだけ Firebase Authentication と Cloud Firestore を使って手動クラウドバックアップ/復元を利用する。

## 役割

- 未ログインでもアプリ本体は通常どおり使える。
- ログインはバックアップ、復元、機種変更時だけ必要。
- 新規登録時は Firebase Auth の確認メールを送信する。
- 確認メールとパスワード再設定メールは Firebase 標準のメールアクション画面を使い、Capacitor のカスタムスキームを継続 URL として渡さない。
- クラウドには `State` 全体のスナップショットを保存する。
- 復元時は取得した `State` を `normalizeState` に通し、成功した場合だけローカル状態を置き換える。
- アカウント削除時は、ユーザー配下の Firestore データを削除してから Firebase Auth ユーザーを削除する。

## 必要な環境変数

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_STORAGE_BUCKET` 任意
- `VITE_FIREBASE_MESSAGING_SENDER_ID` 任意

必須の 4 項目が揃っていない場合、クラウドバックアップだけ無効になる。ローカル保存と JSON エクスポート/インポートは引き続き利用できる。

## Firestore 構成

```text
users/{uid}
  email
  updatedAt
  devices/{deviceId}
    name
    platform
    lastSeenAt
  backups/{backupId}
    deviceId
    stateJson
    stateSchemaVersion
    createdAt
```

`firestore.rules` は `users/{uid}` 配下をログイン中の同一ユーザーだけ読み書きできるように制限する。Rules を更新する場合は Firebase CLI で `firebase deploy --only firestore:rules --project <project-id>` を実行する。

## 実装ポイント

- Firebase 初期化は `src/firebaseClient.ts` に閉じている。
- iOS の Capacitor WebView では認証状態を `localStorage` に保存する `browserLocalPersistence` を明示し、IndexedDB の初期化待ちでログインが停止しないようにする。Web では Firebase の既定永続化を使う。
- iOS の Firestore 通信は long-polling を強制し、WKWebView と WebChannel の互換性問題でバックアップ通信が失敗しないようにする。Web では自動判定を使う。
- Firestore は `State` 全体の保存に備えて `ignoreUndefinedProperties` を有効にする。
- クラウド操作は `src/cloudBackup.ts` にまとめ、画面側は `useBackup` 経由で呼び出す。
- `createCloudBackup` はバックアップ作成後、最新 5 件だけ残して古いバックアップを削除する。
- `deleteCloudAccount` は Firestore の `users/{uid}` 配下を削除してから Firebase Auth のユーザーを削除する。
- Firebase Auth の仕様上、パスワード変更やアカウント削除は最近ログインしていないと失敗することがある。その場合は再ログインしてから操作する。

## GitHub Pages

`.github/workflows/deploy-pages.yml` の Build step で Firebase 用の `VITE_` 環境変数を渡す。Repository secrets に同名の値を設定する。
