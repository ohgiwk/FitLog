import { Workout } from "../types";
import { formatWeight, measurementUnit, number } from "../utils";

export function LastRecord({ workout, selectedDate, workouts }: { workout: Workout; selectedDate: string; workouts: Workout[] }) {
  const lastRecord = workouts
    .filter((item) => item.exerciseId === workout.exerciseId && item.date < selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!lastRecord) return null;
  return (
    <div className="detail-summary">
      <strong>Last Record : {lastRecord.date.replaceAll("-", "/")}</strong>
      {lastRecord.sets.map((set, index) => (
        <div key={set.id}>{index + 1}　{formatWeight(set.weight)} kg ×　{number(set.recordValue)} {measurementUnit(lastRecord.measurementType)}</div>
      ))}
    </div>
  );
}
