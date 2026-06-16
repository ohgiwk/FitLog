import { MeasurementType, WeightUnit, WorkoutSet } from '../types';
import {
  calcRm,
  formatWeight,
  isRepsMeasurement,
  measurementUnit,
  number,
  oppositeWeightUnit,
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
  const hasWeight = weight > 0;
  const hasRecordValue = recordValue > 0;
  const subUnit = oppositeWeightUnit(weightUnit);
  return (
    <tr>
      <td className="set-number">{index + 1}</td>
      <td className="weight">
        {hasWeight ? (
          <>
            {formatWeight(weight, weightUnit)} <small>{weightUnitLabel(weightUnit)}</small>
          </>
        ) : (
          '-'
        )}
      </td>
      <td className="lbs">
        {hasWeight ? `${formatWeight(weight, subUnit)}${weightUnitLabel(subUnit)}` : '-'}
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
