import { State, TrainingPlanMode } from '../types';
import { uid } from '../utils';

type TrainingPlanActionsDeps = {
  saveState: (updater: (draft: State) => State) => void;
  showToast: (message: string) => void;
  selectedDate: string;
};

/**
 * 部位ごとのトレーニング計画(曜日/間隔)の追加・削除を担うフック
 */
export function useTrainingPlanActions({
  saveState,
  showToast,
  selectedDate,
}: TrainingPlanActionsDeps) {
  /**
   * 計画を検証して保存する。同じ部位の既存計画があれば上書きする
   */
  function addTrainingPlan(
    part: string,
    mode: TrainingPlanMode,
    weekdays: number[],
    intervalDays: number,
    startDate: string,
  ) {
    const normalizedPart = part.trim();
    if (!normalizedPart) return showToast('部位を選択してください');
    if (mode === 'weekly' && !weekdays.length) return showToast('曜日を選択してください');
    if (mode === 'interval' && (!intervalDays || intervalDays < 1))
      return showToast('間隔を入力してください');
    const plan = {
      id: uid(),
      part: normalizedPart,
      mode,
      weekdays: mode === 'weekly' ? [...new Set(weekdays)].sort() : [],
      intervalDays: mode === 'interval' ? Math.max(1, Math.round(intervalDays)) : 1,
      startDate: startDate || selectedDate,
    };
    saveState((prev) => {
      const existing = prev.trainingPlans.find((item) => item.part === normalizedPart);
      const trainingPlans = existing
        ? prev.trainingPlans.map((item) =>
            item.id === existing.id ? { ...plan, id: existing.id } : item,
          )
        : [plan, ...prev.trainingPlans];
      return { ...prev, trainingPlans };
    });
    showToast('計画を保存しました');
  }

  /**
   * 指定したトレーニング計画を削除する
   */
  function deleteTrainingPlan(planId: string) {
    saveState((prev) => ({
      ...prev,
      trainingPlans: prev.trainingPlans.filter((plan) => plan.id !== planId),
    }));
  }

  return { addTrainingPlan, deleteTrainingPlan };
}
