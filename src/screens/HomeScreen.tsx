import { ChevronDown, ChevronUp } from "../icons";
import { Preset, Workout } from "../types";
import { number } from "../utils";
import { HomeSetRow } from "../components/HomeSetRow";

export function HomeScreen({ selectedDate, selectedWorkouts, presets, currentPreset, onMoveDate, onSelectPreset, onStartPreset, onOpenPresets, onOpenSelect, onOpenDetail, onMoveWorkout, onAddSet }: {
  selectedDate: string;
  selectedWorkouts: Workout[];
  presets: Preset[];
  currentPreset: Preset | null;
  onMoveDate: (days: number) => void;
  onSelectPreset: (presetId: string) => void;
  onStartPreset: (presetId: string) => void;
  onOpenPresets: () => void;
  onOpenSelect: () => void;
  onOpenDetail: (workoutId: string) => void;
  onMoveWorkout: (workoutId: string, direction: number) => void;
  onAddSet: (workoutId: string) => void;
}) {
  const sets = selectedWorkouts.flatMap((workout) => workout.sets);

  return (
    <section className="screen active detail-screen">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="前の日" onClick={() => onMoveDate(-1)}>
            &lt;
          </button>
          <div className="bar-title">{selectedDate.replaceAll("-", "/")}</div>
          <button className="bar-btn right" type="button" aria-label="次の日" onClick={() => onMoveDate(1)}>
            &gt;
          </button>
        </div>
        <div className="stats">
          <div className="stat"><span>合計種目数</span><strong>{selectedWorkouts.length}</strong></div>
          <div className="stat"><span>合計セット数</span><strong>{sets.length}</strong></div>
          <div className="stat"><span>合計レップ数</span><strong>{sets.reduce((sum, set) => sum + number(set.reps), 0)}</strong></div>
          <div className="stat"><span>合計負荷量</span><strong>{Math.round(sets.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0))}</strong></div>
        </div>
      </header>
      <div className="preset-start">
        <select
          aria-label="プリセットを選択"
          disabled={!presets.length}
          value={currentPreset?.id || ""}
          onChange={(event) => onSelectPreset(event.target.value)}
        >
          {presets.length ? (
            presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)
          ) : (
            <option value="">プリセットなし</option>
          )}
        </select>
        <button className="small-primary" disabled={!currentPreset} type="button" onClick={() => onStartPreset(currentPreset?.id || "")}>開始</button>
        <button className="small-outline" type="button" onClick={onOpenPresets}>管理</button>
      </div>
      <div className="content">
        {!selectedWorkouts.length ? (
          <div className="empty"><div><strong>この日の種目はまだありません</strong><span>右下の＋から種目を選択して、詳細画面でセットを入力できます。</span></div></div>
        ) : (
          selectedWorkouts.map((workout, index) => (
            <article className="exercise-card" key={workout.id}>
              <header className="exercise-head">
                <h2><button className="title-open" type="button" onClick={() => onOpenDetail(workout.id)}>{workout.part} - {workout.name}</button></h2>
                <button className="chev" type="button" aria-label="上へ移動" disabled={index === 0} onClick={() => onMoveWorkout(workout.id, -1)}><ChevronUp /></button>
                <button className="chev" type="button" aria-label="下へ移動" disabled={index === selectedWorkouts.length - 1} onClick={() => onMoveWorkout(workout.id, 1)}><ChevronDown /></button>
              </header>
              <table className="set-table">
                <thead><tr><th>セット</th><th>重さ</th><th></th><th>回数</th><th>RM</th></tr></thead>
                <tbody>{workout.sets.map((set, setIndex) => <HomeSetRow key={set.id} set={set} index={setIndex} />)}</tbody>
              </table>
              <button className="add-set" type="button" aria-label="セットを追加" onClick={() => onAddSet(workout.id)}><span className="plus-muted">+</span></button>
            </article>
          ))
        )}
      </div>
      <button className="fab" type="button" aria-label="種目を追加" onClick={onOpenSelect}>+</button>
    </section>
  );
}
