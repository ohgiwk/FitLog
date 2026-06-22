import { useMemo } from 'react';
import { Exercise, State } from '../types';
import { groupExercises } from '../utils';
import {
  buildOrderedParts,
  buildPartColorMap,
  buildPartRecentLabels,
  buildSplitPartOptions,
  scheduledPresetsForDate,
} from '../selectors/fitLogSelectors';

/**
 * state から画面表示用の派生データを計算してメモ化するフック
 */
export function useFitLogSelectors(state: State, selectedDate: string) {
  /**
   * 表示順つきの部位一覧(明示設定＋データ由来)
   */
  const orderedParts = useMemo(
    () =>
      buildOrderedParts(
        state.parts,
        state.exercises,
        state.workouts,
        state.trainingDays,
        state.trainingPlans,
      ),
    [state.parts, state.exercises, state.workouts, state.trainingDays, state.trainingPlans],
  );
  /**
   * 部位名から表示色を引けるマップ
   */
  const partColors = useMemo(() => buildPartColorMap(orderedParts), [orderedParts]);
  /**
   * 種目を部位ごとにまとめ、部位の表示順に並べ替えたマップ
   */
  const groupedExercises = useMemo(() => {
    const grouped = groupExercises(state.exercises);
    const ordered = new Map<string, Exercise[]>();
    orderedParts.forEach((part) => {
      const exercises = grouped.get(part.name);
      if (exercises) ordered.set(part.name, exercises);
    });
    grouped.forEach((exercises, part) => {
      if (!ordered.has(part)) ordered.set(part, exercises);
    });
    return ordered;
  }, [state.exercises, orderedParts]);
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
   * 選択日にスケジュールされているプリセット
   */
  const selectedScheduledPresets = useMemo(
    () => scheduledPresetsForDate(selectedDate, state.presets),
    [selectedDate, state.presets],
  );
  /**
   * 部位ごとの「最後に実施したのが何日前か」を表すラベル
   */
  const partRecentLabels = useMemo(
    () => buildPartRecentLabels(groupedExercises, state.workouts, selectedDate),
    [groupedExercises, selectedDate, state.workouts],
  );

  return {
    groupedExercises,
    splitPartOptions,
    selectedScheduledPresets,
    partRecentLabels,
    orderedParts,
    partColors,
  };
}
