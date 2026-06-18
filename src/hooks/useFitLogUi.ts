import { useState } from 'react';
import { ExerciseGoal, MeasurementType } from '../types';

export type GoalAchievement = {
  exerciseId: string;
  exerciseName: string;
  measurementType: MeasurementType;
  goal: ExerciseGoal;
};

/**
 * 保存対象ではない、画面操作のための一時的な UI 状態をまとめるフック
 */
export function useFitLogUi() {
  const [historyPartFilter, setHistoryPartFilter] = useState('ALL');
  const [editMode, setEditMode] = useState(false);
  const [activePart, setActivePart] = useState<string | null>(null);
  const [goalAchievement, setGoalAchievement] = useState<GoalAchievement | null>(null);

  /**
   * 種目選択画面で表示する部位タブを切り替える
   */
  function selectPart(part: string) {
    setActivePart(part);
  }

  return {
    historyPartFilter,
    setHistoryPartFilter,
    editMode,
    setEditMode,
    activePart,
    setActivePart,
    selectPart,
    goalAchievement,
    setGoalAchievement,
  };
}

export type FitLogUi = ReturnType<typeof useFitLogUi>;
