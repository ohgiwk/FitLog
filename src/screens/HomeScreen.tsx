import { KeyboardEvent, MouseEvent, PointerEvent, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MenuIcon,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
  TrophyIcon,
} from '../icons';
import { Workout } from '../types';
import { calendarCells, isUnstartedWorkout, localDate, parseDate } from '../utils';
import { HomeSetRow } from '../components/HomeSetRow';
import { useFitLogContext } from '../hooks/FitLogContext';
import { appVersion } from '../version';

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
type HomeCalendarMode = 'week' | 'month';
const calendarPageOffsets = [-1, 0, 1];

/**
 * 指定日を含む日曜始まりの1週間を作る
 */
function weekCells(anchorDate: Date) {
  const start = new Date(anchorDate);
  start.setDate(anchorDate.getDate() - anchorDate.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: localDate(date), day: date.getDate(), inMonth: true };
  });
}

/**
 * 表示中の日付を週または月単位で移動する
 */
function moveCalendarAnchor(anchorDate: Date, mode: HomeCalendarMode, delta: number) {
  const next = new Date(anchorDate);
  if (mode === 'week') {
    next.setDate(next.getDate() + delta * 7);
    return next;
  }

  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + delta);
  next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  return next;
}

/**
 * ホーム画面が必要とする state・派生値・操作を Context から組み立てる view-model フック
 */
function useHomeScreenModel() {
  const {
    selectedDate,
    state,
    selectedWorkouts,
    selectedPlannedParts,
    currentPreset,
    partColors,
    actions,
  } = useFitLogContext();

  return {
    selectedDate,
    workouts: state.workouts,
    selectedWorkouts,
    selectedPlannedParts,
    presets: state.presets,
    currentPreset,
    partColors,
    weightUnit: state.weightUnit,
    /**
     * 日付を選択し、対象日のホーム内容へ移動する
     */
    onSelectDate: (date: string) => {
      actions.selectDate(date);
      actions.setCurrentWorkoutId(null);
      actions.setScreen('home');
    },
    onSelectPreset: actions.selectPreset,
    onStartWorkoutDay: actions.startWorkoutDay,
    onStartPreset: actions.startPreset,
    onOpenPresets: () => actions.setScreen('preset'),
    onOpenSelect: () => actions.setScreen('select'),
    onOpenSettings: () => actions.setScreen('settings'),
    onOpenGoalAchievements: () => actions.setScreen('goalAchievements'),
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
    selectedWorkouts,
    selectedPlannedParts,
    presets,
    currentPreset,
    partColors,
    weightUnit,
    onSelectDate,
    onSelectPreset,
    onStartWorkoutDay,
    onStartPreset,
    onOpenPresets,
    onOpenSelect,
    onOpenSettings,
    onOpenGoalAchievements,
    onOpenDetail,
    onDeleteWorkout,
  } = useHomeScreenModel();
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<HomeCalendarMode>('week');
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(() => parseDate(selectedDate));
  const [calendarDragOffset, setCalendarDragOffset] = useState(0);
  const [calendarAnimating, setCalendarAnimating] = useState(false);
  const swipeStart = useRef<{ x: number; y: number; width: number } | null>(null);
  const pendingCalendarMove = useRef<number | null>(null);
  const calendarTransitionTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const calendarYear = calendarAnchorDate.getFullYear();
  const calendarMonth = calendarAnchorDate.getMonth();
  const today = localDate(new Date());
  const calendarMonthLabel = `${calendarYear}年${calendarMonth + 1}月`;
  const trainedDates = useMemo(() => new Set(workouts.map((workout) => workout.date)), [workouts]);
  const calendarPages = useMemo(
    () =>
      calendarPageOffsets.map((offset) => {
        const anchorDate = moveCalendarAnchor(calendarAnchorDate, calendarMode, offset);
        const year = anchorDate.getFullYear();
        const month = anchorDate.getMonth();
        return {
          key: `${calendarMode}-${localDate(anchorDate)}-${offset}`,
          offset,
          days: calendarMode === 'week' ? weekCells(anchorDate) : calendarCells(year, month),
        };
      }),
    [calendarAnchorDate, calendarMode],
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
   * カレンダーで日付を選択し、下部の一覧もその日に切り替える
   */
  function selectCalendarDate(nextDate: string) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSelectDate(nextDate);
    setCalendarAnchorDate(parseDate(nextDate));
  }

  /**
   * スワイプ後に続けて発火する click を1回だけ無視する
   */
  function ignoreNextClick() {
    suppressClick.current = true;
    globalThis.setTimeout(() => {
      suppressClick.current = false;
    }, 240);
  }

  /**
   * カレンダーのスナップ完了待ちタイマーを解除する
   */
  function clearCalendarTransitionTimer() {
    if (calendarTransitionTimer.current === null) return;
    globalThis.clearTimeout(calendarTransitionTimer.current);
    calendarTransitionTimer.current = null;
  }

  /**
   * 週表示と月表示を切り替える
   */
  function toggleCalendarMode() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    pendingCalendarMove.current = null;
    clearCalendarTransitionTimer();
    setCalendarDragOffset(0);
    setCalendarAnimating(false);
    setCalendarMode((current) => (current === 'week' ? 'month' : 'week'));
  }

  /**
   * 今日の日付へジャンプする
   */
  function jumpToToday() {
    const nextDate = localDate(new Date());
    onSelectDate(nextDate);
    pendingCalendarMove.current = null;
    clearCalendarTransitionTimer();
    setCalendarDragOffset(0);
    setCalendarAnimating(false);
    setCalendarAnchorDate(parseDate(nextDate));
  }

  function openSettings() {
    setDrawerOpen(false);
    onOpenSettings();
  }

  function openGoalAchievements() {
    setDrawerOpen(false);
    onOpenGoalAchievements();
  }

  /**
   * 表示中の週または月を左右スワイプで移動する
   */
  function startSwipe(event: PointerEvent<HTMLElement>) {
    if (calendarAnimating) return;
    const width = event.currentTarget.getBoundingClientRect().width;
    swipeStart.current = { x: event.clientX, y: event.clientY, width };
    pendingCalendarMove.current = null;
    setCalendarDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  /**
   * 下部バーのスワイプ開始位置を記録する
   */
  function startHandleSwipe(event: PointerEvent<HTMLButtonElement>) {
    swipeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width: event.currentTarget.getBoundingClientRect().width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  /**
   * カレンダー本体を指の動きに追従させる
   */
  function moveCalendarSwipe(event: PointerEvent<HTMLElement>) {
    const start = swipeStart.current;
    if (!start) return;
    const diffX = event.clientX - start.x;
    const diffY = event.clientY - start.y;
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 12) return;
    setCalendarDragOffset(Math.max(Math.min(diffX, start.width), -start.width));
  }

  /**
   * カレンダー本体の左右スワイプを週/月移動として扱う
   */
  function finishCalendarSwipe(event: PointerEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const diffX = event.clientX - start.x;
    const diffY = event.clientY - start.y;
    if (Math.abs(diffY) >= 44 && Math.abs(diffY) > Math.abs(diffX)) {
      ignoreNextClick();
      setCalendarMode(diffY > 0 ? 'month' : 'week');
      return;
    }
    if (Math.abs(diffX) < Math.max(56, start.width * 0.18) || Math.abs(diffX) <= Math.abs(diffY)) {
      pendingCalendarMove.current = null;
      setCalendarAnimating(calendarDragOffset !== 0);
      setCalendarDragOffset(0);
      if (calendarDragOffset !== 0) {
        clearCalendarTransitionTimer();
        calendarTransitionTimer.current = globalThis.setTimeout(finishCalendarTransition, 260);
      }
      return;
    }
    const nextMove = diffX < 0 ? 1 : -1;
    pendingCalendarMove.current = nextMove;
    ignoreNextClick();
    setCalendarAnimating(true);
    setCalendarDragOffset(-nextMove * start.width);
    clearCalendarTransitionTimer();
    calendarTransitionTimer.current = globalThis.setTimeout(finishCalendarTransition, 260);
  }

  /**
   * スナップアニメーション完了後に表示基準日を更新する
   */
  function finishCalendarTransition() {
    clearCalendarTransitionTimer();
    const nextMove = pendingCalendarMove.current;
    pendingCalendarMove.current = null;
    setCalendarAnimating(false);
    setCalendarDragOffset(0);
    if (!nextMove) return;
    setCalendarAnchorDate((current) => moveCalendarAnchor(current, calendarMode, nextMove));
  }

  /**
   * 下部バーの上下スワイプで週表示と月表示を切り替える
   */
  function finishHandleSwipe(event: PointerEvent<HTMLButtonElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const diffY = event.clientY - start.y;
    const diffX = event.clientX - start.x;
    if (Math.abs(diffY) < 28 || Math.abs(diffY) <= Math.abs(diffX)) return;
    ignoreNextClick();
    setCalendarMode(diffY > 0 ? 'month' : 'week');
  }

  return (
    <section className="screen active detail-screen">
      <header className={`home-calendar-shell ${calendarMode}`}>
        <div className="home-calendar-head">
          <button
            className="home-menu-btn"
            type="button"
            aria-label="メニューを開く"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </button>
          <button className="home-calendar-title" type="button" onClick={toggleCalendarMode}>
            <span>{calendarMonthLabel}</span>
            {calendarMode === 'week' ? <ChevronDown /> : <ChevronUp />}
          </button>
          <button
            className="home-today-btn"
            type="button"
            onClick={jumpToToday}
            aria-label="今日の日付へ移動"
          >
            今日
          </button>
        </div>
        {drawerOpen && (
          <div className="drawer-layer" role="presentation" onClick={() => setDrawerOpen(false)}>
            <aside
              className="home-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="メニュー"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="drawer-head">
                <strong>メニュー</strong>
                <button className="drawer-close" type="button" onClick={() => setDrawerOpen(false)}>
                  閉じる
                </button>
              </div>
              <button className="drawer-link" type="button" onClick={openSettings}>
                <SettingsIcon />
                <span>設定</span>
              </button>
              <button className="drawer-link" type="button" onClick={openGoalAchievements}>
                <TrophyIcon />
                <span>目標達成記録</span>
              </button>
              <div className="drawer-version" aria-label={`アプリバージョン ${appVersion}`}>
                {appVersion}
              </div>
            </aside>
          </div>
        )}
        <div
          className="home-calendar-viewport"
          onPointerDown={startSwipe}
          onPointerMove={moveCalendarSwipe}
          onPointerUp={finishCalendarSwipe}
          onPointerCancel={() => {
            swipeStart.current = null;
            pendingCalendarMove.current = null;
            setCalendarAnimating(calendarDragOffset !== 0);
            setCalendarDragOffset(0);
            if (calendarDragOffset !== 0) {
              clearCalendarTransitionTimer();
              calendarTransitionTimer.current = globalThis.setTimeout(
                finishCalendarTransition,
                260,
              );
            }
          }}
        >
          <div
            className={`home-calendar-track ${calendarAnimating ? 'animating' : ''}`}
            style={{ transform: `translateX(calc(-100% + ${calendarDragOffset}px))` }}
            onTransitionEnd={finishCalendarTransition}
          >
            {calendarPages.map((page) => (
              <div className="home-calendar-page" key={page.key}>
                <div className="home-calendar-grid">
                  {weekdayLabels.map((day) => (
                    <div className="weekday" key={day}>
                      {day}
                    </div>
                  ))}
                  {page.days.map((cell) => {
                    const trained = trainedDates.has(cell.date);
                    const selected = cell.date === selectedDate;
                    const isToday = cell.date === today;
                    return (
                      <div className={`day-cell ${cell.inMonth ? '' : 'other'}`} key={cell.date}>
                        {cell.inMonth ? (
                          <button
                            className={`day-btn ${trained ? 'trained' : ''} ${
                              isToday ? 'today' : ''
                            } ${selected ? 'selected' : ''}`}
                            type="button"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                            }}
                            onPointerUp={(event) => {
                              event.stopPropagation();
                            }}
                            onTouchEnd={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              selectCalendarDate(cell.date);
                            }}
                            onClick={() => selectCalendarDate(cell.date)}
                          >
                            {cell.day}
                          </button>
                        ) : (
                          <span aria-hidden="true" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          className="calendar-drag-handle"
          type="button"
          aria-label="カレンダーの週表示と月表示を切り替え"
          onClick={toggleCalendarMode}
          onPointerDown={startHandleSwipe}
          onPointerUp={finishHandleSwipe}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
        />
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
              <header
                className="exercise-head"
                style={{ borderLeftColor: partColors.get(workout.part) }}
              >
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
                        weightUnit={weightUnit}
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
    </section>
  );
}
