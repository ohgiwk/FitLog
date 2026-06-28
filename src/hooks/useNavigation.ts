import { useMemo, useState } from 'react';
import { Screen, State } from '../types';
import { isBlank, localDate, parseDate } from '../utils';
import { findCurrentWorkout } from '../selectors/fitLogSelectors';
import { GoalAchievement } from './useFitLogUi';
import { appendGoalAchievement, findGoalAchievement } from './goalAchievement';

export type ScreenTransitionDirection = 'forward' | 'back' | 'none';

type NavigationDeps = {
  state: State;
  saveState: (updater: (draft: State) => State) => void;
  setEditMode: (value: boolean) => void;
  setGoalAchievement: (value: GoalAchievement | null) => void;
};

const screenDepth: Record<Screen, number> = {
  home: 0,
  select: 1,
  trainingMenu: 1,
  goalAchievements: 1,
  analysis: 1,
  settings: 1,
  detail: 1,
  exerciseEdit: 2,
  presetEdit: 2,
  partEdit: 2,
  exerciseManage: 2,
  localBackup: 2,
  cloudAuth: 2,
  cloudBackups: 2,
  exerciseHistory: 2,
  presetExerciseSelect: 3,
};

function getTransitionDirection(
  current: Screen,
  next: Screen,
): ScreenTransitionDirection {
  if (current === next) return 'none';
  return screenDepth[next] > screenDepth[current] ? 'forward' : 'back';
}

/**
 * 画面遷移・選択中の日付・対象ワークアウトなど、ナビゲーション状態を管理するフック
 */
export function useNavigation({
  state,
  saveState,
  setEditMode,
  setGoalAchievement,
}: NavigationDeps) {
  const [selectedDate, setSelectedDate] = useState(() => localDate(new Date()));
  const [screen, setScreen] = useState<Screen>('home');
  const [transitionFrom, setTransitionFrom] = useState<Screen | null>(null);
  const [transitionDirection, setTransitionDirection] =
    useState<ScreenTransitionDirection>('none');
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);

  /**
   * 選択中の日付に紐づくワークアウト一覧
   */
  const selectedWorkouts = useMemo(
    () => state.workouts.filter((workout) => workout.date === selectedDate),
    [selectedDate, state.workouts],
  );
  /**
   * 詳細画面などで操作対象となっているワークアウト
   */
  const currentWorkout = useMemo(
    () => findCurrentWorkout(state.workouts, currentWorkoutId, selectedDate, selectedWorkouts),
    [currentWorkoutId, selectedDate, selectedWorkouts, state.workouts],
  );

  /**
   * 詳細画面を離れる際、未入力のままの空セットを取り除く
   */
  function cleanupBlankDetailSets() {
    if (screen !== 'detail' || !currentWorkout) return;
    if (state.workoutEndTimes[currentWorkout.date]) return;
    saveState((prev) => {
      const workout = prev.workouts.find((item) => item.id === currentWorkout.id);
      if (!workout) return prev;
      const recordedSets = workout.sets.filter(
        (set) => !isBlank(set.weight) || !isBlank(set.recordValue),
      );
      if (!recordedSets.length) return prev;
      if (recordedSets.length === workout.sets.length) return prev;
      const workouts = prev.workouts.map((item) =>
        item.id === workout.id ? { ...item, sets: recordedSets } : item,
      );
      return { ...prev, workouts };
    });
  }

  /**
   * 画面を切り替える。離脱時の後片付けや編集モード解除も行う
   */
  function showScreen(next: Screen) {
    function commitScreen() {
      const direction = getTransitionDirection(screen, next);
      setTransitionFrom(direction === 'none' ? null : screen);
      setTransitionDirection(direction);
      setScreen(next);
    }

    const isReadOnlyWorkout = Boolean(currentWorkout && state.workoutEndTimes[currentWorkout.date]);
    if (screen === 'detail' && next !== 'detail' && currentWorkout) {
      if (isReadOnlyWorkout) {
        commitScreen();
        if (next !== 'select') setEditMode(false);
        return;
      }
      const goalResult = findGoalAchievement(state, currentWorkout);
      if (goalResult) {
        saveState((prev) => appendGoalAchievement(prev, currentWorkout, goalResult));
        setGoalAchievement(goalResult.achievement);
      }
    }
    if (next !== 'detail' && next !== 'exerciseHistory') cleanupBlankDetailSets();
    if (next !== 'select' && next !== 'exerciseEdit') setEditMode(false);
    commitScreen();
  }

  /**
   * 選択日を指定日数ぶん前後に動かしてホームへ戻る
   */
  function moveDate(days: number) {
    const next = parseDate(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(localDate(next));
    setCurrentWorkoutId(null);
    showScreen('home');
  }

  /**
   * カレンダー表示を指定月ぶん前後に動かす
   */
  function moveMonth(delta: number) {
    const next = parseDate(selectedDate);
    next.setMonth(next.getMonth() + delta, 1);
    setSelectedDate(localDate(next));
    setCurrentWorkoutId(null);
  }

  return {
    selectedDate,
    setSelectedDate,
    screen,
    transitionFrom,
    transitionDirection,
    clearScreenTransition: () => setTransitionFrom(null),
    showScreen,
    currentWorkoutId,
    setCurrentWorkoutId,
    selectedWorkouts,
    currentWorkout,
    moveDate,
    moveMonth,
  };
}
