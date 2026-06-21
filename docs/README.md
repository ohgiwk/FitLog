# FitLog ドキュメント

FitLog の仕様・設計ドキュメントの入口です。

## FitLog とは

- React + Vite + TypeScript で作られた筋トレ記録 **PWA** です。
- すべてのデータは端末の `localStorage` に保存され、サーバー通信を行いません（ローカル完結）。
- モバイル優先で、起動直後から選択日のトレーニングを記録できます。
- GitHub Pages で公開し、公開パスは `/FitLog/`。`main` への push でデプロイが自動実行されます。

## ドキュメント一覧

| ドキュメント | 内容 |
| --- | --- |
| [`specification.md`](./specification.md) | 実装に基づく詳細仕様（型・永続化・画面・ロジック・機能） |
| [`improvements.md`](./improvements.md) | 今後の改善候補（備忘録） |

> リポジトリ運用ルール（コミット方針・コーディング方針など）は、ルートの [`AGENTS.md`](../AGENTS.md) を参照してください。

## 主な機能

- 日付ごとのトレーニング記録（種目・セット・重量・回数/秒数・強度・メモ）
- 種目マスタの管理（部位別グループ、追加・削除・並び替え、回数/秒数の切り替え）
- プリセットによる種目の一括投入
- 分割計画（曜日指定 / 何日ごと）と「今後7日」の予定表示
- 種目別の履歴とベスト記録（MAX 1RM・最大重量・最大負荷量など）
- 種目ごとの重量・回数目標と、達成時の次目標設定
- 種目ごとの目標達成日・達成重量・回数の履歴
- 1RM 推定・合計レップ/秒/負荷量の集計
- 重量単位（kg / Lbs）の切り替え
- レストタイマー（音アラート付き）
- データの JSON エクスポート / インポート
- 壊れた保存データの退避、描画エラー時の復旧画面

## 画面構成

| 画面 | 役割 |
| --- | --- |
| ホーム | 選択日の一覧・集計・プリセット開始・カレンダー |
| 種目選択 | 部位別の種目一覧・並び替え・削除 |
| 種目追加 / 編集 | 種目の基本情報・握りの向き・握り方の設定 |
| 種目詳細 | セット入力・1RM・強度・グリップ・レストタイマー |
| 種目別履歴 | ベスト記録と日別のセット履歴 |
| 目標達成記録 | 種目ごとの達成日・重量・回数/秒数 |
| プリセット一覧 / 編集 | プリセットの作成・編集 |
| 履歴/計画 | カレンダー・部位別履歴・分割計画・データ入出力 |
| 設定 | 重量単位などのアプリ設定 |

ボトムナビは「ホーム」「履歴/計画」の 2 タブです。

## アーキテクチャ概略

```
useFitLogCore (state + 永続化 + トースト)
   ├─ useNavigation / useFitLogUi / useFitLogSelectors
   └─ usePresetActions / useWorkoutActions / useExerciseActions
      / useTrainingPlanActions / useBackup
            │
        useFitLog (統合)
            │
      FitLogContext (配布)
            │
   各画面の useXScreenModel (view-model)
```

詳細は [`specification.md`](./specification.md) を参照してください。

## 開発コマンド

```bash
npm run dev          # 開発サーバー
npm run build        # tsc + vite build（PWA 生成を含む）
npm run preview      # ビルド成果物のプレビュー
npm test             # vitest run
npm run test:watch   # vitest watch
```
