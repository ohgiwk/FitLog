# 改善候補（備忘録）

現状の仕様ではなく、今後の改善候補を記録するメモです。仕様そのものは [`specification.md`](./specification.md) を参照してください。

> 優先度・粒度はあくまで目安です。着手時に再評価してください。

## 中優先度

### Context の再レンダー最適化
- 巨大な単一 Context に state・派生値・`actions` をまとめて配布しているため、いずれかの変更で広範囲が再描画される。
- `actions` が未メモ化（毎回新しい関数）になっている。
- 対策案: Context の分割、`useCallback` での actions メモ化、画面コンポーネントの `React.memo` 化。

### `updateSet` の全ワークアウト走査
- `useWorkoutActions.ts` の `updateSet` / `updateSetIntensity` が全ワークアウトを `map` で走査している。
- 対策案: 対象ワークアウト（`currentWorkout` / 対象 ID）だけを更新する。

### 命令的な DOM ドラッグ
- `useExerciseActions.ts` の `startPointerExerciseDrag` が `document` を直接操作して並び替えを行っている。
- 対策案: React の状態ベースの並び替え、または専用ライブラリへの置き換えを検討。

### コード重複の解消
- `plannedPartsForDate` が `selectors/fitLogSelectors.ts` と `screens/HistoryScreen.tsx` に重複。
- 曜日ラベル（`['日','月',...]`）が複数箇所に定義。
- 確認ダイアログ・「記録あり判定」などの小ロジックが画面ごとに散在。
- 対策案: セレクタ/ユーティリティ/共通コンポーネントへ集約。

### `weight` / `recordValue` の `string | number` 型
- 入力途中は文字列、計算時は数値という二重の責務を 1 つの型が担っている。
- 対策案: 保存値は数値に正規化し、入力の文字列状態は UI 層に閉じ込める。

### ダイアログのアクセシビリティ
- フォーカストラップ、Escape での閉じる、バックドロップ外側クリックでの閉じるが未実装。
- 対策案: 共通ダイアログコンポーネントに a11y を実装。

### ネストしたインタラクティブ要素
- `HomeScreen` のカードが `role="button"` で、その内側に削除ボタンを内包している（ネストしたインタラクティブ要素）。
- 対策案: カードの構造を見直し、操作要素のネストを解消。

## 低優先度

- `isUnstartedWorkout` がセット数 5 に依存している（マジックナンバー）。
- 削除操作の Undo（取り消し）が無い。
- トーストが連続発火で上書きされる（キューイングが無い）。
- カレンダー実装がホーム/履歴で別々（共通化の余地）。
- `tsconfig` の厳格化（`noUncheckedIndexedAccess` など）。
- 依存バージョンの `"latest"` 指定（`react` / `vite` / `typescript` など）をピン留めする。

## 共通コンポーネント候補（リファクタ観点）

- 確認ダイアログ（削除確認・キャンセル/実行）
- カレンダーグリッド（月移動・日付セル・trained/selected/today 表示）
- 記録単位トグル（回数/秒数）※現状は `SelectScreen` 内に閉じている
