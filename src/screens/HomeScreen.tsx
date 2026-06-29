import { KeyboardEvent, MouseEvent, useEffect, useState } from 'react';
import { PlusIcon, TrashIcon } from '../icons';
import { Workout } from '../types';
import {
  calculateWorkoutDurationMinutes,
  formatWorkoutDuration,
  formatWorkoutTime,
  isRecordedSet,
  isUnstartedWorkout,
} from '../utils';
import { HomeSetRow } from '../components/HomeSetRow';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { HomeCalendar } from '../components/HomeCalendar';

type WorkoutSummary = {
  startTime: string;
  endTime: string;
  duration: string;
  exerciseCount: number;
  setCount: number;
};

const newPresetOptionValue = '__new_preset__';

/**
 * ホーム画面が必要とする state・派生値・操作を Context から組み立てる view-model フック
 */
function useHomeScreenModel() {
  const {
    selectedDate,
    state,
    selectedWorkouts,
    selectedScheduledPresets,
    currentPreset,
    partColors,
    actions,
  } = useFitLogContext();

  return {
    selectedDate,
    workouts: state.workouts,
    selectedWorkouts,
    selectedScheduledPresets,
    presets: state.presets,
    currentPreset,
    partColors,
    weightUnit: state.weightUnit,
    workoutStartTime: state.workoutStartTimes[selectedDate],
    workoutEndTime: state.workoutEndTimes[selectedDate],
    /**
     * 日付を選択し、対象日のホーム内容へ移動する
     */
    onSelectDate: (date: string) => {
      actions.selectDate(date);
      actions.setCurrentWorkoutId(null);
      actions.setScreen('home');
    },
    onSelectPreset: actions.selectPreset,
    onEndWorkoutDay: actions.endWorkoutDay,
    onResumeWorkoutDay: actions.resumeWorkoutDay,
    onStartPreset: actions.startPreset,
    onCreatePresetDraftForStart: actions.createPresetDraftForStart,
    onOpenSelect: () => actions.setScreen('select'),
    onOpenTrainingMenu: () => actions.setScreen('trainingMenu'),
    onEditPresetForStart: actions.editPresetForStart,
    onOpenAnalysis: () => actions.setScreen('analysis'),
    onOpenSettings: () => actions.setScreen('settings'),
    onOpenGoalAchievements: () => actions.setScreen('goalAchievements'),
    onOpenDetail: actions.openWorkoutDetail,
    onDeleteWorkout: actions.deleteWorkout,
    cloud: actions.cloud,
  };
}

/**
 * ホーム画面。選択日のトレーニング一覧・集計・プリセット開始・カレンダーを表示する
 */
export function HomeScreen() {
  const {
    selectedDate,
    workouts,
    selectedWorkouts,
    selectedScheduledPresets,
    presets,
    currentPreset,
    partColors,
    weightUnit,
    workoutStartTime,
    workoutEndTime,
    onSelectDate,
    onSelectPreset,
    onEndWorkoutDay,
    onResumeWorkoutDay,
    onStartPreset,
    onCreatePresetDraftForStart,
    onOpenSelect,
    onOpenTrainingMenu,
    onEditPresetForStart,
    onOpenAnalysis,
    onOpenSettings,
    onOpenGoalAchievements,
    onOpenDetail,
    onDeleteWorkout,
    cloud,
  } = useHomeScreenModel();
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
  const [finishConfirmationOpen, setFinishConfirmationOpen] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary | null>(null);
  const [selectedPresetValue, setSelectedPresetValue] = useState(
    currentPreset?.id || newPresetOptionValue,
  );
  const isNewPresetSelected = selectedPresetValue === newPresetOptionValue;
  const selectedPreset = presets.find((preset) => preset.id === selectedPresetValue) || null;
  const currentPresetIsEmpty = !!selectedPreset && selectedPreset.exerciseIds.length === 0;

  useEffect(() => {
    setSelectedPresetValue(currentPreset?.id || newPresetOptionValue);
  }, [currentPreset?.id]);

  /**
   * キーボード操作(Enter/Space)で種目の詳細画面を開く
   */
  function openDetailFromKey(event: KeyboardEvent<HTMLElement>, workoutId: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpenDetail(workoutId);
  }

  /**
   * 削除を要求する。未記録の種目は確認なしで削除する
   */
  function requestDelete(event: MouseEvent<HTMLButtonElement>, workout: Workout) {
    event.stopPropagation();
    if (isUnstartedWorkout(workout)) {
      onDeleteWorkout(workout.id);
      return;
    }
    setDeleteTarget(workout);
  }

  /**
   * 確認ダイアログで選んだ種目を削除する
   */
  function confirmDelete() {
    if (!deleteTarget) return;
    onDeleteWorkout(deleteTarget.id);
    setDeleteTarget(null);
  }

  /**
   * 指定した終了時刻から実施内容のサマリーを作り、ダイアログへ表示する
   */
  function showWorkoutSummary(endTime: string) {
    if (!workoutStartTime) return;
    const recordedWorkouts = selectedWorkouts.filter((workout) => workout.sets.some(isRecordedSet));
    setWorkoutSummary({
      startTime: formatWorkoutTime(workoutStartTime),
      endTime: formatWorkoutTime(endTime),
      duration: formatWorkoutDuration(calculateWorkoutDurationMinutes(workoutStartTime, endTime)),
      exerciseCount: recordedWorkouts.length,
      setCount: recordedWorkouts.reduce(
        (total, workout) => total + workout.sets.filter(isRecordedSet).length,
        0,
      ),
    });
  }

  /**
   * 終了時刻を保存し、実施内容のサマリーをダイアログへ表示する
   */
  function finishWorkout(removeUnstartedWorkouts = false) {
    const endTime = onEndWorkoutDay(removeUnstartedWorkouts);
    if (!endTime) return;
    showWorkoutSummary(endTime);
  }

  /**
   * 未開始種目がある場合は確認し、無ければそのままトレーニングを終了する
   */
  function requestFinishWorkout() {
    if (selectedWorkouts.some(isUnstartedWorkout)) {
      setFinishConfirmationOpen(true);
      return;
    }
    finishWorkout();
  }

  /**
   * 未開始種目が残っていることを了承してトレーニングを終了する
   */
  function confirmFinishWorkout() {
    setFinishConfirmationOpen(false);
    finishWorkout(true);
  }

  return (
    <section
      className={`screen active detail-screen ${
        !selectedWorkouts.length && !workoutEndTime ? 'workout-start-ready' : ''
      }`}
    >
      <HomeCalendar
        selectedDate={selectedDate}
        workouts={workouts}
        onSelectDate={onSelectDate}
        onOpenTrainingMenu={onOpenTrainingMenu}
        onOpenAnalysis={onOpenAnalysis}
        onOpenSettings={onOpenSettings}
        onOpenGoalAchievements={onOpenGoalAchievements}
        cloud={cloud}
      />
      {!selectedWorkouts.length && !workoutEndTime && (
        <div className="workout-start-area">
          <section className="workout-start-panel" aria-labelledby="workout-menu-start-title">
            <div className="workout-start-section">
              <h2 id="workout-menu-start-title">トレーニングを開始</h2>
              {!!selectedScheduledPresets.length && (
                <span className="scheduled-menu-label">
                  今日の予定: {selectedScheduledPresets.map((preset) => preset.name).join(' / ')}
                </span>
              )}
              <select
                aria-label="トレーニングメニューを選択"
                value={selectedPresetValue}
                onChange={(event) => {
                  const presetId = event.target.value;
                  setSelectedPresetValue(presetId);
                  if (presetId !== newPresetOptionValue) onSelectPreset(presetId);
                }}
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
                <option value={newPresetOptionValue}>[新規作成]</option>
              </select>
              <button
                className="primary workout-start-primary"
                type="button"
                onClick={() =>
                  isNewPresetSelected
                    ? onCreatePresetDraftForStart()
                    : currentPresetIsEmpty
                      ? onEditPresetForStart(selectedPreset?.id || '')
                      : onStartPreset(selectedPreset?.id || '')
                }
              >
                {isNewPresetSelected || currentPresetIsEmpty
                  ? 'トレーニングメニューを作成する'
                  : 'トレーニングメニューから開始'}
              </button>
            </div>
            <div className="workout-start-divider">
              <span>または</span>
            </div>
            <div className="workout-start-section">
              <button className="workout-select-start-button" type="button" onClick={onOpenSelect}>
                種目を選んで開始
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="content">
        {selectedWorkouts.map((workout) => (
          <article
            className="exercise-card"
            key={workout.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenDetail(workout.id)}
            onKeyDown={(event) => openDetailFromKey(event, workout.id)}
          >
            <header
              className="exercise-head"
              style={{ borderLeftColor: partColors.get(workout.part) }}
            >
              <h2>
                {workout.part} - {workout.name}
              </h2>
              {!workoutEndTime && (
                <button
                  className="delete-workout"
                  type="button"
                  aria-label={`${workout.name}を削除`}
                  onClick={(event) => requestDelete(event, workout)}
                >
                  <TrashIcon />
                </button>
              )}
            </header>
            <div className="exercise-body">
              <table className="set-table">
                <thead>
                  <tr>
                    <th>セット</th>
                    <th>重さ</th>
                    <th>記録</th>
                    <th>RM</th>
                  </tr>
                </thead>
                <tbody>
                  {workout.sets.map((set, setIndex) => (
                    <HomeSetRow
                      key={set.id}
                      set={set}
                      index={setIndex}
                      measurementType={workout.measurementType}
                      weightUnit={weightUnit}
                    />
                  ))}
                </tbody>
              </table>
              {!workoutEndTime && isUnstartedWorkout(workout) && (
                <div className="new-workout-overlay" aria-hidden="true">
                  <div className="new-workout-overlay-icon">
                    <PlusIcon />
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
        {workoutStartTime && !workoutEndTime && !!selectedWorkouts.length && (
          <button
            className="primary workout-action-button"
            type="button"
            onClick={requestFinishWorkout}
          >
            トレーニングを終了
          </button>
        )}
        {workoutStartTime && workoutEndTime && (
          <div className="workout-completed-actions">
            <button
              className="workout-action-button workout-summary-button"
              type="button"
              onClick={() => showWorkoutSummary(workoutEndTime)}
            >
              トレーニング結果を見る
            </button>
            <button className="resume-workout-button" type="button" onClick={onResumeWorkoutDay}>
              再開
            </button>
          </div>
        )}
      </div>
      {deleteTarget && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workout-delete-title"
          >
            <div className="confirm-title" id="workout-delete-title">
              記録を削除しますか？
            </div>
            <p>
              {deleteTarget.part} - {deleteTarget.name} の記録をこの日から削除します。
            </p>
            <div className="confirm-actions">
              <button className="small-outline" type="button" onClick={() => setDeleteTarget(null)}>
                キャンセル
              </button>
              <button className="danger-button" type="button" onClick={confirmDelete}>
                削除
              </button>
            </div>
          </div>
        </div>
      )}
      {finishConfirmationOpen && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workout-finish-confirm-title"
          >
            <div className="confirm-title" id="workout-finish-confirm-title">
              トレーニングを終了しますか？
            </div>
            <p>
              未開始の種目が
              {selectedWorkouts.filter(isUnstartedWorkout).length}
              種目あります。このまま終了しても記録には含まれません。
            </p>
            <div className="confirm-actions">
              <button
                className="small-outline"
                type="button"
                onClick={() => setFinishConfirmationOpen(false)}
              >
                キャンセル
              </button>
              <button className="danger-button" type="button" onClick={confirmFinishWorkout}>
                終了する
              </button>
            </div>
          </div>
        </div>
      )}
      {workoutSummary && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirm-dialog workout-summary-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workout-summary-title"
          >
            <div className="confirm-title" id="workout-summary-title">
              お疲れ様でした！
            </div>
            <div className="workout-summary-stats">
              <div>
                <span>開始時間</span>
                <strong>{workoutSummary.startTime}</strong>
              </div>
              <div>
                <span>終了時間</span>
                <strong>{workoutSummary.endTime}</strong>
              </div>
              <div>
                <span>トレーニング時間</span>
                <strong>{workoutSummary.duration}</strong>
              </div>
              <div>
                <span>実施した種目数</span>
                <strong>{workoutSummary.exerciseCount}種目</strong>
              </div>
              <div>
                <span>合計セット数</span>
                <strong>{workoutSummary.setCount}セット</strong>
              </div>
            </div>
            <button className="primary" type="button" onClick={() => setWorkoutSummary(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
