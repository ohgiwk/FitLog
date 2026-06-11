import { State, TrainingPlan, TrainingPlanMode } from '../types';
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

  /**
   * 部位行のインライン編集から計画をそのまま反映する。
   * 既存計画があれば上書き、なければ作成する。トーストは出さない。
   * 曜日モードで曜日が未選択のときは、その部位の計画を持たない状態にする
   */
  function upsertTrainingPlan(
    part: string,
    mode: TrainingPlanMode,
    weekdays: number[],
    intervalDays: number,
    startDate: string,
  ) {
    const normalizedPart = part.trim();
    if (!normalizedPart) return;
    const normalizedWeekdays = [...new Set(weekdays)].sort((a, b) => a - b);
    saveState((prev) => {
      if (mode === 'weekly' && !normalizedWeekdays.length) {
        return {
          ...prev,
          trainingPlans: prev.trainingPlans.filter((item) => item.part !== normalizedPart),
        };
      }
      const existing = prev.trainingPlans.find((item) => item.part === normalizedPart);
      const plan: TrainingPlan = {
        id: existing?.id ?? uid(),
        part: normalizedPart,
        mode,
        weekdays: mode === 'weekly' ? normalizedWeekdays : [],
        intervalDays: mode === 'interval' ? Math.max(1, Math.round(intervalDays || 1)) : 1,
        startDate: startDate || selectedDate,
      };
      const trainingPlans = existing
        ? prev.trainingPlans.map((item) => (item.id === existing.id ? plan : item))
        : [plan, ...prev.trainingPlans];
      return { ...prev, trainingPlans };
    });
  }

  return { addTrainingPlan, deleteTrainingPlan, upsertTrainingPlan };
}
