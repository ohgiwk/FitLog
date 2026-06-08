import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, PlusIcon } from "../icons";
import { Preset, Workout } from "../types";
import { isRepsMeasurement, number } from "../utils";
import { HomeSetRow } from "../components/HomeSetRow";

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

export function HomeScreen({ selectedDate, selectedWorkouts, selectedPlannedParts, presets, currentPreset, onMoveDate, onSelectPreset, onStartPreset, onOpenPresets, onOpenSelect, onOpenDetail, onMoveWorkout, onAddSet }: {
  selectedDate: string;
  selectedWorkouts: Workout[];
  selectedPlannedParts: string[];
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
  const date = new Date(`${selectedDate}T00:00:00`);
  const dateLabel = `${selectedDate.replaceAll("-", "/")} (${weekdayLabels[date.getDay()]})`;
  const sets = selectedWorkouts.flatMap((workout) => workout.sets);
  const totalReps = selectedWorkouts.reduce((sum, workout) =>
    sum + (isRepsMeasurement(workout.measurementType) ? workout.sets.reduce((setSum, set) => setSum + number(set.recordValue), 0) : 0), 0);
  const totalSeconds = selectedWorkouts.reduce((sum, workout) =>
    sum + (workout.measurementType === "seconds" ? workout.sets.reduce((setSum, set) => setSum + number(set.recordValue), 0) : 0), 0);
  const totalVolume = selectedWorkouts.reduce((sum, workout) =>
    sum + (isRepsMeasurement(workout.measurementType) ? workout.sets.reduce((setSum, set) => setSum + number(set.weight) * number(set.recordValue), 0) : 0), 0);

  return (
    <section className="screen active detail-screen">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="前の日" onClick={() => onMoveDate(-1)}>
            <ChevronLeft />
          </button>
          <div className="bar-title">{dateLabel}</div>
          <button className="bar-btn right" type="button" aria-label="次の日" onClick={() => onMoveDate(1)}>
            <ChevronRight />
          </button>
        </div>
        <div className="stats">
          <div className="stat"><span>合計種目数</span><strong>{selectedWorkouts.length}</strong></div>
          <div className="stat"><span>合計セット数</span><strong>{sets.length}</strong></div>
          <div className="stat"><span>合計レップ数</span><strong>{totalReps}</strong></div>
          <div className="stat"><span>合計秒数</span><strong>{totalSeconds}</strong></div>
          <div className="stat"><span>合計負荷量</span><strong>{Math.round(totalVolume)}</strong></div>
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
      {!!selectedPlannedParts.length && (
        <div className="planned-day">
          <span>予定: {selectedPlannedParts.join(" / ")}</span>
        </div>
      )}
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
                <thead><tr><th>セット</th><th>重さ</th><th></th><th>記録</th><th>RM</th></tr></thead>
                <tbody>{workout.sets.map((set, setIndex) => <HomeSetRow key={set.id} set={set} index={setIndex} measurementType={workout.measurementType} />)}</tbody>
              </table>
              <button className="add-set" type="button" aria-label="セットを追加" onClick={() => onAddSet(workout.id)}><span className="plus-muted"><PlusIcon /></span></button>
            </article>
          ))
        )}
      </div>
      <button className="fab" type="button" aria-label="種目を追加" onClick={onOpenSelect}><PlusIcon /></button>
    </section>
  );
}
