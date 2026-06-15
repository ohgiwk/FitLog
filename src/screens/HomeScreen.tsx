import { KeyboardEvent, MouseEvent, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, PlusIcon, TrashIcon } from '../icons';
import { Workout } from '../types';
import {
  calendarCells,
  isRepsMeasurement,
  isUnstartedWorkout,
  localDate,
  number,
  parseDate,
} from '../utils';
import { HomeSetRow } from '../components/HomeSetRow';
import { useFitLogContext } from '../hooks/FitLogContext';
import { appVersion } from '../version';

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * ホーム画面が必要とする state・派生値・操作を Context から組み立てる view-model フック
 */
function useHomeScreenModel() {
  const { selectedDate, state, selectedWorkouts, selectedPlannedParts, currentPreset, actions } =
    useFitLogContext();

  return {
    selectedDate,
    workouts: state.workouts,
    workoutStartTime: state.workoutStartTimes[selectedDate],
    selectedWorkouts,
    selectedPlannedParts,
    presets: state.presets,
    currentPreset,
    onMoveDate: actions.moveDate,
    /**
     * 日付を選択し、開いていた種目詳細の選択を解除する
     */
    onSelectDate: (date: string) => {
      actions.selectDate(date);
      actions.setCurrentWorkoutId(null);
    },
    onSelectPreset: actions.selectPreset,
    onStartWorkoutDay: actions.startWorkoutDay,
    onStartPreset: actions.startPreset,
    onOpenPresets: () => actions.setScreen('preset'),
    onOpenSelect: () => actions.setScreen('select'),
    onOpenDetail: actions.openWorkoutDetail,
    onDeleteWorkout: actions.deleteWorkout,
  };
}

/**
 * ホーム画面。選択日のトレーニング一覧・集計・プリセット開始・カレンダーを表示する
 */
export function HomeScreen() {
  const {
    selectedDate,
    workouts,
    workoutStartTime,
    selectedWorkouts,
    selectedPlannedParts,
    presets,
    currentPreset,
    onMoveDate,
    onSelectDate,
    onSelectPreset,
    onStartWorkoutDay,
    onStartPreset,
    onOpenPresets,
    onOpenSelect,
    onOpenDetail,
    onDeleteWorkout,
  } = useHomeScreenModel();
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => parseDate(selectedDate));
  const date = new Date(`${selectedDate}T00:00:00`);
  const dateLabel = `${selectedDate.replaceAll('-', '/')} (${weekdayLabels[date.getDay()]})`;
  const sets = selectedWorkouts.flatMap((workout) => workout.sets);
  const calendarYear = calendarMonthDate.getFullYear();
  const calendarMonth = calendarMonthDate.getMonth();
  const trainedDates = useMemo(() => new Set(workouts.map((workout) => workout.date)), [workouts]);
  const calendarDays = useMemo(
    () => calendarCells(calendarYear, calendarMonth),
    [calendarMonth, calendarYear],
  );
  const totalReps = selectedWorkouts.reduce(
    (sum, workout) =>
      sum +
      (isRepsMeasurement(workout.measurementType)
        ? workout.sets.reduce((setSum, set) => setSum + number(set.recordValue), 0)
        : 0),
    0,
  );
  const totalSeconds = selectedWorkouts.reduce(
    (sum, workout) =>
      sum +
      (workout.measurementType === 'seconds'
        ? workout.sets.reduce((setSum, set) => setSum + number(set.recordValue), 0)
        : 0),
    0,
  );
  const totalVolume = selectedWorkouts.reduce(
    (sum, workout) =>
      sum +
      (isRepsMeasurement(workout.measurementType)
        ? workout.sets.reduce(
            (setSum, set) => setSum + number(set.weight) * number(set.recordValue),
            0,
          )
        : 0),
    0,
  );

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
   * カレンダーダイアログを選択日の月で開く
   */
  function openCalendarDialog() {
    setCalendarMonthDate(parseDate(selectedDate));
    setCalendarOpen(true);
  }

  /**
   * カレンダーダイアログを閉じる
   */
  function closeCalendarDialog() {
    setCalendarOpen(false);
  }

  /**
   * カレンダーで日付を選択し、ダイアログを閉じる
   */
  function selectCalendarDate(nextDate: string) {
    onSelectDate(nextDate);
    setCalendarOpen(false);
  }

  /**
   * カレンダーの表示月を前後に動かす
   */
  function moveCalendarMonth(delta: number) {
    const next = new Date(calendarMonthDate);
    next.setMonth(next.getMonth() + delta, 1);
    setCalendarMonthDate(next);
  }

  /**
   * 本日へジャンプして選択し、カレンダーを閉じる
   */
  function jumpToToday() {
    const today = localDate(new Date());
    onSelectDate(today);
    setCalendarMonthDate(parseDate(today));
    setCalendarOpen(false);
  }

  return (
    <section className="screen active detail-screen">
      <header className="topbar">
        <div className="bar-row">
          <button
            className="bar-btn"
            type="button"
            aria-label="前の日"
            onClick={() => onMoveDate(-1)}
          >
            <ChevronLeft />
          </button>
          <button className="bar-title date-trigger" type="button" onClick={openCalendarDialog}>
            {dateLabel}
          </button>
          <button
            className="bar-btn right"
            type="button"
            aria-label="次の日"
            onClick={() => onMoveDate(1)}
          >
            <ChevronRight />
          </button>
        </div>
        <div className="stats">
          <div className="stat">
            <span>合計種目数</span>
            <strong>{selectedWorkouts.length}</strong>
          </div>
          <div className="stat">
            <span>合計セット数</span>
            <strong>{sets.length}</strong>
          </div>
          <div className="stat">
            <span>合計レップ数</span>
            <strong>{totalReps}</strong>
          </div>
          <div className="stat">
            <span>合計秒数</span>
            <strong>{totalSeconds}</strong>
          </div>
          <div className="stat">
            <span>合計負荷量</span>
            <strong>{Math.round(totalVolume)}</strong>
          </div>
        </div>
      </header>
      <div className="preset-start">
        <select
          aria-label="プリセットを選択"
          disabled={!presets.length}
          value={currentPreset?.id || ''}
          onChange={(event) => onSelectPreset(event.target.value)}
        >
          {presets.length ? (
            presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))
          ) : (
            <option value="">プリセットなし</option>
          )}
        </select>
        <button
          className="small-primary"
          disabled={!currentPreset}
          type="button"
          onClick={() => onStartPreset(currentPreset?.id || '')}
        >
          開始
        </button>
        <button className="small-outline" type="button" onClick={onOpenPresets}>
          管理
        </button>
      </div>
      {!!selectedPlannedParts.length && (
        <div className="planned-day">
          <span>予定: {selectedPlannedParts.join(' / ')}</span>
        </div>
      )}
      {workoutStartTime && (
        <div className="workout-start-time-row">
          <span>開始時刻：{workoutStartTime}</span>
        </div>
      )}
      <div className="content">
        {!selectedWorkouts.length ? (
          <div className="empty">
            <div>
              <strong>この日の種目はまだありません</strong>
              <button
                className="primary start-training-button"
                type="button"
                onClick={onStartWorkoutDay}
              >
                トレーニングを開始
              </button>
            </div>
          </div>
        ) : (
          selectedWorkouts.map((workout) => (
            <article
              className="exercise-card"
              key={workout.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenDetail(workout.id)}
              onKeyDown={(event) => openDetailFromKey(event, workout.id)}
            >
              <header className="exercise-head">
                <h2>
                  {workout.part} - {workout.name}
                </h2>
                <button
                  className="delete-workout"
                  type="button"
                  aria-label={`${workout.name}を削除`}
                  onClick={(event) => requestDelete(event, workout)}
                >
                  <TrashIcon />
                </button>
              </header>
              <div className="exercise-body">
                <table className="set-table">
                  <thead>
                    <tr>
                      <th>セット</th>
                      <th>重さ</th>
                      <th></th>
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
                      />
                    ))}
                  </tbody>
                </table>
                {isUnstartedWorkout(workout) && (
                  <div className="new-workout-overlay" aria-hidden="true">
                    <div className="new-workout-overlay-icon">
                      <PlusIcon />
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
      <button className="fab" type="button" aria-label="種目を追加" onClick={onOpenSelect}>
        <PlusIcon />
      </button>
      <div className="app-version" aria-label={`アプリバージョン ${appVersion}`}>
        {appVersion}
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
      {calendarOpen && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="calendar-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-calendar-title"
          >
            <div className="calendar-dialog-head">
              <div className="confirm-title" id="home-calendar-title">
                日付を選択
              </div>
              <div className="calendar-head compact">
                <button
                  className="month-btn icon"
                  type="button"
                  aria-label="前の月"
                  onClick={() => moveCalendarMonth(-1)}
                >
                  <ChevronLeft />
                </button>
                <div className="calendar-month">
                  {calendarYear}年 {String(calendarMonth + 1).padStart(2, '0')}月
                </div>
                <button
                  className="month-btn icon"
                  type="button"
                  aria-label="次の月"
                  onClick={() => moveCalendarMonth(1)}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
            <div className="calendar-grid home-calendar-grid">
              {weekdayLabels.map((day) => (
                <div className="weekday" key={day}>
                  {day}
                </div>
              ))}
              {calendarDays.map((cell) => {
                const trained = trainedDates.has(cell.date);
                const selected = cell.date === selectedDate;
                return (
                  <div className={`day-cell ${cell.inMonth ? '' : 'other'}`} key={cell.date}>
                    <button
                      className={`day-btn ${trained ? 'trained' : ''} ${selected ? 'selected' : ''}`}
                      type="button"
                      onClick={() => selectCalendarDate(cell.date)}
                    >
                      {cell.day}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="confirm-actions">
              <button className="small-primary" type="button" onClick={jumpToToday}>
                本日
              </button>
              <button className="calendar-cancel" type="button" onClick={closeCalendarDialog}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
