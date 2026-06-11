# AGENTS.md

このファイルは、このリポジトリで Codex に作業してもらうときの共通ルールです。

## プロジェクト概要

- FitLog は React、Vite、TypeScript で作られた筋トレ記録アプリです。
- GitHub Pages で公開しています。
- `main` ブランチへ push すると GitHub Pages のデプロイ workflow が自動実行されます。
- 公開パスは `/FitLog/` です。設定は `vite.config.ts` にあります。
- ユーザーデータは `localStorage` の `fit-log-v2` に保存します。

## 主要ファイル

- `src/main.tsx`: アプリのエントリーポイントです。`ErrorBoundary` で全体を包み、PWA を登録します。
- `src/App.tsx`: 画面の接続とボトムナビ・トーストを担当します。
- `src/hooks/useFitLog.ts`: 各ドメインフックを束ね、state・派生値・操作(actions)を統合します。
- `src/hooks/`: 役割ごとに分割した状態管理・操作フックと、配布用の `FitLogContext.tsx` を置きます。
- `src/selectors/fitLogSelectors.ts`: React 非依存の純粋な派生値計算(セレクタ)を置きます。
- `src/screens/`: 各画面のコンポーネントを置きます。各画面は view-model フックで Context から値を取り出します。
- `src/components/`: 小さな再利用コンポーネント(エラー境界・セット行・強度アイコンなど)を置きます。
- `src/data/starterExercises.ts`: 初期表示する種目マスタと種目カタログのバージョンを定義します。
- `src/storage.ts`: `localStorage` の読み込み、正規化、移行、壊れたデータの退避処理を担当します。
- `src/types.ts`: 共通の TypeScript 型を定義します。
- `src/utils.ts`: 日付処理、計算処理、汎用ヘルパーを置きます。
- `src/icons.tsx`: 画面で使うアイコンをまとめます。
- `src/styles.css`: CSS の入口で、`src/styles/` 配下を読み込みます。
- `src/styles/`: 画面や役割ごとに分割した CSS を置きます。
- `src/*.test.ts`: テスト対象コードの隣に置く Vitest のテストです(`storage.test.ts`、`utils.test.ts`)。
- `vite.config.ts`: ビルド設定と PWA 設定、公開パス `/FitLog/` を定義します。
- `vitest.config.ts`: テスト実行設定(jsdom 環境)を定義します。
- `.github/workflows/deploy-pages.yml`: GitHub Pages のデプロイ workflow です。

## ディレクトリ構造

主要なファイルとフォルダの構成は次のとおりです。

```text
FitLog/
├── index.html                # HTML エントリー
├── package.json              # 依存とスクリプト
├── vite.config.ts            # Vite + PWA 設定(base: /FitLog/)
├── vitest.config.ts          # Vitest 設定(jsdom)
├── tsconfig.json             # TypeScript 設定
├── eslint.config.mjs         # ESLint 設定
├── .github/
│   └── workflows/
│       └── deploy-pages.yml  # GitHub Pages デプロイ
└── src/
    ├── main.tsx              # エントリー(ErrorBoundary + PWA 登録)
    ├── App.tsx               # 画面切り替え・ナビ・トースト
    ├── types.ts              # 共通の型
    ├── utils.ts              # 日付・計算・汎用ヘルパー
    ├── storage.ts            # localStorage の読み込み・正規化・移行
    ├── icons.tsx             # アイコン
    ├── styles.css            # CSS の入口
    ├── *.test.ts             # Vitest のテスト
    ├── components/           # 再利用コンポーネント
    ├── data/                 # 種目マスタなどの初期データ
    ├── hooks/                # 状態管理・操作フックと Context
    ├── screens/              # 各画面コンポーネント
    ├── selectors/            # 純粋な派生値計算
    └── styles/               # 役割ごとに分割した CSS
```

## 開発コマンド

コマンドはリポジトリ直下で実行します。

```bash
npm run dev
npm run build
npm run preview
```

アプリ本体や TypeScript に関わる変更をした場合は、コミット前に `npm run build` を実行してください。

## ローカル確認

PC のブラウザで確認する場合:

```bash
npm run dev
```

スマホで確認する場合は、Mac とスマホを同じ Wi-Fi に接続してから実行します。

```bash
npm run dev -- --host 0.0.0.0
```

その後、スマホで以下を開きます。

```text
http://<MacのローカルIP>:5173/FitLog/
```

`5173` が使用中の場合、Vite が別のポートを表示するので、そのポートを使ってください。

## コーディング方針

- React コンポーネントは小さく、画面単位で責務を分けます。
- アプリの状態管理と更新処理は `src/hooks/useFitLog.ts` にまとめます。
- 日付処理、計算処理、汎用ヘルパーは `src/utils.ts` に置きます。
- 保存済みの `localStorage` データと互換性を保ってください。
- 保存データの形を変える場合は、`src/storage.ts` に移行処理または正規化処理を追加してください。
- 新しいライブラリは、明確なメリットがある場合だけ追加してください。
- TypeScript では、安易に `any` を使わず、必要な型を定義してください。
- CSS は `src/styles/` 配下で、画面または役割ごとに分割してください。
- 機能追加や修正に関係ないファイル移動、整形、リファクタリングは避けてください。
- コードのコメントは日本語で書き、必ず改行を含む複数行形式 (`/**` `*` `*/`) にしてください。

```ts
/**
 * 例: 関数や処理の説明を日本語で書く
 */
```

## UI 方針

- 現在のモバイル優先レイアウトを維持してください。
- 狭いスマホ幅でも文字がはみ出さないよう確認してください。
- ボタンや入力欄はタッチ操作しやすいサイズにしてください。
- 新しい見た目を追加する前に、既存の見た目や部品を優先して使ってください。
- アプリは起動後すぐに使える画面を表示します。ランディングページは作らないでください。

## データ方針

- `Exercise` は種目マスタです。`id`、`part`、`name`、`measurementType` の軽いデータとして扱います。
- 実際に記録した重量、回数または秒数、強度、メモは `WorkoutSet` の `weight`、`recordValue`、`intensity`、`note` に保存します。
- 新しいトレーニングを開始するとき、セットは空白で作成します。ただしユーザーが明示的に初期値を求めた場合はその指示を優先します。
- 初期種目は部位ごとに整理し、一般的な筋トレ種目を中心にしてください。

## Git 方針

- メインブランチは `main` です。
- 修正後すぐにコミットしないでください。コミットはユーザーから依頼された場合だけ実行し、それまでは変更を作業ツリーに残しておきます。
- コミット対象は、依頼された変更に関係するファイルだけにしてください。
- ステージ前に `git status --short --branch` を確認してください。
- アプリ本体に関わる変更では、コミット前に `npm run build` を実行してください。
- push はユーザーから依頼された場合だけ実行してください。
- `main` に push すると GitHub Pages のデプロイが自動実行されます。

## 最終報告で伝えること

コードを変更した場合は、最後に以下を簡潔に報告してください。

- 何を変更したか
- `npm run build` が成功したか
- コミットや push をした場合は、その結果
