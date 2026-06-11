import { useMemo, useState } from "react";
import { Screen, State } from "../types";
import { isBlank, localDate, parseDate } from "../utils";
import { findCurrentWorkout } from "../selectors/fitLogSelectors";

type NavigationDeps = {
  state: State;
  saveState: (updater: (draft: State) => State) => void;
  setEditMode: (value: boolean) => void;
};

/**
 * 画面遷移・選択中の日付・対象ワークアウトなど、ナビゲーション状態を管理するフック
 */
export function useNavigation({ state, saveState, setEditMode }: NavigationDeps) {
  const [selectedDate, setSelectedDate] = useState(() => localDate(new Date()));
  const [screen, setScreen] = useState<Screen>("home");
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);

  /**
   * 選択中の日付に紐づくワークアウト一覧
   */
  const selectedWorkouts = useMemo(
    () => state.workouts.filter((workout) => workout.date === selectedDate),
    [selectedDate, state.workouts]
  );
  /**
   * 詳細画面などで操作対象となっているワークアウト
   */
  const currentWorkout = useMemo(
    () => findCurrentWorkout(state.workouts, currentWorkoutId, selectedDate, selectedWorkouts),
    [currentWorkoutId, selectedDate, selectedWorkouts, state.workouts]
  );

  /**
   * 詳細画面を離れる際、未入力のままの空セットを取り除く
   */
  function cleanupBlankDetailSets() {
    if (screen !== "detail" || !currentWorkout) return;
    saveState((prev) => {
      const workout = prev.workouts.find((item) => item.id === currentWorkout.id);
      if (!workout) return prev;
      const recordedSets = workout.sets.filter((set) => !isBlank(set.weight) || !isBlank(set.recordValue));
      if (!recordedSets.length) return prev;
      if (recordedSets.length === workout.sets.length) return prev;
      const workouts = prev.workouts.map((item) => (item.id === workout.id ? { ...item, sets: recordedSets } : item));
      return { ...prev, workouts };
    });
  }

  /**
   * 画面を切り替える。離脱時の後片付けや編集モード解除も行う
   */
  function showScreen(next: Screen) {
    if (next !== "detail" && next !== "exerciseHistory") cleanupBlankDetailSets();
    if (next !== "select") setEditMode(false);
    setScreen(next);
  }

  /**
   * 選択日を指定日数ぶん前後に動かしてホームへ戻る
   */
  function moveDate(days: number) {
    const next = parseDate(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(localDate(next));
    setCurrentWorkoutId(null);
    showScreen("home");
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
    showScreen,
    currentWorkoutId,
    setCurrentWorkoutId,
    selectedWorkouts,
    currentWorkout,
    moveDate,
    moveMonth,
  };
}

export type FitLogNavigation = ReturnType<typeof useNavigation>;
