import { MeasurementType, WeightUnit, WorkoutSet } from '../types';
import {
  calcRm,
  formatWeight,
  isBlank,
  isRepsMeasurement,
  measurementUnit,
  number,
  weightUnitLabel,
} from '../utils';

export function HomeSetRow({
  set,
  index,
  measurementType,
  weightUnit,
}: {
  set: WorkoutSet;
  index: number;
  measurementType: MeasurementType;
  weightUnit: WeightUnit;
}) {
  const weight = number(set.weight);
  const recordValue = number(set.recordValue);
  const isReps = isRepsMeasurement(measurementType);
  const hasWeightInput = !isBlank(set.weight);
  const hasWeight = weight > 0;
  const hasRecordValue = recordValue > 0;
  return (
    <tr>
      <td className="set-number">{index + 1}</td>
      <td className="weight">
        {hasWeight ? (
          <>
            {formatWeight(weight, weightUnit)} <small>{weightUnitLabel(weightUnit)}</small>
          </>
        ) : hasWeightInput ? (
          '自重'
        ) : (
          '-'
        )}
      </td>
      <td className="reps">
        {hasRecordValue ? (
          <>
            {recordValue} <small>{measurementUnit(measurementType)}</small>
          </>
        ) : (
          '-'
        )}
      </td>
      <td className="rm">
        {isReps && hasWeight && hasRecordValue
          ? `${formatWeight(calcRm(weight, recordValue), weightUnit)}${weightUnitLabel(weightUnit)}`
          : '-'}
      </td>
    </tr>
  );
}
