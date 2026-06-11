import { useMemo } from 'react';
import { State } from '../types';
import { groupExercises } from '../utils';
import {
  buildPartRecentLabels,
  buildSplitPartOptions,
  plannedPartsForDate,
} from '../selectors/fitLogSelectors';

/**
 * state から画面表示用の派生データを計算してメモ化するフック
 */
export function useFitLogSelectors(state: State, selectedDate: string) {
  /**
   * 種目を部位ごとにまとめたマップ
   */
  const groupedExercises = useMemo(() => groupExercises(state.exercises), [state.exercises]);
  /**
   * 履歴や計画で使う部位の選択肢一覧
   */
  const splitPartOptions = useMemo(
    () =>
      buildSplitPartOptions(
        state.exercises,
        state.workouts,
        state.trainingDays,
        state.trainingPlans,
      ),
    [state.exercises, state.trainingDays, state.trainingPlans, state.workouts],
  );
  /**
   * 選択日にトレーニング計画で予定されている部位
   */
  const selectedPlannedParts = useMemo(
    () => plannedPartsForDate(selectedDate, state.trainingPlans),
    [selectedDate, state.trainingPlans],
  );
  /**
   * 部位ごとの「最後に実施したのが何日前か」を表すラベル
   */
  const partRecentLabels = useMemo(
    () => buildPartRecentLabels(groupedExercises, state.workouts, selectedDate),
    [groupedExercises, selectedDate, state.workouts],
  );

  return { groupedExercises, splitPartOptions, selectedPlannedParts, partRecentLabels };
}
