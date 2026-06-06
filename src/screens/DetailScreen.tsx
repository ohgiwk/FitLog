import { HistoryIcon, TrashIcon } from "../icons";
import { Workout } from "../types";
import { calcRm, isRepsMeasurement, measurementUnit, number } from "../utils";
import { LastRecord } from "../components/LastRecord";

export function DetailScreen({ workout, selectedDate, workouts, onBack, onOpenHistory, onUpdateSet, onDeleteSet, onAddSet }: {
  workout: Workout;
  selectedDate: string;
  workouts: Workout[];
  onBack: () => void;
  onOpenHistory: () => void;
  onUpdateSet: (setId: string, field: "weight" | "recordValue", value: string) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: (workoutId: string) => void;
}) {
  const isReps = isRepsMeasurement(workout.measurementType);
  const unit = measurementUnit(workout.measurementType);
  return (
    <section className="screen active">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" onClick={onBack}>Back</button>
          <div className="bar-title">{workout.name}</div>
          <button className="history-btn" type="button" aria-label="履歴" onClick={onOpenHistory}><HistoryIcon /></button>
        </div>
      </header>
      <div className="content">
        <LastRecord workout={workout} selectedDate={selectedDate} workouts={workouts} />
        <div className="detail-table">
          {workout.sets.map((set, index) => (
            <div className="detail-row" key={set.id}>
              <div className="num">{index + 1}</div>
              <label className="field"><input type="number" step="0.5" min="0" inputMode="decimal" value={set.weight} onChange={(event) => onUpdateSet(set.id, "weight", event.target.value)} /><span className="unit">kg</span></label>
              <label className="field"><input type="number" step="1" min="0" inputMode="numeric" value={set.recordValue} onChange={(event) => onUpdateSet(set.id, "recordValue", event.target.value)} /><span className="unit">{unit}</span></label>
              <div className="rm-value">{isReps ? `${calcRm(number(set.weight), number(set.recordValue))} kg` : "-"}</div>
              <button className="check" type="button" aria-label="セット削除" onClick={() => onDeleteSet(set.id)}><TrashIcon /></button>
              <div className="note">メモ</div>
            </div>
          ))}
        </div>
      </div>
      <button className="fab" type="button" aria-label="セットを追加" onClick={() => onAddSet(workout.id)}>+</button>
    </section>
  );
}
