import { ChevronLeft, HistoryIcon, PlusIcon, TrashIcon } from '../icons';
import { SetIntensity, Workout } from '../types';
import { calcRm, intensityOptions, isRepsMeasurement, measurementUnit, number } from '../utils';
import { LastRecord } from '../components/LastRecord';
import { IntensityIcon } from '../components/IntensityIcon';
import { RestTimer } from '../components/RestTimer';

/**
 * 種目詳細画面。各セットの重量・記録・強度の入力やレストタイマーを表示する
 */
export function DetailScreen({
  workout,
  selectedDate,
  workouts,
  onBack,
  onOpenHistory,
  onUpdateSet,
  onUpdateSetIntensity,
  onDeleteSet,
  onAddSet,
}: {
  workout: Workout;
  selectedDate: string;
  workouts: Workout[];
  onBack: () => void;
  onOpenHistory: () => void;
  onUpdateSet: (setId: string, field: 'weight' | 'recordValue' | 'note', value: string) => void;
  onUpdateSetIntensity: (setId: string, intensity?: SetIntensity) => void;
  onDeleteSet: (setId: string) => void;
  onAddSet: (workoutId: string) => void;
}) {
  const isReps = isRepsMeasurement(workout.measurementType);
  const unit = measurementUnit(workout.measurementType);
  return (
    <section className="screen active">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>
            <ChevronLeft />
          </button>
          <div className="bar-title">{workout.name}</div>
          <button className="history-btn" type="button" aria-label="履歴" onClick={onOpenHistory}>
            <HistoryIcon />
          </button>
        </div>
      </header>
      <div className="content">
        <LastRecord workout={workout} selectedDate={selectedDate} workouts={workouts} />
        <div className="detail-table">
          {workout.sets.map((set, index) => (
            <div className="detail-row" key={set.id}>
              <div className="num">{index + 1}</div>
              <label className="field">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  inputMode="decimal"
                  value={set.weight}
                  onChange={(event) => onUpdateSet(set.id, 'weight', event.target.value)}
                />
                <span className="unit">kg</span>
              </label>
              <label className="field">
                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="numeric"
                  value={set.recordValue}
                  onChange={(event) => onUpdateSet(set.id, 'recordValue', event.target.value)}
                />
                <span className="unit">{unit}</span>
              </label>
              <div className="rm-value">
                {isReps ? `${calcRm(number(set.weight), number(set.recordValue))} kg` : '-'}
              </div>
              <button
                className="check"
                type="button"
                aria-label="セット削除"
                onClick={() => onDeleteSet(set.id)}
              >
                <TrashIcon />
              </button>
              <div className="intensity-picker" aria-label={`${index + 1}セット目の強度`}>
                {intensityOptions.map((option) => (
                  <button
                    className={`intensity-button intensity-button-${option.value}${set.intensity === option.value ? ' active' : ''}`}
                    key={option.value}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={set.intensity === option.value}
                    onClick={() =>
                      onUpdateSetIntensity(
                        set.id,
                        set.intensity === option.value ? undefined : option.value,
                      )
                    }
                  >
                    <IntensityIcon intensity={option.value} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <RestTimer />
      <button
        className="fab"
        type="button"
        aria-label="セットを追加"
        onClick={() => onAddSet(workout.id)}
      >
        <PlusIcon />
      </button>
    </section>
  );
}
