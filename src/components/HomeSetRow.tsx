import { MeasurementType, WorkoutSet } from "../types";
import { calcRm, isRepsMeasurement, measurementUnit, number } from "../utils";

export function HomeSetRow({ set, index, measurementType }: { set: WorkoutSet; index: number; measurementType: MeasurementType }) {
  const weight = number(set.weight);
  const recordValue = number(set.recordValue);
  const isReps = isRepsMeasurement(measurementType);
  const hasWeight = weight > 0;
  const hasRecordValue = recordValue > 0;
  return (
    <tr>
      <td className="set-number">{index + 1}</td>
      <td className="weight">{hasWeight ? <>{weight.toFixed(1)} <small>Kg</small></> : "-"}</td>
      <td className="lbs">{hasWeight ? `${(weight * 2.20462).toFixed(2)}Lbs` : "-"}</td>
      <td className="reps">{hasRecordValue ? <>{recordValue} <small>{measurementUnit(measurementType)}</small></> : "-"}</td>
      <td className="rm">{isReps && hasWeight && hasRecordValue ? `${calcRm(weight, recordValue)}Kg` : "-"}</td>
    </tr>
  );
}
