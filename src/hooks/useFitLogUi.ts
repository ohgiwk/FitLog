import { useState } from 'react';
import { ExerciseGoal, MeasurementType, Preset, Screen } from '../types';

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
  const [presetDraft, setPresetDraft] = useState<Preset | null>(null);
  const [presetDraftMode, setPresetDraftMode] = useState<'menu' | 'start'>('menu');
  const [editMode, setEditMode] = useState(false);
  const [activePart, setActivePart] = useState<string | null>(null);
  const [exerciseEditor, setExerciseEditor] = useState<{
    exerciseId: string | null;
    part: string;
  } | null>(null);
  const [exerciseEditorReturnScreen, setExerciseEditorReturnScreen] =
    useState<Screen>('select');
  const [goalAchievement, setGoalAchievement] = useState<GoalAchievement | null>(null);

  /**
   * 種目選択画面で表示する部位タブを切り替える
   */
  function selectPart(part: string) {
    setActivePart(part);
  }

  return {
    presetDraft,
    setPresetDraft,
    presetDraftMode,
    setPresetDraftMode,
    editMode,
    setEditMode,
    activePart,
    setActivePart,
    selectPart,
    exerciseEditor,
    setExerciseEditor,
    exerciseEditorReturnScreen,
    setExerciseEditorReturnScreen,
    goalAchievement,
    setGoalAchievement,
  };
}
