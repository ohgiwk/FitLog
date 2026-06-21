import { MouseEvent, PointerEvent, ReactNode, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  HistoryIcon,
  PlusIcon,
  TrashIcon,
} from '../icons';
import {
  calcRm,
  formatStoredWeightInput,
  formatWeight,
  formatWeightForStorageInput,
  gripOptions,
  gripStyleOptions,
  intensityOptions,
  isRepsMeasurement,
  measurementUnit,
  number,
  weightUnitLabel,
} from '../utils';
import { IntensityIcon } from '../components/IntensityIcon';
import { RestTimer } from '../components/RestTimer';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { GripStyleType, GripType } from '../types';

/**
 * 種目詳細画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function useDetailScreenModel() {
  const { currentWorkout, state, actions } = useFitLogContext();
  const exercise = currentWorkout
    ? state.exercises.find((item) => item.id === currentWorkout.exerciseId)
    : undefined;

  return {
    workout: currentWorkout,
    exercise,
    weightUnit: state.weightUnit,
    readOnly: Boolean(currentWorkout && state.workoutEndTimes[currentWorkout.date]),
    onBack: () => actions.setScreen('home'),
    onOpenHistory: () => actions.setScreen('exerciseHistory'),
    onUpdateSet: actions.updateSet,
    onUpdateWorkoutNote: actions.updateWorkoutNote,
    onUpdateSetIntensity: actions.updateSetIntensity,
    onUpdateWorkoutGrip: actions.updateWorkoutGrip,
    onUpdateWorkoutGripStyle: actions.updateWorkoutGripStyle,
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

function WorkoutGripEditor({
  workout,
  exercise,
  readOnly,
  onUpdateGrip,
  onUpdateGripStyle,
}: {
  workout: NonNullable<ReturnType<typeof useDetailScreenModel>['workout']>;
  exercise: ReturnType<typeof useDetailScreenModel>['exercise'];
  readOnly: boolean;
  onUpdateGrip: (workoutId: string, grip?: GripType) => void;
  onUpdateGripStyle: (workoutId: string, gripStyle?: GripStyleType) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="workout-grip-editor" aria-label="グリップ">
      <button
        className="workout-grip-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>詳細記録</span>
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>
      {open && (
        <div className="workout-grip-fields">
          <label>
            <span>握りの向き</span>
            <select
              value={workout.grip ?? ''}
              disabled={readOnly}
              onChange={(event) =>
                onUpdateGrip(
                  workout.id,
                  event.target.value ? (event.target.value as GripType) : undefined,
                )
              }
            >
              <option value="">未選択</option>
              {workout.grip && !exercise?.availableGrips?.includes(workout.grip) && (
                <option value={workout.grip}>
                  {gripOptions.find((option) => option.value === workout.grip)?.label ??
                    workout.grip}
                </option>
              )}
              {gripOptions
                .filter((option) => exercise?.availableGrips?.includes(option.value))
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>握り方</span>
            <select
              value={workout.gripStyle ?? ''}
              disabled={readOnly}
              onChange={(event) =>
                onUpdateGripStyle(
                  workout.id,
                  event.target.value
                    ? (event.target.value as GripStyleType)
                    : undefined,
                )
              }
            >
              <option value="">未選択</option>
              {workout.gripStyle &&
                !exercise?.availableGripStyles?.includes(workout.gripStyle) && (
                  <option value={workout.gripStyle}>
                    {gripStyleOptions.find(
                      (option) => option.value === workout.gripStyle,
                    )?.label ?? workout.gripStyle}
                  </option>
                )}
              {gripStyleOptions
                .filter((option) => exercise?.availableGripStyles?.includes(option.value))
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
    </section>
  );
}

const setDeleteActionWidth = 72;

function SwipeableSetRow({
  children,
  open,
  readOnly,
  deleteLabel,
  onOpenChange,
  onDelete,
}: {
  children: ReactNode;
  open: boolean;
  readOnly: boolean;
  deleteLabel: string;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}) {
  const [dragOffset, setDragOffset] = useState(open ? -setDeleteActionWidth : 0);
  const [dragging, setDragging] = useState(false);
  const swipeStart = useRef<{
    x: number;
    y: number;
    offset: number;
    direction: 'pending' | 'horizontal' | 'vertical';
  } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    if (!dragging) setDragOffset(open ? -setDeleteActionWidth : 0);
  }, [dragging, open]);

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (readOnly || event.button !== 0) return;
    swipeStart.current = {
      x: event.clientX,
      y: event.clientY,
      offset: open ? -setDeleteActionWidth : 0,
      direction: 'pending',
    };
    setDragging(false);
  }

  function moveSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    if (!start) return;
    const diffX = event.clientX - start.x;
    const diffY = event.clientY - start.y;

    if (start.direction === 'pending' && Math.max(Math.abs(diffX), Math.abs(diffY)) > 8) {
      start.direction = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical';
      if (start.direction === 'horizontal') {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }
    }
    if (start.direction !== 'horizontal') return;

    event.preventDefault();
    setDragOffset(Math.max(-setDeleteActionWidth, Math.min(0, start.offset + diffX)));
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.direction !== 'horizontal') return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const finishOffset = Math.max(
      -setDeleteActionWidth,
      Math.min(0, start.offset + event.clientX - start.x),
    );
    const shouldOpen = finishOffset <= -setDeleteActionWidth / 2;
    suppressClick.current = true;
    setDragging(false);
    setDragOffset(shouldOpen ? -setDeleteActionWidth : 0);
    onOpenChange(shouldOpen);
    globalThis.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  }

  function cancelSwipe() {
    swipeStart.current = null;
    setDragging(false);
    setDragOffset(open ? -setDeleteActionWidth : 0);
  }

  function closeOnClick(event: MouseEvent<HTMLDivElement>) {
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!open) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOffset(0);
    onOpenChange(false);
  }

  return (
    <div className={`detail-swipe-row${readOnly ? ' readonly' : ''}`}>
      {!readOnly && (
        <button
          className="detail-set-delete"
          type="button"
          aria-label={deleteLabel}
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          onClick={onDelete}
        >
          <TrashIcon />
          <span>削除</span>
        </button>
      )}
      <div
        className={`detail-row${dragging ? ' dragging' : ''}`}
        style={{ transform: `translateX(${dragOffset}px)` }}
        onPointerDown={startSwipe}
        onPointerMove={moveSwipe}
        onPointerUp={finishSwipe}
        onPointerCancel={cancelSwipe}
        onClickCapture={closeOnClick}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * 種目詳細画面。各セットの重量・記録・強度の入力やレストタイマーを表示する
 */
export function DetailScreen() {
  const {
    workout,
    exercise,
    weightUnit,
    readOnly,
    onBack,
    onOpenHistory,
    onUpdateSet,
    onUpdateWorkoutNote,
    onUpdateSetIntensity,
    onUpdateWorkoutGrip,
    onUpdateWorkoutGripStyle,
    onDeleteSet,
    onAddSet,
    onUpdateExerciseGoal,
  } = useDetailScreenModel();
  const [openDeleteSetId, setOpenDeleteSetId] = useState<string | null>(null);
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
          <>
            <ExerciseGoalEditor
              exerciseId={exercise.id}
              measurementType={exercise.measurementType}
              goal={exercise.goal}
              weightUnit={weightUnit}
              readOnly={readOnly}
              onSave={onUpdateExerciseGoal}
            />
            <WorkoutGripEditor
              workout={workout}
              exercise={exercise}
              readOnly={readOnly}
              onUpdateGrip={onUpdateWorkoutGrip}
              onUpdateGripStyle={onUpdateWorkoutGripStyle}
            />
          </>
        )}
        <div className="detail-table">
          {workout.sets.map((set, index) => (
            <SwipeableSetRow
              key={set.id}
              open={openDeleteSetId === set.id}
              readOnly={readOnly}
              deleteLabel={`${index + 1}セット目を削除`}
              onOpenChange={(open) => setOpenDeleteSetId(open ? set.id : null)}
              onDelete={() => {
                setOpenDeleteSetId(null);
                onDeleteSet(set.id);
              }}
            >
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
            </SwipeableSetRow>
          ))}
          {!readOnly && (
            <button
              className="detail-add-set"
              type="button"
              aria-label="セットを追加"
              onClick={() => onAddSet(workout.id)}
            >
              <PlusIcon />
            </button>
          )}
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
      {!readOnly && <RestTimer />}
    </section>
  );
}
