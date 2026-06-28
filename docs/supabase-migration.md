# Supabase 移行に向けた現行データ調査

この文書は、FitLog の保存先を `localStorage` から Supabase へ移行するために、2026-06-26 時点のデータ構造・更新方法・互換処理を実装から整理したものです。現行仕様の詳細は [`specification.md`](./specification.md) を参照してください。

## 1. 現在の保存方式

- 保存対象は `src/types.ts` の `State` 全体で、`localStorage` の `fit-log-v2` キーに単一の JSON として保存する。
- `useFitLogCore` がアプリ起動時に全件をメモリへ読み込み、以後は React state を唯一の操作対象とする。
- state の変更後、400ms のデバウンスで JSON 全体を書き戻す。画面非表示時と `pagehide` 時は即時保存する。
- ユーザー、端末、更新日時、リビジョンの情報は保存していない。
- 複数タブ間の同期、差分更新、競合検知、サーバーとの同期キューはない。
- JSON エクスポートは `State` 全体、インポートは正規化後の `State` 全置換である。

```text
各画面
  ↓ actions
useFitLog / 各 action hook
  ↓ saveState
メモリ上の State
  ↓ 400ms デバウンス
localStorage: fit-log-v2
```

保存に失敗した場合はトーストを表示する。読み込み不能な JSON は `fit-log-v2-corrupt` に退避して初期状態で起動する。

## 2. State の内訳

| フィールド | 現在の形 | 性質 | Supabase での候補 |
| --- | --- | --- | --- |
| `exercises` | `Exercise[]` | ユーザーが編集する種目マスタ。配列順が表示順 | `exercises` |
| `goalAchievements` | `ExerciseGoalAchievement[]` | 目標達成時点の履歴スナップショット | `goal_achievements` |
| `workouts` | `Workout[]` | 日付・種目単位の記録。セットを内包 | `workouts` + `workout_sets` |
| `workoutStartTimes` | `Record<date, HH:mm>` | 日単位の開始時刻 | `workout_sessions.started_at` |
| `workoutEndTimes` | `Record<date, HH:mm>` | 日単位の終了時刻。存在するとその日の記録は読み取り専用 | `workout_sessions.ended_at` |
| `presets` | `Preset[]` | 順序付き種目 ID と任意のスケジュール | `presets` + `preset_exercises` |
| `trainingDays` | `TrainingDay[]` | 旧形式を含む日付別実施部位。履歴表示の補助 | 移行要否を判断。必要なら `training_day_parts` |
| `trainingPlans` | `TrainingPlan[]` | 旧バージョンの部位別計画。現在の画面では未使用 | 原則は移行対象外候補 |
| `parts` | `PartSetting[]` | 部位名、色、配列順による表示順 | `parts` |
| `weightUnit` | `'kg' \| 'lbs'` | ユーザー設定。重量の保存値自体は kg | `profiles.weight_unit` |
| `catalogVersion` | `number` | スターター種目の追補判定 | ユーザー行ではなく移行処理またはアプリ設定で管理 |

## 3. エンティティと関係

```text
user
 ├─ parts
 ├─ exercises
 │   └─ current goal
 ├─ workout_sessions (date, start/end)
 │   └─ workouts
 │       └─ workout_sets
 ├─ presets
 │   └─ preset_exercises
 ├─ goal_achievements
 └─ profile/settings
```

### 3.1 Exercise

- 主キーはクライアント生成の文字列 ID。
- `part` は現在は部位名文字列であり、外部キーではない。
- `availableGrips` と `availableGripStyles` は列挙値の配列。
- `goal` は任意の `{ weight, recordValue }`。
- 配列の並び順が部位内の表示順を兼ねるため、DB化では明示的な `sort_order` が必要。

候補列:

```text
id, user_id, part_id, name, measurement_type, category,
available_grips, available_grip_styles,
goal_weight_kg, goal_record_value, sort_order,
created_at, updated_at
```

### 3.2 Workout / WorkoutSet

- `Workout` は「1日・1種目」の記録で、同じ日付・種目は追加処理上再利用される。
- `exerciseId` で種目を参照する一方、`name`、`part`、`measurementType` も保持する。
- これらは履歴を守るためのスナップショットだが、現実装では種目の改名・部位変更時に既存 `Workout.name` / `part` も一括更新する。
- `sets` は `Workout` 内の配列で、配列順がセット順。DB化では `sort_order` が必要。
- `weight` と `recordValue` は入力途中の空文字を許す `string | number`。DBへ保存する値としては未確定なので、数値列と空値への変換ルールを先に決める必要がある。
- 終了済み判定は `workoutEndTimes[date]` の存在で行い、終了後はその日の編集を禁止する。

候補制約:

- `workout_sessions`: `unique(user_id, workout_date)`
- `workouts`: `unique(session_id, exercise_id)` を基本候補とする
- `workout_sets`: `workout_id` への外部キーと `sort_order`
- 種目削除後も履歴を残すため、`workouts.exercise_id` は nullable または `ON DELETE SET NULL`
- スナップショット列は履歴表示のため維持する

### 3.3 Preset

- `exerciseIds` は順序付き配列であり、重複は保存時に除去される。
- 種目を削除すると、すべてのプリセットから該当 ID を除去する。
- スケジュールは `weekly` または `interval`。曜日配列、間隔日数、起点日を同じオブジェクトに保持する。

DB化では `preset_exercises(preset_id, exercise_id, sort_order)` の中間テーブルが適する。種目削除時は中間行を `ON DELETE CASCADE` で削除できる。

### 3.4 Part

- 現在は部位名文字列が `Exercise`、`Workout`、`TrainingDay`、`TrainingPlan` に重複している。
- `parts` 配列の順序が表示順で、`color` は UI 設定。
- `normalizeState` は他データ内に存在する未登録部位を自動的に `parts` へ復元する。
- 過去記録に同名部位が残ると、UIで削除しても再表示される可能性がある。

Supabase では `parts.id` を導入し、現行の名前参照を外部キーへ寄せるのが望ましい。ただし履歴側には部位名スナップショットを残す。

### 3.5 GoalAchievement

- 種目 ID に加えて、達成時点の種目名・計測方法・目標値・達成値を保存する。
- 重複判定は `exerciseId + date + goalWeight + goalRecordValue`。
- 種目削除後も履歴を表示する設計なので、種目参照は nullable / `ON DELETE SET NULL` が適する。

## 4. 現在の整合性ルール

- `Exercise` 削除時:
  - 種目マスタから削除する。
  - プリセット内の参照を削除する。
  - 過去の `Workout` と `GoalAchievement` は削除しない。
- `Exercise` の改名・部位変更時:
  - 種目マスタを更新する。
  - 同じ `exerciseId` の過去 `Workout.name` / `part` も更新する。
  - `measurementType` の過去記録は更新しない。
- `Workout` 削除時:
  - 内包するセットも一緒に消える。
- 部位削除時:
  - その部位に種目が残っていれば拒否する。
  - `parts` と同部位の `trainingPlans` を削除する。
  - 過去記録や `trainingDays` は残る。
- 目標達成履歴:
  - 達成時の値をスナップショット保存する。
- 重量:
  - UI が lbs 表示でも保存値は kg。
- 日付・時刻:
  - 日付は端末ローカルの `YYYY-MM-DD`。
  - 開始・終了時刻はタイムゾーンを持たない `HH:mm`。

これらは外部キー、削除ポリシー、トランザクション、RLS を設計する際に維持または明示的に変更する必要がある。

## 5. 正規化と後方互換

`normalizeState` は読み込み・インポートの共通境界で、以下を行う。

- 不正な配列要素の除外と既定値補完。
- 旧 `WorkoutSet.reps` から `recordValue` への読み替え。
- 旧 `TrainingDay.part` から `parts[]` への読み替えと同日データの統合。
- 欠落した部位設定、既定プリセット、スターター種目の補完。
- `catalogVersion` 4・5 未満に対するグリップ候補の補完。
- 列挙値、時間、目標値、強度などの検証。

`catalogVersion` はデータベース全体のスキーマバージョンではない。Supabase 移行前に、エクスポート JSON とDBの双方を扱える明示的な `schemaVersion` と段階的 migration を用意するのが安全である。

## 6. Supabase 化で先に決める事項

### 認証と所有権

FitLog は、オフライン利用を維持し、機種変更・クラウドバックアップを希望するユーザーだけ会員登録を求める形が適している。

- 未ログイン時:
  - 現行どおり端末の `localStorage` を正本として使う。
  - Supabaseへは通信しない。
  - JSONエクスポート/インポートも引き続き利用可能にする。
- ログイン時:
  - ローカルデータをユーザーのクラウド領域へ紐付ける。
  - 全ユーザーデータに `user_id` を持たせ、RLSで `auth.uid() = user_id` を強制する。
  - ログイン前から端末にあるデータは、初回ログイン時に「この端末のデータをクラウドへバックアップする」操作で取り込む。
- 機種変更時:
  - 新端末はログイン後、クラウドの最新バックアップまたは同期データをローカルへ復元する。
  - 既に新端末側にもローカルデータがある場合は、自動マージではなく「置き換え / クラウドへ追加 / キャンセル」をユーザーに選ばせる。

この方針では、アプリの基本体験はローカル完結のまま保てる。一方で、ログイン後は「どの端末のどの変更をクラウドへ反映済みか」を管理する必要がある。

### オフラインと同期

現在は完全なローカル完結PWAである。Supabaseを唯一の保存先にすると、通信不能時の記録体験が後退する。次のどちらかを選ぶ必要がある。

1. オンライン前提にして、通信中・失敗・再試行をUIへ追加する。
2. ローカルキャッシュと同期キューを残す。各行に `updated_at` またはリビジョンを持たせ、再接続時に差分同期する。

FitLogの利用場面を考えると、ローカル即時反映 + バックグラウンド同期が適している。ただし競合解決が必要になる。

最初から完全なリアルタイム同期を目指すと複雑になりやすい。段階移行では、次の順に実装するのが安全である。

1. クラウドバックアップ/復元:
   - ログインユーザーだけ、現在の `State` 全体をクラウドへ保存・復元する。
   - 競合は「最新バックアップで置き換え」単位に限定する。
2. 差分同期:
   - DBを正規化テーブルへ分割し、変更された行だけをアップロード/ダウンロードする。
   - 端末ごとの同期カーソルと変更ログを持つ。
3. 複数端末の自動マージ:
   - 行単位の `updated_at` / `deleted_at` / `client_mutation_id` で競合を扱う。
   - 同じ行を複数端末で編集した場合の解決ルールをUIに出す。

### 競合単位

現状は `State` 全体の後勝ちである。DB化後は、少なくとも次の単位で更新する。

- セット入力: `workout_sets` の1行
- メモ・グリップ: `workouts` の1行
- 開始・終了: `workout_sessions` の1行
- 種目・部位・プリセット: 対象行と中間テーブル

`updated_at` を比較し、古い画面からの無条件上書きを避ける。複数行更新は Postgres function またはトランザクション相当の処理にまとめる。

### ID

現行 ID は `uid()` が作るクライアント文字列である。既存IDをそのまま text 主キーとして移行するか、UUIDへ変換して対応表を持つ必要がある。段階移行と既存バックアップ互換を優先するなら、初回移行では既存IDを保持する方が単純である。

## 7. 任意ログイン前提のDB設計案

### 7.1 設計方針

- ローカル利用を正規の利用形態として扱い、未ログインユーザーをSupabase上に作らない。
- Supabase上の全データは `auth.users.id` に紐付く `user_id` を持つ。
- 端末ごとの同期状態を `devices` と `sync_states` で管理する。
- 初期実装では、クラウドバックアップ用のスナップショットテーブルを用意し、正規化テーブルへの移行後も保険として残す。
- 削除は同期事故を避けるため、主要テーブルでは物理削除より `deleted_at` のソフト削除を基本にする。
- クライアント生成IDを使い、オフライン中に作った行を後からそのまま upsert できるようにする。

### 7.2 アカウント・端末・同期メタデータ

```sql
profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weight_unit text not null default 'kg',
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

devices (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  platform text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, id)
)

sync_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null references devices(id) on delete cascade,
  last_pulled_at timestamptz,
  last_pushed_at timestamptz,
  last_server_change_id bigint default 0,
  primary key (user_id, device_id)
)

cloud_backups (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text references devices(id) on delete set null,
  state_json jsonb not null,
  state_schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  restored_at timestamptz
)
```

`cloud_backups` は「機種変更・手動バックアップ」の最小実装に使える。正規化テーブルで差分同期を始めた後も、復旧用の世代バックアップとして有用である。

### 7.3 マスタ系テーブル

```sql
parts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, name)
)

exercises (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  part_id text references parts(id) on delete set null,
  part_name_snapshot text not null,
  name text not null,
  measurement_type text not null,
  category text not null,
  available_grips text[] not null default '{}',
  available_grip_styles text[] not null default '{}',
  goal_weight_kg numeric,
  goal_record_value numeric,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
)
```

現行の `Exercise.part` は文字列なので、初回移行では部位名から `parts` を作り、`part_id` と `part_name_snapshot` の両方を持たせる。履歴表示や部位削除後の表示崩れを避けるため、スナップショット列は残す。

### 7.4 記録系テーブル

```sql
workout_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  started_time text,
  ended_time text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, workout_date)
)

workouts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null references workout_sessions(id) on delete cascade,
  exercise_id text references exercises(id) on delete set null,
  exercise_name_snapshot text not null,
  part_name_snapshot text not null,
  measurement_type_snapshot text not null,
  grip text,
  grip_style text,
  note text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (session_id, exercise_id)
)

workout_sets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null references workouts(id) on delete cascade,
  weight_kg numeric,
  record_value numeric,
  intensity integer,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
)
```

`started_time` / `ended_time` は現行互換では `HH:mm` 文字列で保持する。将来的にタイムゾーンを扱うなら、`started_at` / `ended_at` の `timestamptz` を追加し、既存値とは別に移行する。

`weight_kg` と `record_value` は数値または `null` に寄せる。入力途中の空文字はDBへ送らず、クライアント側の一時状態として扱う。

### 7.5 プリセット・スケジュール

```sql
presets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  schedule_mode text,
  schedule_weekdays integer[] not null default '{}',
  schedule_interval_days integer,
  schedule_start_date date,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
)

preset_exercises (
  preset_id text not null references presets(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sort_order integer not null,
  primary key (preset_id, exercise_id)
)
```

`Preset.exerciseIds` の配列順は `preset_exercises.sort_order` で保持する。種目削除時にプリセットから参照が消える現行挙動は、`ON DELETE CASCADE` または `deleted_at` 反映時の同期処理で再現する。

### 7.6 目標達成・互換データ

```sql
goal_achievements (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text references exercises(id) on delete set null,
  exercise_name_snapshot text not null,
  measurement_type_snapshot text not null,
  achieved_date date not null,
  weight_kg numeric not null,
  record_value numeric not null,
  goal_weight_kg numeric not null,
  goal_record_value numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, exercise_id, achieved_date, goal_weight_kg, goal_record_value)
)

training_day_parts (
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  part_name text not null,
  primary key (user_id, workout_date, part_name)
)
```

`trainingPlans` は現在の画面では使わないため、DBへ正規化移行しない候補とする。必要な場合のみ、バックアップJSON内に残すか、旧データ閲覧用の互換テーブルを追加する。

### 7.7 RLS方針

各ユーザーデータテーブルは、原則として次のポリシーに揃える。

```sql
using (auth.uid() = user_id)
with check (auth.uid() = user_id)
```

`profiles.user_id` も同じく `auth.uid() = user_id` で制限する。`auth.users` へ直接依存するため、未ログインユーザーのローカルデータはDBに保存しない。

### 7.8 同期処理の推奨ルール

- ローカル変更には `device_id` と `client_mutation_id` を付け、同じ変更の二重送信を無視できるようにする。
- 同期対象行は `updated_at` と `deleted_at` を持つ。
- ダウンロードは「前回同期以降に更新/削除された自分の行」を取得する。
- アップロードは `upsert` を基本にし、削除は `deleted_at` を送る。
- 競合は最初の実装では「行単位の後勝ち」に寄せる。ただし、同じ `workout_set` を複数端末で同時編集した場合は、将来的にユーザー確認を出せるよう変更元端末と更新時刻を保持する。
- 「終了済みの日は編集不可」はクライアントだけでなく、必要に応じてDB functionでも守る。

## 8. 初回移行の推奨手順

1. 現行 `State` に `schemaVersion` と端末側の移行済み識別子を追加する。
2. 未ログイン状態では従来どおり `localStorage` のみで動くことを維持する。
3. Supabaseのテーブル、制約、RLS、インデックスを作成する。
4. ログイン後、端末IDを作成し `devices` に登録する。
5. `normalizeState` を通したローカルデータを、まず `cloud_backups` に保存する。
6. 正規化テーブルへ投入する場合は、ユーザー単位のトランザクションでアップロードする。
7. 件数を `exercises`、`workouts`、`sets`、`presets`、`goalAchievements` ごとに照合する。
8. 移行完了前の JSON を自動バックアップし、失敗時はローカル運用を継続する。
9. 機種変更時は、ログイン後に `cloud_backups` または正規化テーブルからローカル `State` を復元する。
10. 安定後に不要な互換データである `trainingPlans` などの扱いを確定する。

初回アップロードには冪等性が必要である。同じデータを再送しても重複しないよう、既存IDと `upsert`、ユーザー単位の移行状態を利用する。

## 9. 実装計画 / TODO

最初のリリースでは「未ログインの完全オフライン利用」と「ログインユーザー向けのクラウドバックアップ/復元」までを対象にする。正規化テーブルを使った複数端末の自動差分同期は、バックアップ/復元が安定してから着手する。

### Phase 0: 事前決定

- [ ] Supabaseプロジェクトを新規に用意するか、既存プロジェクトを使うか決める。
- [x] 認証方式を決める。
  - 初回はメールアドレス・パスワード。
  - 将来的にGoogleログインを追加する。
- [x] クラウドバックアップの実行方式を決める。
  - 初回は手動バックアップ/復元のみ。
- [x] 復元時の扱いを決める。
  - 現端末データをJSONとして保存してから、クラウドデータで置き換える。
- [x] 無料枠・保存容量を考慮し、バックアップ世代数を決める。
  - 最新5件を残す。

### Phase 1: ローカルデータ基盤の準備

- [x] `State` に `schemaVersion` を追加する。
- [x] `storageNormalization` に `schemaVersion` の既定値補完を追加する。
- [x] 端末IDを生成・保存する。
  - 例: `fit-log-device-id` のような別 `localStorage` キー。
  - ローカルデータとクラウドバックアップの作成元端末を識別するために使う。
- [x] バックアップ前に現在の `State` を localStorage へ flush する。
- [x] 既存JSONエクスポート/インポートの挙動を維持する。
- [x] JSONエクスポート/インポートをローカルバックアップ画面へ分離する。
- [x] `storage.test.ts` に `schemaVersion` と端末ID周辺のテストを追加する。

この段階ではSupabase通信を入れない。既存のオフライン体験を壊さず、後続のバックアップ実装に必要なメタデータだけを足す。

### Phase 2: Supabase最小構成

- [x] Supabaseクライアントを追加する。
- [x] 環境変数を追加する。
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [x] `profiles`、`devices`、`cloud_backups` のマイグレーションSQLを作成する。
- [x] 各テーブルにRLSを設定する。
- [ ] ログイン中のユーザーだけ自分の行を読める/書けることを確認する。
- [x] Supabase未設定でもアプリが起動できるようにする。

最小リリースでは、正規化テーブルの `parts` / `exercises` / `workouts` などはまだ使わない。まず `cloud_backups.state_json` に `State` 全体を保存する。

### Phase 3: 認証UI

- [x] 設定画面に「クラウドバックアップ」リンクを追加する。
- [x] 未ログイン時は新規登録/ログイン画面へ遷移する。
- [x] ログイン後はバックアップ一覧画面へ遷移する。
- [x] ログイン処理を実装する。
- [x] ログアウト処理を実装する。
- [x] ログアウトしてもローカルデータは消さない。
- [x] ログイン中表示、メールアドレス、ログアウトをドロワーメニューへ表示する。
- [x] ドロワーメニュー下部にログイン状態を配置し、アプリバージョンは設定画面へ移動する。
- [x] ログイン状態の読み込み中・失敗時の表示を用意する。
- [x] 認証後に `profiles` と `devices` を作成または更新する。

ログインはバックアップ機能の入口であり、アプリ起動時の必須導線にはしない。

### Phase 4: クラウドバックアップ

- [x] 現在の `State` を `cloud_backups.state_json` に保存する処理を追加する。
- [x] バックアップ保存前にローカル保存をflushする。
- [x] 保存成功/失敗のトーストを追加する。
- [x] バックアップ一覧を取得する。
- [x] バックアップ日時、データ概要を表示する。
  - 例: 種目数、記録日数、最終記録日。
- [x] 世代数の上限を超えた古いバックアップを削除する。
- [x] 通信失敗時もローカル利用を継続できるようにする。

このPhaseでは「クラウドはバックアップ置き場」であり、通常操作の正本は引き続き `localStorage` とする。

### Phase 5: クラウド復元 / 機種変更対応

- [x] ログイン後にバックアップ一覧を表示する。
- [x] 復元前に現在のローカル `State` をJSONとして自動退避する。
- [x] ユーザー確認後、選択した `state_json` を `normalizeState` へ通す。
- [x] 正規化に成功した場合だけ `setState` でローカル全置換する。
- [x] 復元後、選択日・画面状態を安全な初期状態へ戻す。
- [x] 復元成功/失敗のトーストを追加する。
- [ ] 新端末で「ログイン → 最新バックアップを復元 → そのまま使える」流れを確認する。

復元は既存インポートと同じく全置換で扱う。最初のリリースでは、ローカルデータとクラウドデータの自動マージはしない。

### Phase 6: 検証・リリース前確認

- [ ] 未ログイン状態で従来どおり全機能が使えることを確認する。
- [ ] ネットワークなしでアプリが起動し、記録できることを確認する。
- [ ] ログイン、ログアウト、再ログインでローカルデータが消えないことを確認する。
- [ ] バックアップ作成後、別ブラウザまたは別端末相当の環境で復元できることを確認する。
- [ ] 壊れたバックアップJSONや古い形式のバックアップで復元が拒否/正規化されることを確認する。
- [ ] `npm run lint`、`npm run test`、`npm run build` を実行する。
- [ ] `docs/specification.md` に認証・バックアップ・復元仕様を反映する。

### Phase 7: 差分同期への拡張準備

バックアップ/復元が安定した後、必要に応じて着手する。

- [ ] `parts`、`exercises`、`workout_sessions`、`workouts`、`workout_sets` などの正規化テーブルを作成する。
- [ ] ローカル更新を行単位の変更ログとして記録する。
- [ ] `sync_states` で端末ごとの最終同期位置を管理する。
- [ ] `deleted_at` によるソフト削除へ寄せる。
- [ ] 行単位の `updated_at` / `client_mutation_id` を使った upsert を実装する。
- [ ] 同じ行の同時編集時の競合表示を設計する。
- [ ] クラウドから正規化データを `State` へ再構築する処理を追加する。

この段階に入るまでは、通常操作中にDBを直接正本にしない。これにより、実装範囲と不具合範囲を小さく保つ。

## 10. 実装前に決める必要がある事項

1. 認証方式:
   - 初回はメールアドレス・パスワード。将来的にGoogleログインを追加する。
2. バックアップ実行方式:
   - 手動のみか、自動バックアップも行うか。
3. バックアップ世代数:
   - 最新1件のみか、複数世代を残すか。
4. 復元時の扱い:
   - 復元前に現在のローカルデータを自動JSON退避するか。
5. Supabase未設定時の開発挙動:
   - バックアップ機能だけ無効にするか、起動時に設定不足を明示するか。
6. 差分同期の開始時期:
   - 初回リリースでは扱わず、バックアップ/復元安定後に別フェーズとするか。

## 11. 実装上の主なリスク

- 空文字を許すセット値を数値列へ変換する境界が未定義。
- 日付と時刻にタイムゾーンがなく、端末変更・海外利用時の意味が曖昧。
- 種目の改名時に過去スナップショットも変える現行挙動が、履歴保存の説明と完全には一致しない。
- 部位名が複数箇所へ文字列で重複し、削除・改名の整合性を取りにくい。
- `trainingDays` と `trainingPlans` は互換用データを含み、移行後も必要か判断が必要。
- インポートは全置換なので、クラウドデータとのマージ規則を別途設計する必要がある。
- 現在はユーザー概念がなく、既存端末データと認証ユーザーの紐付けが新しい責務になる。
- 複数端末同期を行う場合、端末ごとの未同期変更・削除済み行・同時編集の扱いが必要になる。
- 未ログイン利用を残すため、アプリ内には「ローカルのみ」「同期中」「同期済み」「同期失敗」の状態が増える。

## 12. 調査した主な実装

- `src/types.ts`
- `src/storage.ts`
- `src/storageNormalization.ts`
- `src/hooks/useFitLogCore.ts`
- `src/hooks/useBackup.ts`
- `src/hooks/useWorkoutActions.ts`
- `src/hooks/useExerciseActions.ts`
- `src/hooks/usePresetActions.ts`
- `src/hooks/usePartActions.ts`
- `src/hooks/goalAchievement.ts`
