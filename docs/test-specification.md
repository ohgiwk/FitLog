# テスト仕様書

このドキュメントは、FitLog の自動テストが「どこの何を、どの観点で確認しているか」を把握するための仕様書です。

## 実行方法

| コマンド | 内容 |
| --- | --- |
| `npm test` | Vitest の全テストを 1 回実行する |
| `npm run test:watch` | Vitest を watch モードで実行する |
| `npm run test:e2e` | Playwright で主要導線の E2E テストを実行する |
| `npm run test:e2e:ui` | Playwright の UI モードで E2E テストを実行する |

テスト設定は [`vitest.config.ts`](../vitest.config.ts) にあります。`vite.config.ts` の PWA プラグインを読み込まない独立設定で、`localStorage` を使うテストのために `jsdom` 環境を使います。対象ファイルは `src/**/*.test.ts` と `src/**/*.test.tsx` です。画面操作テストでは React Testing Library と user-event を使います。
E2E テスト設定は [`playwright.config.ts`](../playwright.config.ts) にあり、Vite の開発サーバーを `http://127.0.0.1:5174/FitLog/` で起動して、狭いスマホ幅の Chromium で確認します。対象ファイルは `e2e/**/*.spec.ts` です。

## テスト範囲の全体像

| テストファイル | 主な対象 | 確認していること |
| --- | --- | --- |
| [`src/storage.test.ts`](../src/storage.test.ts) | `loadState` / `normalizeState` / `parseImportedState` / `getDeviceId` | 保存データの読み込み、破損時復旧、旧データ移行、設定値の正規化、端末 ID の永続化 |
| [`src/utils.test.ts`](../src/utils.test.ts) | `src/utils.ts` の計算・整形・判定ヘルパー | 1RM、重量変換、目標達成判定、未開始判定、日付・カレンダー、トレーニング時間、部位グループ化 |
| [`src/selectors/fitLogSelectors.test.ts`](../src/selectors/fitLogSelectors.test.ts) | 履歴・予定・分析用 selector | 表示履歴、予定判定、表示部位、週別ボリューム、自己ベスト、成長推移、種目別/部位別回数 |
| [`src/hooks/useExerciseReorder.test.ts`](../src/hooks/useExerciseReorder.test.ts) | 種目並び替えヘルパー | 並び順差分の判定、ドラッグ挿入位置の計算 |
| [`src/components/ConfirmDialog.test.tsx`](../src/components/ConfirmDialog.test.tsx) | `ConfirmDialog` | 背景クリック、Escape、ダイアログ内クリック、ARIA 属性 |
| [`src/screens/DetailScreen.test.tsx`](../src/screens/DetailScreen.test.tsx) | `DetailScreen` のセット入力 | 入力中文字列の保持、空入力の `null` 保存、lbs 入力の kg 保存 |
| [`src/hooks/useFitLogCore.test.tsx`](../src/hooks/useFitLogCore.test.tsx) | `useFitLogCore` の toast | 表示中 toast のキューイングと順次表示 |
| [`e2e/home.spec.ts`](../e2e/home.spec.ts) | ホーム起点の主要導線 | 起動、種目開始、セット入力、リロード後の永続化、狭幅でのカレンダー・ドロワー・FAB、設定のバックアップ導線 |

## `src/storage.test.ts`

### 対象

- [`src/storage.ts`](../src/storage.ts)
- [`src/storageNormalization.ts`](../src/storageNormalization.ts)
- [`src/device.ts`](../src/device.ts)

### テスト観点

| グループ | 代表ケース | 目的 |
| --- | --- | --- |
| `loadState` | 保存データなし、`null` 保存、正しい保存データ、壊れた JSON、必須フィールド不足 | アプリ起動時に安全に初期状態へ復帰できること、破損データを消さず退避できること |
| `normalizeState` 基本 | `null` / 空オブジェクト、`schemaVersion` 補完、`updatedAt` 補完、非表示部位の trim / 重複排除 | 旧データや不完全な保存データを現行 `State` に寄せられること |
| セット移行 | 旧 `reps` から `recordValue` への移行、不正な `intensity` の破棄、旧セットメモの破棄 | 保存形式変更後も古い記録を読み込めること |
| グリップ移行 | 種目の有効グリップ / 握り方の正規化、旧 catalogVersion の候補補完、旧セット単位グリップを移行しないこと | 種目マスタと記録単位の責務が混ざらないこと |
| 日付・時刻 | `trainingDays.part` から `parts` への移行、開始/終了時刻の形式チェック | 履歴表示とトレーニング時間計算に使うデータが壊れないこと |
| 設定 | `catalogVersion`、重量単位、外観、通知設定 | 未設定値には既定値を補完し、有効値だけ保持すること |
| プリセット・目標 | プリセット schedule、種目目標、目標達成記録 | 計画機能と目標機能の保存データを正規化できること |
| インポート | 正しい JSON、不完全 JSON | バックアップ復元前に `State` として読めるデータだけ受け付けること |
| 端末 ID | 初回生成、2 回目以降の再利用 | 同じブラウザ内で端末 ID が安定すること |

### 重点的に守っている挙動

- 保存データが壊れていても、元データを `corruptStoreKey` に退避し、ユーザーが復旧できる余地を残す。
- 旧データの `reps`、`part`、catalogVersion 差分などを現在の型へ移行する。
- 不正値は無理に採用せず、既定値・空配列・`undefined`・`null` へ安全に落とす。

## `src/utils.test.ts`

### 対象

- [`src/utils.ts`](../src/utils.ts)

### テスト観点

| グループ | 代表ケース | 目的 |
| --- | --- | --- |
| 1RM | 重量/回数 0、3 回以下、4 回以上 | `calcRm` の計算式と丸め桁を固定する |
| 数値・空判定 | 数値文字列、不正文字列、空文字、空白、`0` | 入力値や保存値を扱う基礎ヘルパーの挙動を固定する |
| 目標達成 | 同一セットで達成、別セットに条件が分かれる、未入力値 | 目標達成記録を誤って作らないこと |
| 重量表示・保存 | kg 表示、lbs 表示、lbs から kg 保存値への換算、空入力 | 画面表示単位と保存単位の変換を固定する |
| 測定種別 | `reps` / `seconds` の単位・ラベル・判定 | 回数種目と秒数種目の表示文言を固定する |
| 未開始・有効セット判定 | 空セット、記録あり、強度あり、メモあり、グリップあり | ホームの未開始扱いと集計対象の判断を固定する |
| トレーニング時間 | 同日、日またぎ、分数表示、時分表示 | 開始/終了時刻から表示用時間を作る挙動を固定する |
| 日付・カレンダー | `YYYY-MM-DD` 変換、parse 往復、42 セル、必要週だけの compact セル | カレンダー表示の土台を固定する |
| 月ラベル | 年またぎの前月/翌月 | ホームカレンダーの隣月表示を固定する |
| 種目グループ | 部位ごとの Map 化 | 種目選択画面のグルーピングを固定する |
| 新規セット・ID・強度 | 空セット、ユニーク ID、5 段階強度 | セット作成と強度 UI の前提を固定する |

### 重点的に守っている挙動

- 保存する重量は kg 基準、表示は設定単位に合わせる。
- `null` の未入力値は、目標達成や集計で記録済みとして扱わない。
- カレンダーは固定 42 セル版と、必要週だけ返す compact 版の両方を保証する。

## `src/selectors/fitLogSelectors.test.ts`

### 対象

- [`src/selectors/fitLogSelectors.ts`](../src/selectors/fitLogSelectors.ts)

### テスト観点

| グループ | 代表ケース | 目的 |
| --- | --- | --- |
| 履歴 selector | ワークアウト履歴と手動 trainingDays を日付単位にまとめ、部位で絞り込む | ホーム履歴に表示する日付・部位・種目名を正しく作る |
| 予定 selector | 曜日指定、何日ごとの interval 指定、プリセット順 | 今日の予定部位と予定プリセットを正しく判定する |
| 部位 selector | 非表示部位が履歴や予定に残っているケース | 削除/非表示にした部位を画面へ復活させない |
| 週別ボリューム | reps 種目のみ、週境界、未入力セット除外 | 分析画面の週別負荷量グラフを正しく作る |
| 自己ベスト | reps 種目の 1RM / 最大重量 / 最大回数 / 最大負荷量、seconds 種目の最長記録 | 種目別履歴と分析に出すベスト値を固定する |
| 成長推移 | 日付順、同日の複数ワークアウト、reps と seconds の metric 差 | グラフ用の時系列データを正しく作る |
| 種目別回数 | 記録済みワークアウトのみ、未入力除外、回数降順 | 分析の種目ランキングを正しく作る |
| 部位別回数 | 記録済みワークアウトのみ、未入力除外 | 分析の部位別集計を正しく作る |

### 重点的に守っている挙動

- 空セットだけのワークアウトは分析の実施回数に含めない。
- 秒数種目は 1RM ではなく最長記録を主指標にする。
- 予定は weekly と interval を同じ画面で扱えるよう、同一 selector でまとめる。

## `src/hooks/useExerciseReorder.test.ts`

### 対象

- [`src/hooks/useExerciseReorder.ts`](../src/hooks/useExerciseReorder.ts)

### テスト観点

| グループ | 代表ケース | 目的 |
| --- | --- | --- |
| レイアウト比較 | 同じ順序・カテゴリ、逆順 | ドラッグ後に実際の並び変更があったか判定する |
| 挿入位置 | 同カテゴリ内のターゲット直前、ターゲットなし、存在しないカテゴリ | ドラッグ中の挿入 index を安定して計算する |

### 重点的に守っている挙動

- 種目 ID の順序だけでなくカテゴリも比較対象にする。
- 挿入先が指定されない場合は、同カテゴリの末尾に挿入する。

## 画面・フック操作テスト

### 対象

- [`src/components/ConfirmDialog.tsx`](../src/components/ConfirmDialog.tsx)
- [`src/screens/DetailScreen.tsx`](../src/screens/DetailScreen.tsx)
- [`src/hooks/useFitLogCore.ts`](../src/hooks/useFitLogCore.ts)

### テスト観点

| グループ | 代表ケース | 目的 |
| --- | --- | --- |
| `ConfirmDialog` | 背景クリック、Escape、ダイアログ内クリック、`aria-modal` / `aria-labelledby` | 共通確認ダイアログの閉じる操作とアクセシビリティ属性を固定する |
| `DetailScreen` 入力 | 小数の重量入力、空の回数入力、lbs 入力 | 画面上の入力文字列と保存値の分離を固定する |
| `useFitLogCore` toast | 1 件目表示中に 2 件目・3 件目を追加、手動 clear、自動 timer | 複数通知が順番に表示されることを固定する |

### 重点的に守っている挙動

- ダイアログ内の操作は背景クリックとして扱わない。
- Detail 画面の入力欄は、編集中の文字列を一時保持しつつ、保存値は `number | null` に変換する。
- 表示中の toast を新しい toast で上書きせず、キューに積んで順番に表示する。

## E2E テスト

### 対象

- [`e2e/home.spec.ts`](../e2e/home.spec.ts)
- [`playwright.config.ts`](../playwright.config.ts)

### テスト観点

| グループ | 代表ケース | 目的 |
| --- | --- | --- |
| 起動 | `/FitLog/` を開き、ホームの開始パネル・メニュー・今日ボタンを確認する | アプリが起動直後からホームとして使えることを保証する |
| 記録開始と永続化 | 種目選択からベンチプレスを開始し、1セット目へ重量・回数を入力してリロードする | 実ブラウザで入力導線と `localStorage` 保存がつながっていることを保証する |
| 狭幅操作 | 390px 幅でカレンダー月表示、ドロワー、ホーム FAB を操作する | モバイル幅の主要オーバーレイと浮動ボタンがタップできることを保証する |
| 設定・バックアップ | ドロワーから設定へ進み、データ管理のバックアップ画面を開く | ローカルバックアップとクラウドバックアップ導線が表示できることを保証する |

### 重点的に守っている挙動

- E2E はテストごとに `localStorage` を消し、初期状態から開始する。
- 入力後は `localStorage` に保存されたことを待ってからリロードし、保存デバウンスによる不安定さを避ける。
- 実通信を伴う Firebase 操作は行わず、バックアップ画面の導線表示までを確認する。

## 現時点で自動テストが薄い領域

| 領域 | 状態 |
| --- | --- |
| React コンポーネントの DOM 操作 | 共通ダイアログと Detail の主要入力は確認済み。Home の基本導線、ドロワ、FAB は E2E で主要操作を確認済み。細かな確認ダイアログはまだ薄い |
| PWA / Service Worker | `npm run build` で生成までは確認するが、キャッシュ更新挙動は自動テスト対象外 |
| Firebase クラウドバックアップ | provider や環境変数に依存する実通信は自動テスト対象外 |
| 通知・音・ブラウザ権限 | ローカル通知、Audio、権限 UI は自動テスト対象外 |
| 視覚回帰 | モバイル幅のレイアウト崩れや色の見え方は、必要に応じてブラウザ確認で補う |

## テスト追加時の目安

- 保存データの形、型、移行、正規化を変える場合は `src/storage.test.ts` に追加する。
- 日付、計算、表示文字列、単位変換、未開始判定を変える場合は `src/utils.test.ts` に追加する。
- ホーム履歴、分析、予定、部位表示の算出を変える場合は `src/selectors/fitLogSelectors.test.ts` に追加する。
- 種目並び替えのドラッグ位置や比較条件を変える場合は `src/hooks/useExerciseReorder.test.ts` に追加する。
- 画面操作そのものを保証したい場合は、既存の関数テストに加えて、React Testing Library やブラウザベースの確認を導入する余地がある。
