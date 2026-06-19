import { useEffect, useState } from 'react';
import { ChevronLeft, HistoryIcon, PlusIcon, TrashIcon } from '../icons';
import {
  calcRm,
  formatStoredWeightInput,
  formatWeight,
  formatWeightForStorageInput,
  intensityOptions,
  isRepsMeasurement,
  measurementUnit,
  number,
  weightUnitLabel,
} from '../utils';
import { LastRecord } from '../components/LastRecord';
import { IntensityIcon } from '../components/IntensityIcon';
import { RestTimer } from '../components/RestTimer';
import { useFitLogContext } from '../hooks/FitLogContext';

/**
 * 種目詳細画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function useDetailScreenModel() {
  const { currentWorkout, selectedDate, state, actions } = useFitLogContext();
  const exercise = currentWorkout
    ? state.exercises.find((item) => item.id === currentWorkout.exerciseId)
    : undefined;

  return {
    workout: currentWorkout,
    exercise,
    selectedDate,
    workouts: state.workouts,
    weightUnit: state.weightUnit,
    readOnly: Boolean(currentWorkout && state.workoutEndTimes[currentWorkout.date]),
    onBack: () => actions.setScreen('home'),
    onOpenHistory: () => actions.setScreen('exerciseHistory'),
    onUpdateSet: actions.updateSet,
    onUpdateWorkoutNote: actions.updateWorkoutNote,
    onUpdateSetIntensity: actions.updateSetIntensity,
    onDeleteSet: actions.deleteSet,
    onAddSet: actions.addSet,
    onUpdateExerciseGoal: actions.updateExerciseGoal,
  };
}

function ExerciseGoalEditor({
  exerciseId,
  measurementType,
  goal,
  weightUnit,
  readOnly,
  onSave,
}: {
  exerciseId: string;
  measurementType: 'reps' | 'seconds';
  goal?: { weight: number; recordValue: number };
  weightUnit: 'kg' | 'lbs';
  readOnly: boolean;
  onSave: (exerciseId: string, goal?: { weight: number; recordValue: number }) => void;
}) {
  const [weight, setWeight] = useState('');
  const [recordValue, setRecordValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setWeight(goal ? formatStoredWeightInput(goal.weight, weightUnit) : '');
    setRecordValue(goal ? String(goal.recordValue) : '');
    setIsEditing(false);
  }, [goal, weightUnit]);

  const canEdit = !readOnly && (!goal || isEditing);
  const storedWeight = formatWeightForStorageInput(weight, weightUnit);
  const canSave =
    weight.trim() !== '' &&
    recordValue.trim() !== '' &&
    Number(storedWeight) >= 0 &&
    Number(recordValue) > 0;

  return (
    <section className="exercise-goal" aria-labelledby="exercise-goal-title">
      <div className="exercise-goal-heading">
        <div>
          <span className="exercise-goal-kicker">CURRENT GOAL</span>
          <h2 id="exercise-goal-title">現在の目標</h2>
        </div>
        {!readOnly && goal && !isEditing && (
          <button className="goal-edit-button" type="button" onClick={() => setIsEditing(true)}>
            編集
          </button>
        )}
      </div>
      <div className={`exercise-goal-form${canEdit ? '' : ' readonly'}`}>
        <label>
          <span>重量</span>
          <div className="goal-input">
            <input
              type="number"
              min="0"
              step={weightUnit === 'lbs' ? '1' : '0.5'}
              inputMode="decimal"
              value={weight}
              readOnly={!canEdit}
              onChange={(event) => setWeight(event.target.value)}
            />
            <span>{weightUnitLabel(weightUnit)}</span>
          </div>
        </label>
        <label>
          <span>{measurementType === 'seconds' ? '秒数' : '回数'}</span>
          <div className="goal-input">
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={recordValue}
              readOnly={!canEdit}
              onChange={(event) => setRecordValue(event.target.value)}
            />
            <span>{measurementUnit(measurementType)}</span>
          </div>
        </label>
        {canEdit && (
          <div className={`goal-actions${goal ? ' editing' : ''}`}>
            {goal && (
              <button
                className="goal-delete-button"
                type="button"
                onClick={() => onSave(exerciseId, undefined)}
              >
                削除
              </button>
            )}
            <button
              className="goal-save-button"
              type="button"
              disabled={!canSave}
              onClick={() =>
                onSave(exerciseId, {
                  weight: number(storedWeight),
                  recordValue: number(recordValue),
                })
              }
            >
              {goal ? '更新' : '設定'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * 種目詳細画面。各セットの重量・記録・強度の入力やレストタイマーを表示する
 */
export function DetailScreen() {
  const {
    workout,
    exercise,
    selectedDate,
    workouts,
    weightUnit,
    readOnly,
    onBack,
    onOpenHistory,
    onUpdateSet,
    onUpdateWorkoutNote,
    onUpdateSetIntensity,
    onDeleteSet,
    onAddSet,
    onUpdateExerciseGoal,
  } = useDetailScreenModel();
  if (!workout) return null;
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
        {exercise && (
          <ExerciseGoalEditor
            exerciseId={exercise.id}
            measurementType={exercise.measurementType}
            goal={exercise.goal}
            weightUnit={weightUnit}
            readOnly={readOnly}
            onSave={onUpdateExerciseGoal}
          />
        )}
        <LastRecord
          workout={workout}
          selectedDate={selectedDate}
          workouts={workouts}
          weightUnit={weightUnit}
        />
        <div className="detail-table">
          {workout.sets.map((set, index) => (
            <div className="detail-row" key={set.id}>
              <div className="num">{index + 1}</div>
              <label className="field">
                <input
                  type="number"
                  step={weightUnit === 'lbs' ? '1' : '0.5'}
                  min="0"
                  inputMode="decimal"
                  readOnly={readOnly}
                  value={formatStoredWeightInput(set.weight, weightUnit)}
                  onChange={(event) =>
                    onUpdateSet(
                      set.id,
                      'weight',
                      formatWeightForStorageInput(event.target.value, weightUnit),
                    )
                  }
                />
                <span className="unit">{weightUnitLabel(weightUnit)}</span>
              </label>
              <label className="field">
                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="numeric"
                  readOnly={readOnly}
                  value={set.recordValue}
                  onChange={(event) => onUpdateSet(set.id, 'recordValue', event.target.value)}
                />
                <span className="unit">{unit}</span>
              </label>
              <div className="rm-value">
                {isReps
                  ? `${formatWeight(
                      calcRm(number(set.weight), number(set.recordValue)),
                      weightUnit,
                    )} ${weightUnitLabel(weightUnit)}`
                  : '-'}
              </div>
              {!readOnly && (
                <button
                  className="check"
                  type="button"
                  aria-label="セット削除"
                  onClick={() => onDeleteSet(set.id)}
                >
                  <TrashIcon />
                </button>
              )}
              <div className="intensity-picker" aria-label={`${index + 1}セット目の強度`}>
                {intensityOptions.map((option) => (
                  <button
                    className={`intensity-button intensity-button-${option.value}${set.intensity === option.value ? ' active' : ''}`}
                    key={option.value}
                    type="button"
                    disabled={readOnly}
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
        <label className="workout-note">
          <span>メモ</span>
          <textarea
            maxLength={1000}
            placeholder="この種目のメモを入力"
            rows={5}
            readOnly={readOnly}
            value={workout.note}
            onChange={(event) => onUpdateWorkoutNote(workout.id, event.target.value)}
          />
        </label>
      </div>
      {!readOnly && (
        <>
          <RestTimer />
          <button
            className="fab"
            type="button"
            aria-label="セットを追加"
            onClick={() => onAddSet(workout.id)}
          >
            <PlusIcon />
          </button>
        </>
      )}
    </section>
  );
}
