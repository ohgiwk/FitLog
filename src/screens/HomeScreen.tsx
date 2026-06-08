import { KeyboardEvent, MouseEvent, useState } from "react";
import { ChevronLeft, ChevronRight, PlusIcon, TrashIcon } from "../icons";
import { Preset, Workout } from "../types";
import { isRepsMeasurement, isUnstartedWorkout, number } from "../utils";
import { HomeSetRow } from "../components/HomeSetRow";

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

export function HomeScreen({ selectedDate, selectedWorkouts, selectedPlannedParts, presets, currentPreset, onMoveDate, onSelectPreset, onStartPreset, onOpenPresets, onOpenSelect, onOpenDetail, onDeleteWorkout }: {
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
  onDeleteWorkout: (workoutId: string) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
  const date = new Date(`${selectedDate}T00:00:00`);
  const dateLabel = `${selectedDate.replaceAll("-", "/")} (${weekdayLabels[date.getDay()]})`;
  const sets = selectedWorkouts.flatMap((workout) => workout.sets);
  const totalReps = selectedWorkouts.reduce((sum, workout) =>
    sum + (isRepsMeasurement(workout.measurementType) ? workout.sets.reduce((setSum, set) => setSum + number(set.recordValue), 0) : 0), 0);
  const totalSeconds = selectedWorkouts.reduce((sum, workout) =>
    sum + (workout.measurementType === "seconds" ? workout.sets.reduce((setSum, set) => setSum + number(set.recordValue), 0) : 0), 0);
  const totalVolume = selectedWorkouts.reduce((sum, workout) =>
    sum + (isRepsMeasurement(workout.measurementType) ? workout.sets.reduce((setSum, set) => setSum + number(set.weight) * number(set.recordValue), 0) : 0), 0);

  function openDetailFromKey(event: KeyboardEvent<HTMLElement>, workoutId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpenDetail(workoutId);
  }

  function requestDelete(event: MouseEvent<HTMLButtonElement>, workout: Workout) {
    event.stopPropagation();
    if (isUnstartedWorkout(workout)) {
      onDeleteWorkout(workout.id);
      return;
    }
    setDeleteTarget(workout);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    onDeleteWorkout(deleteTarget.id);
    setDeleteTarget(null);
  }

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
          selectedWorkouts.map((workout) => (
            <article className="exercise-card" key={workout.id} role="button" tabIndex={0} onClick={() => onOpenDetail(workout.id)} onKeyDown={(event) => openDetailFromKey(event, workout.id)}>
              <header className="exercise-head">
                <h2>{workout.part} - {workout.name}</h2>
                <button className="delete-workout" type="button" aria-label={`${workout.name}を削除`} onClick={(event) => requestDelete(event, workout)}><TrashIcon /></button>
              </header>
              <div className="exercise-body">
                <table className="set-table">
                  <thead><tr><th>セット</th><th>重さ</th><th></th><th>記録</th><th>RM</th></tr></thead>
                  <tbody>{workout.sets.map((set, setIndex) => <HomeSetRow key={set.id} set={set} index={setIndex} measurementType={workout.measurementType} />)}</tbody>
                </table>
                {isUnstartedWorkout(workout) && (
                  <div className="new-workout-overlay" aria-hidden="true">
                    <div className="new-workout-overlay-icon"><PlusIcon /></div>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
      <button className="fab" type="button" aria-label="種目を追加" onClick={onOpenSelect}><PlusIcon /></button>
      {deleteTarget && (
        <div className="dialog-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="workout-delete-title">
            <div className="confirm-title" id="workout-delete-title">記録を削除しますか？</div>
            <p>{deleteTarget.part} - {deleteTarget.name} の記録をこの日から削除します。</p>
            <div className="confirm-actions">
              <button className="small-outline" type="button" onClick={() => setDeleteTarget(null)}>キャンセル</button>
              <button className="danger-button" type="button" onClick={confirmDelete}>削除</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
