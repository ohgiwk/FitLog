import { MeasurementType, WorkoutSet } from "../types";
import { calcRm, isRepsMeasurement, measurementUnit, number } from "../utils";

export function HomeSetRow({ set, index, measurementType }: { set: WorkoutSet; index: number; measurementType: MeasurementType }) {
  const weight = number(set.weight);
  const recordValue = number(set.recordValue);
  const isReps = isRepsMeasurement(measurementType);
  return (
    <tr>
      <td className="set-number">{index + 1}</td>
      <td className="weight">{weight ? <>{weight.toFixed(1)} <small>Kg</small></> : "自重"}</td>
      <td className="lbs">{weight ? `${(weight * 2.20462).toFixed(2)}Lbs` : "-"}</td>
      <td className="reps">{recordValue} <small>{measurementUnit(measurementType)}</small></td>
      <td className="rm">{isReps && weight ? `${calcRm(weight, recordValue)}Kg` : "-"}</td>
    </tr>
  );
}
