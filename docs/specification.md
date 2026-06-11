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
- `registerType: 'autoUpdate'`（新しい Service Worker を自動で取り込む）。
- workbox: `navigateFallback: '/FitLog/index.html'`、`globPatterns` に `js,css,html,svg,png,ico` をプリキャッシュ。

### 2.3 エントリポイント（`src/main.tsx`）

- `React.StrictMode` → `ErrorBoundary` → `App` の順に包む。
- `registerSW({ immediate: true })` で Service Worker を即時登録する。

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
| `useFitLogUi` | `hooks/useFitLogUi.ts` | 保存しない一時 UI 状態（編集モード、追加フォーム、入力欄、展開状態、ドラッグ対象、履歴フィルタ） |
| `useFitLogSelectors` | `hooks/useFitLogSelectors.ts` | `state` と `selectedDate` から派生値を `useMemo` で計算 |
| `usePresetActions` | `hooks/usePresetActions.ts` | プリセットの選択・作成・改名・削除・種目増減・並び替え・一括投入 |
| `useWorkoutActions` | `hooks/useWorkoutActions.ts` | ワークアウト/セットの追加・更新・削除・並び替え・詳細を開く |
| `useExerciseActions` | `hooks/useExerciseActions.ts` | 種目マスタの追加・計測方法変更・削除・ドラッグ並び替え |
| `useTrainingPlanActions` | `hooks/useTrainingPlanActions.ts` | 分割計画の追加（上書き）・削除 |
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
| `exercises` | `Exercise[]` | 種目マスタ（部位・名前・計測方法） |
| `workouts` | `Workout[]` | 日付ごとの記録（セットを含む） |
| `presets` | `Preset[]` | よく使う種目のまとまり |
| `trainingDays` | `TrainingDay[]` | 日付ごとの実施部位（履歴の補助情報） |
| `trainingPlans` | `TrainingPlan[]` | 部位ごとの分割計画 |
| `catalogVersion` | `number` | 種目マスタのカタログ版（追補判定に使用） |

### 4.2 各型

```ts
type MeasurementType = 'reps' | 'seconds';
type SetIntensity = 1 | 2 | 3 | 4 | 5;

type Exercise = {
  id: string;
  part: string;          // 部位（例: 胸 / 背中 / 脚 / 肩 / 腕 / その他）
  name: string;          // 種目名
  measurementType: MeasurementType; // 記録単位（回数 / 秒数）
};

type WorkoutSet = {
  id: string;
  weight: string | number;      // 重量（kg）。入力中は文字列、計算時に数値化
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
```

### 4.3 種目マスタと記録の責務分離

- `Exercise` は「何を行うか」の軽量マスタ（`id` / `part` / `name` / `measurementType`）。
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
- `catalogVersion`: `starterCatalogVersion`（現在 `2`）。

### 5.5 正規化・移行（`normalizeState`）

- `exercises` か `workouts` が無ければ `null` を返す（＝壊れている扱い）。
- 各配列を専用 normalize 関数で正規化し、不正要素は除外（`flatMap` で drop）。
- **種目マスタ追補**: 保存データの `catalogVersion` が `starterCatalogVersion` 未満なら、`part::name` をキーに未収録のスターター種目だけを末尾へ追加（`mergeStarterExercises`）。正規化後は `catalogVersion` を最新へ更新。
- **既定プリセット補完**: 名前が一致しない既定プリセットを末尾に追加（`mergeDefaultPresets`）。
- 各フィールドの正規化方針:
  - `Exercise`: `id` / `part` / `name` がすべて文字列でなければ除外。`measurementType` は `'seconds'` 以外を `'reps'` に丸める。
  - `Workout`: `id` / `exerciseId` / `date` / `name` / `part` が文字列でなければ除外。
  - `WorkoutSet`: `id` が文字列でなければ除外。`weight` / `recordValue` は文字列・数値以外を `''` に。`recordValue` は旧フィールド `reps` からも引き継ぐ。`intensity` は 1〜5 のみ採用、それ以外は `undefined`。`note` は文字列以外を `''`。
  - `TrainingDay`: 同一日付をマージし、`parts` を trim + 重複排除。旧フィールド `part`（単数）からも取り込む。
  - `TrainingPlan`: `part` 必須。`mode` は `'interval'` 以外を `'weekly'`。`weekdays` は 0〜6 の整数のみ・重複排除・ソート。`intervalDays` は正の整数（既定 1）。

### 5.6 エクスポート / インポート（`useBackup`）

- **エクスポート**: 現在の `state` を整形 JSON（2 スペース）にし、`fitlog-backup-<selectedDate>.json` としてダウンロード。完了トースト表示。
- **インポート**: 選択ファイルを `parseImportedState`（= `JSON.parse` + `normalizeState`）で正規化。
  - 正規化に失敗（`null`）→「インポートできるデータが見つかりません」。
  - 成功 → `setState` で全置き換え。`currentWorkoutId` を解除、選択プリセットを先頭に、編集対象を解除、選択日を本日へ。「データをインポートしました」。
  - 例外時 →「JSONの読み込みに失敗しました」。

---

## 6. 画面仕様

`Screen` 型: `'home' | 'select' | 'detail' | 'exerciseHistory' | 'preset' | 'presetEdit' | 'history'`。

### 6.1 アプリ外枠とナビゲーション（`App.tsx`）

- `<main class="app">` 内に現在の画面を 1 つだけ描画。
- ボトムナビは 2 タブ:「ホーム」（`home`）/「履歴/計画」（`history`）。
- トースト領域は `role="status"` `aria-live="polite"`。
- `detail` / `exerciseHistory` は `currentWorkout` がある場合のみ描画。

#### 画面遷移の共通処理（`showScreen`）

- 遷移先が `detail` / `exerciseHistory` 以外のとき、`cleanupBlankDetailSets()` を実行（詳細画面で増やした空セットの掃除）。
- 遷移先が `select` 以外のとき、編集モードを解除。

### 6.2 ホーム（`HomeScreen`）

- **トップバー**: 「前の日 / 日付ラベル / 次の日」。日付ラベルは `YYYY/MM/DD (曜)`、押すとカレンダーダイアログを開く。
- **集計（5 指標）**: 選択日の `selectedWorkouts` から算出。
  - 合計種目数、合計セット数、合計レップ数（reps 種目の `recordValue` 合計）、合計秒数（seconds 種目の `recordValue` 合計）、合計負荷量（reps 種目の `weight × recordValue` 合計を四捨五入）。
- **プリセット開始バー**: プリセット選択 select + 「開始」+「管理」（プリセット一覧へ）。
- **予定表示**: 選択日に分割計画で予定された部位があれば「予定: A / B」を表示。
- **種目一覧**: `selectedWorkouts` をカード表示。各カードは `role="button"` でタップ / Enter / Space で詳細へ。
  - カードヘッダに「部位 - 種目名」と削除ボタン。
  - セットは表形式（`HomeSetRow`）でセット番号・重さ・記録・RM を表示。
  - 未開始ワークアウト（後述）は「＋」オーバーレイを表示。
  - 一覧が空のときは空状態メッセージ。
- **FAB（＋）**: 種目選択画面へ。
- **削除確認ダイアログ**: 記録ありの種目を削除しようとすると確認ダイアログを表示。未開始ワークアウトは確認なしで即削除。
- **カレンダーダイアログ**: 月移動・日付選択・「本日」ジャンプ。記録のある日は `trained`、選択日は `selected` を付与。

### 6.3 種目選択（`SelectScreen`）

- 部位ごとにグループ化（`groupedExercises`）して表示。
- **通常モード**:
  - 各種目はボタンで、タップすると選択日にその種目を追加して詳細画面へ（`addExerciseToToday`）。
  - 部位タイトルに最終実施ラベル（`partRecentLabels`: `履歴なし` / `今日` / `N日前`）を表示。
  - 種目が 5 件以上ある部位は先頭 4 件のみ表示し、「すべて表示 / 閉じる」で展開（`expandedParts`）。
  - 各部位フッタに「種目を追加」（その部位を入力欄へ入れて追加フォームを開く）。
- **追加フォーム**（`addFormOpen`）: 部位（最大 12 文字、空なら「その他」）/ 種目名（最大 30 文字、必須）/ 記録単位トグル。送信で新種目を作成し、その記録の詳細へ。
- **編集モード**（「編集」ボタン）:
  - 種目行をドラッグで並び替え（部位をまたいだ移動も可、ドロップ先の部位へ所属変更）。
  - 行内で計測方法トグル、削除ボタン。
  - 削除時はプリセットからも該当 ID を除去。

### 6.4 種目詳細（`DetailScreen`）

- トップバー: 戻る / 種目名 / 履歴（種目別履歴へ）。
- **前回記録**（`LastRecord`）を表示。
- **セット入力テーブル**: 各行に番号・重量入力（`kg`、step 0.5）・記録入力（`回`/`秒`、step 1）・RM 表示・削除ボタン・強度ピッカー（5 段階トグル）。
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
- **日別カード**: 日付・TOTAL（reps は重量×回数の合計 kg、seconds は合計秒）・MAX 1RM（reps のみ）。
  - セット表: セット番号・重さ（0 なら「自重」）・記録・RM・強度アイコン。

### 6.6 プリセット一覧（`PresetListScreen`）/ 編集（`PresetEditScreen`）

- 一覧: プリセットの作成・選択・編集画面への遷移。
- 編集: 名称変更（空なら「名称未設定」）、種目の追加（重複は無視）・削除・並び替え、プリセット削除。
- ホームの「開始」やプリセット一覧から `startPreset` を実行すると、プリセットの種目を選択日へ一括投入する（後述 8.3）。

### 6.7 履歴/計画（`HistoryScreen`）

- トップバー右に設定メニュー（記録の書き出し / 読み込み）。
- 「履歴」「計画」をタブ切り替え。
- **履歴タブ**:
  - 部位フィルタタブ（`ALL` + 部位、ただし「レスト」は除外）。
  - 月カレンダー（前月 / 次月、記録のある日は `trained`、本日は `today`、計画日はツールチップで部位表示）。日付タップでその日のホームへ。
  - 「<部位>の履歴」リスト: 日付・部位・種目名（`buildVisibleHistory` で `workouts` と `trainingDays` を日付ごとに統合し、部位フィルタを適用、新しい順）。
- **計画タブ**:
  - 計画フォーム: 部位選択 / タイプ（曜日 or 何日ごと）/ 曜日ピッカー or （間隔＋開始日）/ 追加・更新。
  - 計画一覧: 部位と整形済み内容（`◯・◯曜日` または `YYYY/MM/DD から N日ごと`）、削除ボタン、行タップでフォームへ読み込み。
  - 「今後7日」プレビュー: 選択日から 7 日間の予定部位。

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
- `formatWeight(value)`: 数値化して小数 1 桁。
- `measurementUnit` / `measurementLabel`: `'seconds'` → `秒`/`秒数`、`'reps'` → `回`/`回数`。

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

- `addCustomExercise`: フォーム入力から新種目を作成（部位は空なら「その他」、種目名は必須）。先頭に追加し、その記録の詳細へ。
- `updateExerciseMeasurementType`: 計測方法（回数/秒数）を変更。
- `deleteExercise`: 種目を削除し、全プリセットから該当 ID を除去。
- `commitExerciseOrder`: ドラッグ後の DOM 並び順を読み取り、種目の順序と所属部位を `state` に反映。並び順変更に合わせて既存ワークアウトの `name` / `part` を最新の種目に同期。
- `startPointerExerciseDrag`: Pointer イベントで行ドラッグを開始（DOM を直接操作し、終了時に `commitExerciseOrder`）。`[data-row-action]` 上での開始は無視。

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
- `deleteTrainingPlan`: 指定計画を削除。

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
- CSS は `src/styles.css` を入口に、`src/styles/` 配下で役割ごとに分割（`base` / `layout` / `home` / `detail` / `history` / `presets` / `select` / `controls` / `responsive`）。
- トーストは画面下部に短時間表示（1800ms）。ダイアログはバックドロップ + `role="dialog"` `aria-modal="true"`。

---

## 10. テスト

- Vitest（jsdom 環境）。設定は `vitest.config.ts`。
- テストは対象コードの隣に配置する方針（`src/*.test.ts`）。
  - `src/storage.test.ts`: 読み込み・正規化・移行・壊れたデータ退避。
  - `src/utils.test.ts`: 計算・日付・判定ヘルパー。
- 実行: `npm test`（CI 向け一括）/ `npm run test:watch`（監視）。

---

## 11. 初期データ（スターター種目）

`src/data/starterExercises.ts`。`starterCatalogVersion = 2`。

- 部位: 胸 / 背中 / 脚 / 肩 / 腕。すべて `measurementType: 'reps'`。
- 例: 胸（ベンチプレス、インクラインダンベルプレス、ダンベルフライ ほか）、背中（ラットプルダウン、シーテッドロー、チンニング ほか）、脚（スクワット、レッグプレス、ルーマニアンデッドリフト ほか）、肩（ショルダープレス、サイドレイズ ほか）、腕（ダンベルカール、トライセプスプレスダウン ほか）。
- カタログ版を上げると、既存ユーザーには未収録の種目だけが追補される（5.5 参照）。
