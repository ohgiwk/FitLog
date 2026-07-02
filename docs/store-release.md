# iOS / Android ストア公開準備メモ

このメモは、FitLog を iOS App Store / Google Play で公開するために必要な準備を整理したものです。調査日は 2026-06-29 です。ストア要件は変わるため、着手前に公式ドキュメントを再確認してください。

## 1. 現状と前提

- FitLog は React + Vite + TypeScript の PWA で、現在の公開先は GitHub Pages の `/FitLog/` です。
- 通常データは端末の `localStorage` に保存し、任意で Supabase のメールアドレス・パスワード認証によるクラウドバックアップを使います。
- App Store / Google Play へ出すには、PWA をそのまま提出するのではなく、Capacitor などで iOS / Android のネイティブプロジェクトへ包み、各ストア用のビルド成果物を作る必要があります。
- ストア版では `base: '/FitLog/'` のままではパス解決が合わない可能性が高いため、Web版とストア版で Vite の `base` や PWA 設定を切り替える方針を先に決めます。

## 2. 共通で必要な準備

### アプリとしての基本情報

- アプリ名、サブタイトル / 短い説明、説明文、カテゴリ、対象年齢、サポートURL、マーケティングURLを用意する。
- プライバシーポリシーURLを用意する。FitLog は `localStorage` に健康・運動系の記録を保存し、任意ログイン時はメールアドレスとバックアップデータを Supabase に保存するため、収集・保存・削除・問い合わせ方法を明記する。
- 利用規約または免責文を用意する。筋トレ記録アプリなので、医療・健康上の助言ではないこと、運動は自己判断または専門家の助言に従うことを明記する。
- アプリアイコン、ストア用スクリーンショット、プロモーション画像を各ストアのサイズに合わせて作成する。
- サポート用メールアドレスを用意する。

### 実装・ビルド

- ネイティブ化の候補を決める。現状の React/Vite 資産を活かすなら Capacitor が第一候補。
- iOS / Android プロジェクトを追加し、Webビルド成果物をネイティブ WebView に取り込む。
- Web版とストア版の環境差分を整理する。
  - GitHub Pages 用 `base: '/FitLog/'`
  - ストア版用の相対パスまたは専用 `base`
  - Supabase 環境変数
  - PWA Service Worker をストア版で使うかどうか
- `localStorage` が WebView 内に閉じることを前提に、機種変更・再インストール時の復元導線としてクラウドバックアップ / JSONバックアップをストア版でも確認する。
- オフライン起動、画面回転、Safe Area、キーボード表示、戻る操作、音アラート、ファイルダウンロード / インポートを実機で確認する。

### プライバシー・データ削除

- App Store Connect の App Privacy、Google Play Console の Data safety に回答できるよう、扱うデータを分類する。
- FitLog で想定されるデータ:
  - トレーニング記録、身体活動に近いユーザー生成データ
  - メールアドレス、認証情報
  - 端末ID相当のローカル識別子
  - クラウドバックアップの作成日時、種目数、記録数
- アカウント作成を提供する場合、アプリ内またはWeb上でアカウント削除を開始できる導線が必要。Supabase Auth ユーザーと `cloud_backups` の削除方針を実装・説明する。
- データ削除依頼の問い合わせ先と、削除対象、削除までの期間をプライバシーポリシーに書く。

## 3. iOS App Store で必要なこと

### Apple Developer / App Store Connect

- Apple Developer Program に登録する。
- App Store Connect にアプリを作成し、Bundle ID、SKU、カテゴリ、年齢制限、価格、配信地域を設定する。
- iOS ネイティブプロジェクトを作成し、署名、Provisioning Profile、Archive、TestFlight 配信を設定する。
- App Store 用スクリーンショット、アプリアイコン、説明文、キーワード、サポートURL、プライバシーポリシーURLを登録する。
- 暗号化の利用有無を回答する。HTTPS / Supabase 通信を使うため、Export Compliance の確認が必要。

### 審査で特に注意する点

- Webサイトを単に包んだだけのアプリは、機能性やアプリらしい体験が不足していると却下リスクがある。オフライン記録、ホーム画面、バックアップ、通知/タイマーなど、ストア版としての価値を明確にする。
- メールアドレス・パスワードでログインする機能があるため、アカウント削除導線を用意する。
- 外部ブラウザに飛ばないと主要操作ができない状態は避ける。
- ヘルスケアや身体活動に関わるデータの扱いを、App Privacy とプライバシーポリシーで正確に説明する。
- サードパーティログインを追加する場合は、Sign in with Apple の要件に注意する。現状のメールアドレス・パスワードのみなら必須ではない想定。

### iOS 実装確認

- iPhone の Safe Area 下部、ホームインジケータ、キーボード表示時の入力欄、スクロール位置を実機確認する。
- iOS WebView の `localStorage` 永続性、アプリ更新時のデータ維持、再インストール時の消失を確認する。
- JSONバックアップのエクスポート / インポートを iOS のファイルピッカーで使える形にする。
- レストタイマーの音がマナーモードやバックグラウンドでどう扱われるか確認し、必要なら仕様として制限を書く。

## 4. Google Play で必要なこと

### Google Play Console

- Google Play Developer アカウントに登録する。
- Play Console にアプリを作成し、パッケージ名、カテゴリ、コンテンツレーティング、価格、配信国を設定する。
- Android ネイティブプロジェクトを作成し、署名鍵、App Bundle (`.aab`)、内部テスト / クローズドテストを準備する。
- ストア掲載情報として、短い説明、詳しい説明、アプリアイコン、フィーチャーグラフィック、スマホ用スクリーンショット、プライバシーポリシーURLを登録する。
- Data safety、広告の有無、アプリのアクセス権限、対象年齢、ニュース/政府/健康関連などのポリシー項目に回答する。

### 審査・ポリシーで特に注意する点

- Google Play の対象 API レベル要件を満たす。新規アプリや更新では毎年要件が上がるため、提出時点の Android Gradle Plugin / compileSdk / targetSdk を確認する。
- Data safety では、収集するデータ、共有するデータ、暗号化、削除リクエスト可否を正確に回答する。
- アカウント作成を提供する場合、Play Console とアプリ内の両方でデータ削除導線を説明できるようにする。
- 健康・フィットネス系アプリとして、医療効果や診断をうたわない。説明文は「記録」「振り返り」「バックアップ」に寄せる。

### Android 実装確認

- Android の戻るボタンで画面遷移が破綻しないか確認する。
- ファイル保存 / 読み込みが Android のストレージ権限なしで動くか確認する。不要な権限は追加しない。
- WebView 内 `localStorage` の永続性、アプリ更新時のデータ維持、端末移行時の復元導線を確認する。
- 画面幅 360px 前後、キーボード表示、Safe Area / ナビゲーションバー重なりを確認する。

## 5. FitLog 固有の追加タスク

### 優先度高

1. ストア版の技術方針を決める。
   - Capacitor を採用するか
   - Web版とストア版を同一リポジトリで管理するか
   - `base` と環境変数をどう切り替えるか
2. プライバシーポリシーを作成する。
   - ローカル保存
   - Supabase 認証
   - クラウドバックアップ
   - アカウント削除 / バックアップ削除
   - 問い合わせ先
3. アカウント削除導線を設計・実装する。
   - アプリ内から削除リクエストまたは削除実行へ進める
   - Supabase Auth ユーザー、`profiles`、`devices`、`cloud_backups` の削除範囲を決める
4. ストア版でのバックアップ導線を確認する。
   - JSONバックアップ
   - クラウドバックアップ
   - 再インストール時の復元説明
5. iOS / Android の実機テスト項目を作る。

### 優先度中

1. ストア用スクリーンショットの撮影シナリオを決める。
   - ホーム
   - セット入力
   - 種目別履歴
   - 分析
   - バックアップ
2. アプリ説明文を作る。
   - 医療・健康効果を断定しない
   - ローカルファースト、オフライン記録、任意バックアップを訴求する
3. TestFlight / 内部テストの確認観点を整理する。
4. バージョン番号とリリースノート運用を決める。

## 6. 公式ドキュメント

- Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Apple App Store Connect Help: https://developer.apple.com/help/app-store-connect/
- Google Play Console Help: https://support.google.com/googleplay/android-developer/
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play target API level requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Android app bundles: https://developer.android.com/guide/app-bundle
