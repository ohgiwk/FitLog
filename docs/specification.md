# FitLog 詳細仕様書

本書は FitLog の実装に基づく詳細仕様を記述します。概要と索引は [`README.md`](./README.md) を参照してください。

対象バージョンの基準: `src/` の現行実装。

---

## 1. プロジェクト概要

- **FitLog** は React + Vite + TypeScript で作られた筋トレ記録 PWA です。
- すべてのデータは端末の `localStorage` に保存され、サーバー通信は行いません（ローカル完結）。
- モバイル優先のレイアウトで、起動直後から記録を始められます（ランディングページは持ちません）。
- GitHub Pages で公開し、公開パスは `/FitLog/` です。`main` ブランチへの push でデプロイ workflow が自動実行されます。

### 1.1 設計思想

- 起動後すぐに「選択日のトレーニング一覧」を表示し、最短手数で記録できる。
- ネットワークなしでも完全に動作する（PWA + localStorage）。
- 状態管理は単一の `State` ツリーに集約し、保存データとの互換性を最優先する。
- 画面コンポーネントは小さく保ち、状態と操作はフック層に閉じ込める。

---

## 2. 技術スタック・ビルド構成

| 区分 | 採用技術 |
| --- | --- |
| UI | React 19 系 |
| ビルド | Vite |
| 言語 | TypeScript |
| PWA | `vite-plugin-pwa`（workbox） |
| アイコン | `@tabler/icons-react` |
| テスト | Vitest + jsdom |
| Lint / Format | ESLint + Prettier |

### 2.1 開発コマンド

```bash
npm run dev          # 開発サーバー
npm run build        # tsc + vite build（PWA 生成を含む）
npm run preview      # ビルド成果物のプレビュー
npm test             # vitest run
npm run test:watch   # vitest watch
npm run lint         # eslint
npm run format       # prettier --write
```

- `npm run build` は型チェック（`tsc`）の後に `vite build` を実行し、PWA の Service Worker と manifest を生成します。

### 2.2 ビルド設定（`vite.config.ts`）

- `base: '/FitLog/'`（GitHub Pages の公開パス）。
- PWA manifest:
  - `id` / `start_url` / `scope`: `/FitLog/`
  - `display: 'standalone'`、`orientation: 'portrait'`
  - `theme_color: '#ef2331'`、`background_color: '#0f1115'`、`lang: 'ja'`
  - アイコン: `pwa-192x192.png`（any）、`pwa-512x512.png`（any maskable）
- `registerType: 'prompt'`（新しい Service Worker を検出したらアプリ側で更新通知を表示し、更新ボタンで取り込む）。
- workbox: `navigateFallback: '/FitLog/index.html'`、`globPatterns` に `js,css,html,svg,png,ico` をプリキャッシュ。

### 2.3 エントリポイント（`src/main.tsx`）

- `React.StrictMode` → `ErrorBoundary` → `App` の順に包む。
- `registerSW({ immediate: true, onNeedRefresh })` で Service Worker を即時登録し、新しい Service Worker を検出したらアプリへ更新イベントを通知する。

### 2.4 プロジェクト構成 / 主要ファイル

| パス | 役割 |
| --- | --- |
| `index.html` | HTML エントリー |
| `package.json` | 依存とスクリプト |
| `vite.config.ts` | Vite + PWA 設定（base: `/FitLog/`） |
| `vitest.config.ts` | Vitest 設定（jsdom） |
| `tsconfig.json` | TypeScript 設定 |
| `eslint.config.mjs` | ESLint 設定 |
| `.github/workflows/deploy-pages.yml` | GitHub Pages デプロイ workflow |
| `docs/` | 仕様・設計ドキュメント |
| `src/main.tsx` | エントリー（`ErrorBoundary` + PWA 登録） |
| `src/App.tsx` | 画面切り替え・ボトムナビ・トースト |
| `src/types.ts` | 共通の TypeScript 型 |
| `src/utils.ts` | 日付・計算・汎用ヘルパー |
| `src/storage.ts` | `localStorage` の読み込み・正規化・移行・退避 |
| `src/icons.tsx` | アイコン |
| `src/styles.css` | CSS の入口（`src/styles/` を読み込む） |
| `src/hooks/` | 状態管理・操作フックと配布用 `FitLogContext.tsx` |
| `src/hooks/useFitLog.ts` | 各ドメインフックを束ねる統合フック |
| `src/selectors/fitLogSelectors.ts` | React 非依存の純粋な派生値計算（セレクタ） |
| `src/screens/` | 各画面コンポーネント（view-model フックで Context から取得） |
| `src/components/` | 小さな再利用コンポーネント（エラー境界・セット行・強度アイコンなど） |
| `src/data/starterExercises.ts` | 初期種目マスタとカタログ版 |
| `src/data/partColors.ts` | 部位の表示色パレット（8 色）と既定色 |
| `src/styles/` | 役割ごとに分割した CSS |
| `src/*.test.ts` | テスト対象の隣に置く Vitest のテスト |

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
├── docs/                     # 仕様・設計ドキュメント
│   ├── README.md             # 概要・索引
│   ├── specification.md      # 詳細仕様
│   └── improvements.md       # 改善候補の備忘録
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

---

## 3. アーキテクチャ

### 3.1 レイヤー構成

```
useFitLogCore (state + 永続化 + トースト)
        │
        ├─ useNavigation     (画面遷移・選択日・対象ワークアウト)
        ├─ useFitLogUi       (保存対象外の一時 UI 状態)
        ├─ useFitLogSelectors / selectors/fitLogSelectors.ts (派生値)
        ├─ usePresetActions
        ├─ useWorkoutActions
        ├─ useExerciseActions
        ├─ useTrainingPlanActions
        └─ useBackup
        │
   useFitLog (上記を統合し state・派生値・actions を組み立てる)
        │
   FitLogContext (Provider で全体へ配布)
        │
   各画面の useXScreenModel (Context から必要な値だけ取り出す view-model)
        │
   画面コンポーネント (表示とローカル UI 状態のみ)
```

### 3.2 各フックの責務

| フック | ファイル | 責務 |
| --- | --- | --- |
| `useFitLogCore` | `hooks/useFitLogCore.ts` | `State` の保持、`localStorage` 保存（デバウンス・flush・失敗通知）、トースト管理、`saveState` / `setState` 提供 |
| `useNavigation` | `hooks/useNavigation.ts` | `screen` / `selectedDate` / `currentWorkoutId` の管理、画面遷移、日付・月移動、離脱時の空セット掃除 |
| `useFitLogUi` | `hooks/useFitLogUi.ts` | 保存しない一時 UI 状態（編集モード、種目選択画面で表示中の部位タブ `activePart`、ドラッグ対象、履歴フィルタ） |
| `useFitLogSelectors` | `hooks/useFitLogSelectors.ts` | `state` と `selectedDate` から派生値を `useMemo` で計算 |
| `usePresetActions` | `hooks/usePresetActions.ts` | プリセットの選択・作成・改名・削除・種目増減・並び替え・一括投入 |
| `useWorkoutActions` | `hooks/useWorkoutActions.ts` | ワークアウト/セットの追加・更新・削除・並び替え・詳細を開く |
| `useExerciseActions` | `hooks/useExerciseActions.ts` | 種目マスタの追加・計測方法変更・削除・ドラッグ並び替え |
| `useTrainingPlanActions` | `hooks/useTrainingPlanActions.ts` | 分割計画の追加（上書き）・インライン更新・削除 |
| `usePartActions` | `hooks/usePartActions.ts` | 部位の追加・削除・並び替え・表示色変更 |
| `useBackup` | `hooks/useBackup.ts` | JSON エクスポート / インポート |
| `useFitLog` | `hooks/useFitLog.ts` | 上記を束ね、画面へ渡す値と `actions` をまとめる統合フック |

### 3.3 配布と view-model パターン

- `FitLogProvider`（`hooks/FitLogContext.tsx`）が `useFitLog()` の戻り値を Context へ流す。
- `useFitLogContext()` は Provider 外で呼ぶと例外を投げる。
- 各画面は props を受け取らず、画面固有の `useXScreenModel()` フックで Context から必要な値・操作だけを取り出す。
- 画面ローカルの一時状態（削除確認ダイアログの対象、カレンダー開閉など）は画面コンポーネント内の `useState` で持つ。

---

## 4. ドメインモデル / データ型

型定義は `src/types.ts`。

### 4.1 `State`（永続化される全体ツリー）

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `exercises` | `Exercise[]` | 種目マスタ（部位・名前・計測方法・器具カテゴリ） |
| `workouts` | `Workout[]` | 日付ごとの記録（セットを含む） |
| `workoutStartTimes` | `Record<string, string>` | 日付ごとのトレーニング開始時刻（`HH:mm`） |
| `presets` | `Preset[]` | よく使う種目のまとまり |
| `trainingDays` | `TrainingDay[]` | 日付ごとの実施部位（履歴の補助情報） |
| `trainingPlans` | `TrainingPlan[]` | 部位ごとの分割計画 |
| `parts` | `PartSetting[]` | 部位の表示設定（表示順は配列順、`color` に表示色 HEX）。「レスト」は対象外 |
| `weightUnit` | `WeightUnit` | アプリ内の重量入力・表示に使う単位（`kg` / `lbs`）。保存値は kg のまま保持する |
| `catalogVersion` | `number` | 種目マスタのカタログ版（追補判定に使用） |

### 4.2 各型

```ts
type MeasurementType = 'reps' | 'seconds';
type SetIntensity = 1 | 2 | 3 | 4 | 5;
type ExerciseCategory = 'free' | 'machine' | 'dumbbell' | 'cable' | 'bodyweight';
type WeightUnit = 'kg' | 'lbs';

type Exercise = {
  id: string;
  part: string;          // 部位（例: 胸 / 背中 / 脚 / 肩 / 腕 / その他）
  name: string;          // 種目名
  measurementType: MeasurementType; // 記録単位（回数 / 秒数）
  category: ExerciseCategory; // 器具カテゴリ（種目リスト内の小見出し分類）
};

type WorkoutSet = {
  id: string;
  weight: string | number;      // 重量（保存値は kg）。入力中は文字列、計算時に数値化
  recordValue: string | number; // 回数 or 秒数
  intensity?: SetIntensity;     // 主観強度（任意）
  note: string;                 // メモ（現状 UI 入力経路は限定的）
};

type Workout = {
  id: string;
  exerciseId: string;    // 元の Exercise.id
  date: string;          // 'YYYY-MM-DD'（ローカル日付）
  name: string;          // 記録時点の種目名のスナップショット
  part: string;          // 記録時点の部位のスナップショット
  measurementType: MeasurementType;
  sets: WorkoutSet[];
};

type WorkoutStartTimes = Record<string, string>; // date(YYYY-MM-DD) -> HH:mm

type Preset = {
  id: string;
  name: string;
  exerciseIds: string[]; // 投入する種目 ID の順序付きリスト
};

type TrainingDay = {
  date: string;          // 'YYYY-MM-DD'
  parts: string[];       // その日に実施した部位
};

type TrainingPlanMode = 'weekly' | 'interval';

type TrainingPlan = {
  id: string;
  part: string;
  mode: TrainingPlanMode;
  weekdays: number[];    // 0=日 〜 6=土（weekly のとき有効）
  intervalDays: number;  // 何日ごと（interval のとき有効、>=1）
  startDate: string;     // 'YYYY-MM-DD'（interval の起点）
};

type PartSetting = {
  name: string;          // 部位名
  color: string;         // 表示色（HEX）。8 色パレットから選択
};
```

部位の表示色パレットは `src/data/partColors.ts`（`partColorPalette` の 8 色、既定色 `defaultPartColor`）。

### 4.3 種目マスタと記録の責務分離

- `Exercise` は「何を行うか」の軽量マスタ（`id` / `part` / `name` / `measurementType` / `category`）。
- 実際の重量・回数（秒数）・強度・メモは `WorkoutSet` に保存する。
- `Workout` は `name` / `part` / `measurementType` を記録時点のスナップショットとして保持するため、後でマスタを編集しても過去の記録表示は変わらない（種目の並び替え時のみ後述の同期がある）。

---

## 5. データ永続化・移行

実装は `src/storage.ts` と `hooks/useFitLogCore.ts`。

### 5.1 ストレージキー

| キー | 用途 |
| --- | --- |
| `fit-log-v2` | 通常の保存データ |
| `fit-log-v2-corrupt` | 読み込みに失敗した壊れたデータの退避先 |

### 5.2 保存戦略（`useFitLogCore`）

- `state` 変化のたびに **400ms デバウンス**（`SAVE_DEBOUNCE_MS`）でまとめて書き込む。
- **初回マウント時の保存はスキップ**（読み込んだ内容を書き戻すだけのため）。
- `visibilitychange` で非表示になった瞬間、および `pagehide` 時に、デバウンス待ちの内容を即時 flush する（`stateRef` で最新 state を参照）。
- 書き込みは `try/catch` で保護し、失敗時は「保存に失敗しました。空き容量を確認してください」をトースト表示。
- トーストは表示後 **1800ms** で自動的に消える。

### 5.3 読み込み（`loadState` → `LoadResult`）

`loadState()` は `{ state, recoveredFromCorruption }` を返す。

1. `localStorage.getItem` 自体が例外 → 既定状態で起動（復旧フラグ false）。
2. 値が無い / `'null'` → 既定状態で起動。
3. `JSON.parse` + `normalizeState` が成功 → その state で起動。
4. 解析・正規化に失敗 → 元データを `fit-log-v2-corrupt` へ退避（`removeItem` はしない）し、既定状態で起動（復旧フラグ true）。
   - 復旧フラグが true のときは「保存データを読み込めませんでした。旧データは退避済みです」をトースト表示。
   - 退避自体に失敗しても元データは `fit-log-v2` 側に残るため握りつぶす。

### 5.4 既定状態（`createDefaultState`）

- `exercises`: スターター種目（`data/starterExercises.ts`）。
- `presets`: 既定プリセット 4 件（`胸の日` / `背中の日` / `脚の日` / `肩の日`、いずれも種目空）。
- `workouts` / `trainingDays` / `trainingPlans`: 空配列。
- `workoutStartTimes`: 空オブジェクト。
- `weightUnit`: `'kg'`。
- `catalogVersion`: `starterCatalogVersion`（現在 `3`）。

### 5.5 正規化・移行（`normalizeState`）

- `exercises` か `workouts` が無ければ `null` を返す（＝壊れている扱い）。
- 各配列を専用 normalize 関数で正規化し、不正要素は除外（`flatMap` で drop）。
- **種目マスタ追補**: 保存データの `catalogVersion` が `starterCatalogVersion` 未満なら、`part::name` をキーに未収録のスターター種目だけを末尾へ追加（`mergeStarterExercises`）。正規化後は `catalogVersion` を最新へ更新。
- **既定プリセット補完**: 名前が一致しない既定プリセットを末尾に追加（`mergeDefaultPresets`）。
- 各フィールドの正規化方針:
  - `Exercise`: `id` / `part` / `name` がすべて文字列でなければ除外。`measurementType` は `'seconds'` 以外を `'reps'` に丸める。`category` は 5 種のいずれかに丸め、未設定・不正値のときは初期種目マスタに同名があればそのカテゴリを、なければ `'free'` を使う。
  - `Workout`: `id` / `exerciseId` / `date` / `name` / `part` が文字列でなければ除外。
  - `workoutStartTimes`: オブジェクトのみ採用。値が `HH:mm` 形式のものだけを日付キーごとに保持する。
  - `WorkoutSet`: `id` が文字列でなければ除外。`weight` / `recordValue` は文字列・数値以外を `''` に。`recordValue` は旧フィールド `reps` からも引き継ぐ。`intensity` は 1〜5 のみ採用、それ以外は `undefined`。`note` は文字列以外を `''`。
  - `TrainingDay`: 同一日付をマージし、`parts` を trim + 重複排除。旧フィールド `part`（単数）からも取り込む。
  - `TrainingPlan`: `part` 必須。`mode` は `'interval'` 以外を `'weekly'`。`weekdays` は 0〜6 の整数のみ・重複排除・ソート。`intervalDays` は正の整数（既定 1）。
  - `parts`（`normalizePartSettings`）: 保存済み設定（`name` + `color`、空名・重複・「レスト」は除外、色が無ければ既定色）を順序を保って取り込み、その後、種目・記録・実施日・計画に現れる未登録の部位を末尾へ追加してパレット色を割り当てる。旧データに `parts` が無くても、ここで既存部位から自動生成される。
  - `weightUnit`: `'lbs'` のみ lbs として採用し、それ以外・未設定は `'kg'` に丸める。
- **初期状態の `parts`**: スターター種目の部位（胸 / 背中 / 脚 / 肩 / 腕）をその順序で生成し、パレット色を循環で割り当てる。

### 5.6 エクスポート / インポート（`useBackup`）

- **エクスポート**: 現在の `state` を整形 JSON（2 スペース）にし、`fitlog-backup-<selectedDate>.json` としてダウンロード。完了トースト表示。
- **インポート**: 選択ファイルを `parseImportedState`（= `JSON.parse` + `normalizeState`）で正規化。
  - 正規化に失敗（`null`）→「インポートできるデータが見つかりません」。
  - 成功 → `setState` で全置き換え。`currentWorkoutId` を解除、選択プリセットを先頭に、編集対象を解除、選択日を本日へ。「データをインポートしました」。
  - 例外時 →「JSONの読み込みに失敗しました」。

---

## 6. 画面仕様

`Screen` 型: `'home' | 'select' | 'detail' | 'exerciseHistory' | 'preset' | 'presetEdit' | 'history' | 'partEdit' | 'settings'`。

### 6.1 アプリ外枠とナビゲーション（`App.tsx`）

- `<main class="app">` 内に現在の画面を 1 つだけ描画。
- ボトムナビは 2 タブ:「ホーム」（`home`）/「履歴/計画」（`history`）。
- トースト領域は `role="status"` `aria-live="polite"`。
- 新しい Service Worker を検出したときは、画面下部に更新通知を表示する。「更新」ボタンを押すと新しい Service Worker を有効化し、ページを再読み込みする。
- `detail` / `exerciseHistory` は `currentWorkout` がある場合のみ描画。
- PWA の下部 Safe Area は `env(safe-area-inset-bottom)` を使い、ボトムナビの高さ・メインコンテンツの下余白・FAB/トーストなどの下端オフセットを同じ基準で揃える。

#### 画面遷移の共通処理（`showScreen`）

- 遷移先が `detail` / `exerciseHistory` 以外のとき、`cleanupBlankDetailSets()` を実行（詳細画面で増やした空セットの掃除）。
- 遷移先が `select` 以外のとき、編集モードを解除。

### 6.2 ホーム（`HomeScreen`）

- **常設カレンダー**: 画面上部に選択日用のカレンダーを表示する。
  - ヘッダ左のハンバーガーメニューからドロワを開き、「設定」へ遷移できる。
  - 初期表示は選択日を含む 1 週間（日曜始まり）。
  - タイトルは表示中カレンダーの月を `YYYY年M月` で表示する。タイトルのボタンまたは下部バーのタップで週表示 / 月表示を切り替える。
  - 下部バーは上下スワイプにも対応し、下方向で月表示、上方向で週表示に切り替える。
  - カレンダー本体を左右にスワイプすると、指の移動に追従して前後ページが見え、離した位置に応じて週表示では前後 1 週間、月表示では前後 1 か月へスナップ移動する。
  - 右上の「今日」ボタンで本日へ移動し、下部リストも本日の内容に切り替える。
  - 日付タップでその日を選択し、下部リストを選択日の内容に切り替える。
  - 記録のある日は `trained`、本日は `today`、選択日は `selected` を付与して丸円やドットでハイライトする。
- **プリセット開始バー**: プリセット選択 select + 「開始」+「管理」（プリセット一覧へ）。
- **予定表示**: 選択日に分割計画で予定された部位があれば「予定: A / B」を表示。
- **空状態**: 種目が無い日は「トレーニングを開始」ボタンを表示。押した時刻（時・分）を選択日の開始時刻として保存し、種目選択画面へ進む。
- **開始時刻**: 選択日の開始時刻は内部データ（`workoutStartTimes`）として保存するが、ホーム画面には表示しない。
- **種目一覧**: `selectedWorkouts` をカード表示。各カードは `role="button"` でタップ / Enter / Space で詳細へ。
  - カードヘッダに「部位 - 種目名」と削除ボタン。ヘッダ左のライン色は部位の表示色（`partColors`）を反映する。
  - セットは表形式（`HomeSetRow`）でセット番号・重さ・記録・RM を表示。重さと RM は設定中の重量単位を主表示にし、補助列には反対側の単位を表示する。
  - 未開始ワークアウト（後述）は「＋」オーバーレイを表示。
  - 一覧が空のときは空状態メッセージ。
- **FAB（＋）**: 種目選択画面へ。
- **削除確認ダイアログ**: 記録ありの種目を削除しようとすると確認ダイアログを表示。未開始ワークアウトは確認なしで即削除。
- **バージョン表示**: ホームのドロワメニュー下部にアプリバージョン（現在 `v0.0.1`）を小さなグレー文字で表示。

### 6.3 種目選択（`SelectScreen`）

- 部位ごとにグループ化（`groupedExercises`）して表示。並び順は部位の表示順（`orderedParts`）に従う。
- **部位タブ**: ヘッダ下に部位タブを横並び（`orderedParts` の順）で表示し、タップで表示する部位を切り替える（`activePart` に選択中の部位を保持。未選択・種目が無くなった部位を指す場合は先頭タブを使う）。タブ文字色は常に白で、選択中はその部位の表示色（`partColors`）を背景にする。タブはヘッダに固定され、リストをスクロールしても残る。
- **器具カテゴリ**: 通常モードでは選択中の部位の種目リスト内を、フリーウエイト種目 / マシン種目 / ダンベル種目 / ケーブル種目 / 自重種目の 5 区分で小見出し付き表示する（`utils.exerciseCategories` の順序）。種目が 0 件の区分は表示しない。
- **通常モード**:
  - 各種目はボタンで、タップすると選択日にその種目を追加して詳細画面へ（`addExerciseToToday`）。
  - リスト見出しに選択中部位の最終実施ラベル（`partRecentLabels`: `履歴なし` / `今日` / `N日前`）を表示。
- **編集モード**（「編集」ボタン）:
  - 通常モードと同じくカテゴリ小見出し付きで表示する。ドロップ先を選べるよう、種目が 0 件のカテゴリ区画も表示する。
  - 行をドラッグ（ハンドルから）で並び替え。**カテゴリをまたいでドロップすると、その種目は移動先カテゴリへ自動的に変更される**。並び替えは DOM を直接操作せず React の state で管理し（`useExerciseReorder`、ポインタ位置から挿入先カテゴリと位置を計算）、確定時に `reorderPartExercises` で対象部位の順序とカテゴリを反映する（他部位の位置は保持）。
  - 行内に編集アイコン・削除ボタンを表示。削除時はプリセットからも該当 ID を除去。部位・種目名・カテゴリ・記録単位の編集は編集ダイアログで行う。
  - リスト見出し右に「＋」ボタンを表示。押すと種目追加ダイアログを開く。
- **種目追加ダイアログ**（編集モードの「＋」から）: 部位（`orderedParts` から選ぶセレクト。初期値は「＋」を押した部位）/ 種目名（最大 30 文字、必須）/ 器具カテゴリ（セレクト、既定はフリーウエイト）/ 「詳細設定」を開くと記録単位トグル。追加すると `addExerciseToPart` でマスタにのみ種目を追加し、**画面遷移せず編集モードに留まる**（記録は作らない）。
- **種目編集ダイアログ**（編集モードの編集アイコンから）: 部位（`orderedParts` から選ぶセレクト）/ 種目名（最大 30 文字、必須）/ 器具カテゴリ（セレクト）/ 「詳細設定」を開くと記録単位トグル。保存すると `updateExercise` でマスタを更新し、編集モードに留まる。改名・部位変更時は既存ワークアウトの名前・部位スナップショットも追従する。

### 6.4 種目詳細（`DetailScreen`）

- トップバー: 戻る / 種目名 / 履歴（種目別履歴へ）。
- **前回記録**（`LastRecord`）を表示。
- **セット入力テーブル**: 各行に番号・重量入力（設定中の重量単位。`kg` は step 0.5、`lbs` は step 1）・記録入力（`回`/`秒`、step 1）・RM 表示・削除ボタン・強度ピッカー（5 段階トグル）。
  - 入力欄の表示・入力単位は設定に従うが、保存する `WorkoutSet.weight` は kg に換算した値を保持する。
  - reps 種目のみ RM を表示、seconds 種目は `-`。
- **レストタイマー**（`RestTimer`、後述）。
- **FAB（＋）**: 空セットを 1 つ追加。
- 詳細を開く際、セットが 5 未満なら 5 まで空セットを補充（`openWorkoutDetail`）。
- 詳細から離れる際、記録ありセットが 1 つでもあれば未入力の空セットを取り除く（`cleanupBlankDetailSets`）。記録が 0 件のときは何もしない（5 セットのまま残す）。

### 6.5 種目別履歴（`ExerciseHistoryScreen`）

- 同一 `exerciseId` のうち、記録のあるセット（重量 or 記録値が 0 超）を含むワークアウトを新しい順に表示。
- **ベスト記録（BEST）サマリ**:
  - reps 種目: 主要記録 = MAX 1RM（達成日付つき）。関連 = 最大重量 / 最大回数 / 最大負荷量。
  - seconds 種目: 主要記録 = 最長記録（秒）。関連 = 最大重量（無ければ「自重」）/ 最大合計秒数。
- **日別カード**: 日付・TOTAL（reps は重量×回数の合計を設定中の重量単位で表示、seconds は合計秒）・MAX 1RM（reps のみ）。
  - セット表: セット番号・重さ（0 なら「自重」）・記録・RM・強度アイコン。

### 6.6 プリセット一覧（`PresetListScreen`）/ 編集（`PresetEditScreen`）

- 一覧: プリセットの作成・選択・編集画面への遷移。
- 編集: 名称変更（空なら「名称未設定」）、種目の追加（重複は無視）・削除・並び替え、プリセット削除。
- ホームの「開始」やプリセット一覧から `startPreset` を実行すると、プリセットの種目を選択日へ一括投入する（後述 8.3）。

### 6.7 履歴/計画（`HistoryScreen`）

- トップバー右に設定メニュー（記録の書き出し / 読み込み / 部位を編集）。「部位を編集」で部位の編集画面（`partEdit`）へ遷移。
- 「履歴」「計画」をタブ切り替え。
- **履歴タブ**:
  - 部位フィルタタブ（`ALL` + 部位、ただし「レスト」は除外）。
  - 月カレンダー（前月 / 次月、記録のある日は `trained`、本日は `today`、計画日はツールチップで部位表示）。日付タップでその日のホームへ。
  - 「<部位>の履歴」リスト: 日付・部位・種目名（`buildVisibleHistory` で `workouts` と `trainingDays` を日付ごとに統合し、部位フィルタを適用、新しい順）。
- **計画タブ**:
  - 部位ごとに 1 行（`PlanRow`、`orderedParts` から「レスト」を除外）を表示し、その場で編集する（フォームや追加・削除ボタンは持たない）。並び順と行の左色は部位の表示設定（`orderedParts` / `partColors`）を反映する。
  - 各行: 部位名と「曜日 / 何日ごと」のモードトグル、`weekly` のとき曜日ピッカー、`interval` のとき間隔＋開始日。操作のたびに `upsertTrainingPlan` で即保存。
  - `weekly` で曜日を 1 つも選ばない状態にすると、その部位の計画は持たない（保存されない）。
  - 部位が 1 つも無ければ「部位がありません」。
  - 「今後7日の予定」プレビュー: 選択日から 7 日間の予定部位（日付に曜日付き、日付と部位で改行）。

### 6.8 部位の編集（`PartEditScreen`）

- 履歴/計画画面の設定メニューから遷移。トップバーの戻るで履歴/計画へ戻る。
- 追加フォーム: 部位名（最大 12 文字）を入力して「追加」。空・重複（`orderedParts` と一致）は不可。
- 部位一覧（`orderedParts`）を 1 行ずつ表示。各行:
  - 表示色のスウォッチ＋部位名、上 / 下ボタンで表示順を変更（端ではボタンを無効化）、削除ボタン。
  - 8 色パレット（`partColorPalette`）のボタンで表示色を選択。選択中の色は強調表示。
- 削除は「その部位の種目が残っていない」場合のみ可能。削除時はその部位の分割計画（`trainingPlans`）も合わせて取り除く。種目がある部位は削除不可（トースト通知）。
- 選んだ表示色・並び順は、種目選択画面と計画タブの各部位ヘッダ左色・並び順に反映される。

### 6.9 設定（`SettingsScreen`）

- ホーム画面のドロワメニューから遷移する。トップバーの戻るでホームへ戻る。
- **単位**: kg / Lbs の切り替えスイッチを表示する。
  - 切り替えた単位は `state.weightUnit` に保存され、重量入力欄、ホームのセット行、前回記録、種目別履歴の重量・RM・負荷量表示に反映される。
  - 既存記録の保存値は kg のまま維持し、lbs 表示時のみ換算する。

---

## 7. ロジック・計算仕様

実装は `src/utils.ts` と `src/selectors/fitLogSelectors.ts`。

### 7.1 1RM（`calcRm`）

```
weight === 0 または reps === 0 → '0.0'
それ以外 → weight * (1 + reps / 30) を toFixed(reps > 3 ? 1 : 2)
```

- Epley 系の推定式。低レップ（3 以下）は小数 2 桁、それ以外は 1 桁で丸める。

### 7.2 集計値（ホーム）

- 合計レップ数: reps 種目の `recordValue` 合計。
- 合計秒数: seconds 種目の `recordValue` 合計。
- 合計負荷量: reps 種目の `weight × recordValue` 合計（表示は四捨五入）。

### 7.3 数値ヘルパー

- `number(value)`: `Number(value) || 0`。
- `isBlank(value)`: trim して空文字なら true。
- `formatWeight(value, unit)`: 保存値 kg を指定単位へ換算し、小数 1 桁で表示する。`unit` 省略時は `kg`。
- `formatStoredWeightInput(value, unit)`: 詳細画面の重量入力欄用に、保存値 kg を設定単位へ換算する。
- `formatWeightForStorageInput(value, unit)`: 詳細画面の入力値を kg 保存値へ戻す。
- `weightUnitLabel(unit)`: `kg` / `Lbs` の表示ラベルを返す。
- `measurementUnit` / `measurementLabel`: `'seconds'` → `秒`/`秒数`、`'reps'` → `回`/`回数`。
- `exerciseCategories` / `defaultExerciseCategory`: 器具カテゴリの表示順・ラベル（フリーウエイト種目 / マシン種目 / ダンベル種目 / ケーブル種目 / 自重種目）と、未設定時の既定値（`'free'`）。

### 7.4 予定部位（`plannedPartsForDate`）

対象日の曜日・経過日数から、各計画が対象日に該当するかを判定し、部位を重複排除して返す。

- `weekly`: `weekdays` に対象日の曜日が含まれれば該当。
- `interval`: `startDate`（無ければ対象日）からの経過日数が 0 以上かつ `intervalDays` の倍数なら該当。

### 7.5 最終実施ラベル（`buildPartRecentLabels`）

- 部位ごとに、選択日以前で記録のある最新ワークアウトを探す。
- 無ければ `履歴なし`。当日なら `今日`、それ以外は `N日前`（経過日数を四捨五入、負値は 0 に丸め）。

### 7.6 未開始ワークアウト（`isUnstartedWorkout`）

- 「セット数がちょうど 5、かつ全セットの重量・記録値が 0」のときに true。
- ホームで未開始カードの「＋」オーバーレイ表示や、確認なし削除の判定に使う。

### 7.7 部位選択肢（`buildSplitPartOptions`）

- `exercises` / `workouts` / `trainingDays` / `trainingPlans` に登場する部位を集約し、空文字を除いて日本語ロケールでソート。

### 7.8 ワークアウト生成（`createWorkout`）

- 新規ワークアウトは空セット 5 つ（`newSet()`）で作成。`name` / `part` / `measurementType` は元の `Exercise` からコピー。

### 7.9 日付ユーティリティ

- `localDate(date)`: ローカルタイムで `YYYY-MM-DD`。
- `parseDate('YYYY-MM-DD')`: ローカルタイムの `Date`。
- `calendarCells(year, month)`: 月初の週頭から 42 セル（6 週）を生成。各セルは `{ date, day, inMonth }`。

### 7.10 ID 生成（`uid`）

- `crypto.randomUUID()` があれば使用。無ければ `Date` + 乱数のフォールバック。

---

## 8. 主要機能の振る舞い

### 8.1 ワークアウト / セット操作（`useWorkoutActions`）

- `openWorkoutDetail`: セットを 5 まで補充して詳細を開く。
- `addExerciseToToday`: 選択日に同一種目があれば再利用、無ければ新規作成して詳細を開く。
- `addSet`: 空セットを 1 つ追加し詳細を開く。
- `updateSet`: 指定セットの `weight` / `recordValue` / `note` を更新（全ワークアウトを走査して該当 ID を更新）。
- `updateSetIntensity`: 強度を設定。同じ強度を再タップ、または `undefined` で強度を解除（フィールド削除）。
- `deleteSet`: 現在のワークアウトから指定セットを削除。
- `deleteWorkout`: ワークアウトごと削除。対象が `currentWorkoutId` なら解除し、トースト表示。
- `moveWorkout`: 選択日内での表示順を 1 つ前後に入れ替え。

### 8.2 種目マスタ操作（`useExerciseActions`）

- `addExerciseToPart(part, name, measurementType, category)`: 指定部位に新種目をマスタへ追加（部位は空なら「その他」、種目名は必須）。先頭に追加し、部位が未登録ならパレット色つきで `state.parts` に登録。画面遷移・記録作成はしない。追加できたら `true` を返す。
- `updateExercise(exerciseId, { part, name, measurementType, category })`: 種目の部位・名前・記録単位・カテゴリをまとめて更新（種目名は必須、部位が空なら「その他」）。部位が未登録ならパレット色つきで `state.parts` に登録。改名・部位変更時は既存ワークアウトの `name` / `part` スナップショットも同期。更新できたら `true` を返す。
- `reorderPartExercises(part, layout)`: 指定部位の種目を `layout`（`{ id, category }` の配列＝並び順とカテゴリ）どおりに反映する。部位内の種目だけを並び替え、他部位の種目はマスタ配列内の位置を保つ。カテゴリをまたいでドロップした種目は移動先カテゴリへ変更される。
- `deleteExercise`: 種目を削除し、全プリセットから該当 ID を除去。

### 8.3 プリセット操作（`usePresetActions`）

- `currentPreset`: 選択中プリセット（無ければ先頭）。プリセット増減に応じて選択 ID を補正。
- `createPreset` / `renamePreset`（空なら「名称未設定」）/ `deletePreset` / `addExerciseToPreset`（重複無視）/ `removeExerciseFromPreset` / `movePresetExercise`。
- `startPreset`: 選択日にプリセットの種目を一括投入。
  - プリセットが空 →「プリセットに種目を追加してください」。
  - 既に当日に存在する種目・重複はスキップ。
  - 投入対象が 0 件のとき、既存があれば「すでに追加されています」、無ければ「プリセットの種目が見つかりません」。
  - 投入後はホームへ戻り「N種目を追加しました」。

### 8.4 分割計画（`useTrainingPlanActions`）

- `addTrainingPlan(part, mode, weekdays, intervalDays, startDate)`:
  - 部位必須。`weekly` は曜日 1 つ以上、`interval` は `intervalDays >= 1` が必須（不足時はトースト）。
  - 同じ部位の既存計画があれば **上書き**（ID を引き継ぐ）、無ければ先頭へ追加。
  - `startDate` 未指定なら選択日を使用。保存後「計画を保存しました」。
- `upsertTrainingPlan(part, mode, weekdays, intervalDays, startDate)`:
  - `HistoryScreen` の部位行インライン編集から呼ばれる。トーストは出さない。
  - 同じ部位の既存計画があれば **上書き**（ID を引き継ぐ）、無ければ先頭へ追加。`weekdays` は重複排除・ソート、`intervalDays` は `>=1` に丸め、`startDate` 未指定なら選択日を使用。
  - `weekly` かつ曜日が空のときは、その部位の計画を削除する（行から計画を持たない状態にする）。
- `deleteTrainingPlan`: 指定計画を削除。

### 8.4.1 部位の編集（`usePartActions`）

- いずれの操作も、`buildOrderedParts` で作る表示順つきの完全な部位一覧を `state.parts` へ書き戻す（明示設定＋データ由来を統合し、以降は明示管理になる）。
- `addPart(name)`: 末尾に追加。空・重複はトースト。色はパレットを順番に割り当てる。
- `deletePart(name)`: その部位の種目が残っていれば不可（トースト）。可能なら `parts` から除外し、その部位の `trainingPlans` も削除。
- `movePart(name, direction)`: 表示順を 1 つ前後に移動。
- `setPartColor(name, color)`: 表示色を変更。
- 関連セレクタ（`fitLogSelectors`）: `buildOrderedParts`（明示設定＋データ由来の部位を統合し表示順で返す。「レスト」は除外）、`buildPartColorMap`（部位名→色）。`addExerciseToPart` で新規部位を作る場合も `state.parts` に追記される。

### 8.5 レストタイマー（`RestTimer`）

- 既定 60 秒、入力は数字のみ・最大 3 桁、1〜999 にクランプ。
- START で終了時刻（`Date.now() + 秒`）を保持し、250ms ごとに残り秒を再計算（時刻ベースなのでタブが非アクティブでもズレにくい）。
- 0 になると停止し、`AudioContext` でアラート音（三角波のビープを連続再生）。START 時に `AudioContext` を resume してモバイルの自動再生制限に対応。
- 実行中は STOP で中断。

### 8.6 強度（intensity）

- 5 段階: `1 余裕 / 2 普通 / 3 きつい / 4 かなりきつい / 5 限界`（`intensityOptions`）。
- 詳細画面でトグル選択、履歴ではアイコン（`IntensityIcon`）で表示。

### 8.7 エラー境界（`ErrorBoundary`）

- 描画中に例外が発生したら全画面の真っ白を防ぎ、復旧画面を表示。
- 復旧手段: `localStorage` の保存データを直接読み出して `fitlog-backup.json` として書き出す / ページ再読み込み。
- React の state が壊れていても動くよう、保存済みデータをそのまま使う。

---

## 9. UI / スタイル方針

- モバイル優先レイアウトを維持。狭い画面でも文字がはみ出さないようにする。
- ボタン・入力欄はタッチしやすいサイズにする。
- CSS は `src/styles.css` を入口に、`src/styles/` 配下で役割ごとに分割（`base` / `layout` / `home` / `detail` / `history` / `partEdit` / `presets` / `select` / `controls` / `responsive`）。
- トーストは画面下部に短時間表示（1800ms）。ダイアログはバックドロップ + `role="dialog"` `aria-modal="true"`。
- メインスクロール領域（`.app`）はスクロール操作を維持しつつ、スクロールバー自体は表示しない。

---

## 10. テスト

- Vitest（jsdom 環境）。設定は `vitest.config.ts`。
- テストは対象コードの隣に配置する方針（`src/*.test.ts`）。
  - `src/storage.test.ts`: 読み込み・正規化・移行・壊れたデータ退避。
  - `src/utils.test.ts`: 計算・日付・判定ヘルパー。
- 実行: `npm test`（CI 向け一括）/ `npm run test:watch`（監視）。

---

## 11. 初期データ（スターター種目）

`src/data/starterExercises.ts`。`starterCatalogVersion = 3`。

- 部位: 胸 / 背中 / 脚 / 肩 / 腕。すべて `measurementType: 'reps'`。
- 「部位 → 器具カテゴリ → 種目名」の定義（`starterCatalog`）から `starterExercises` を生成する。各部位・各カテゴリ（フリーウエイト / マシン / ダンベル / ケーブル / 自重）に概ね 4 種目ずつ用意する（自重の肩・腕など一部は 3 種目）。
- カタログ版を上げると、既存ユーザーには未収録の種目だけが追補される（5.5 参照）。
