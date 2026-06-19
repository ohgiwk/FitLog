import { useEffect, useMemo, useState } from 'react';
import { Preset, Screen, State } from '../types';
import { uid } from '../utils';
import { createWorkout, findCurrentPreset } from '../selectors/fitLogSelectors';

type PresetActionsDeps = {
  state: State;
  saveState: (updater: (draft: State) => State) => void;
  showToast: (message: string) => void;
  showScreen: (next: Screen) => void;
  selectedDate: string;
};

/**
 * プリセット(よく使う種目のまとまり)の選択・編集・実行を担うフック
 */
export function usePresetActions({
  state,
  saveState,
  showToast,
  showScreen,
  selectedDate,
}: PresetActionsDeps) {
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
  const [currentEditingPresetId, setCurrentEditingPresetId] = useState<string | null>(null);

  /**
   * 現在選択中のプリセット
   */
  const currentPreset = useMemo(
    () => findCurrentPreset(state.presets, currentPresetId),
    [currentPresetId, state.presets],
  );
  /**
   * 編集画面で対象になっているプリセット
   */
  const editingPreset = useMemo(
    () => state.presets.find((preset) => preset.id === currentEditingPresetId) || null,
    [currentEditingPresetId, state.presets],
  );

  /**
   * プリセットの増減に合わせて選択中 ID を補正する
   */
  useEffect(() => {
    if (!currentPreset && state.presets.length) setCurrentPresetId(state.presets[0].id);
    if (!state.presets.length) setCurrentPresetId(null);
  }, [currentPreset, state.presets]);

  /**
   * 新規プリセットを作成して編集画面へ進む
   */
  function createPreset() {
    const preset: Preset = { id: uid(), name: '新規プリセット', exerciseIds: [] };
    saveState((prev) => ({ ...prev, presets: [preset, ...prev.presets] }));
    setCurrentPresetId(preset.id);
    setCurrentEditingPresetId(preset.id);
    showScreen('presetEdit');
  }

  /**
   * プリセット名を変更する(空なら既定名にする)
   */
  function renamePreset(presetId: string, name: string) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) =>
        preset.id === presetId ? { ...preset, name: name.trim() || '名称未設定' } : preset,
      ),
    }));
  }

  /**
   * プリセットを削除し、選択・編集中の参照も解除する
   */
  function deletePreset(presetId: string) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.filter((preset) => preset.id !== presetId),
    }));
    if (currentPresetId === presetId) setCurrentPresetId(null);
    if (currentEditingPresetId === presetId) setCurrentEditingPresetId(null);
    showScreen('preset');
  }

  /**
   * プリセットに種目を追加する(重複は追加しない)
   */
  function addExerciseToPreset(presetId: string, exerciseId: string) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) =>
        preset.id === presetId && !preset.exerciseIds.includes(exerciseId)
          ? { ...preset, exerciseIds: [...preset.exerciseIds, exerciseId] }
          : preset,
      ),
    }));
  }

  /**
   * プリセットから種目を取り除く
   */
  function removeExerciseFromPreset(presetId: string, exerciseId: string) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) =>
        preset.id === presetId
          ? { ...preset, exerciseIds: preset.exerciseIds.filter((id) => id !== exerciseId) }
          : preset,
      ),
    }));
  }

  /**
   * プリセット内の種目の並び順を1つ前後に入れ替える
   */
  function movePresetExercise(presetId: string, exerciseId: string, direction: number) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) => {
        if (preset.id !== presetId) return preset;
        const index = preset.exerciseIds.indexOf(exerciseId);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= preset.exerciseIds.length) return preset;
        const exerciseIds = [...preset.exerciseIds];
        [exerciseIds[index], exerciseIds[nextIndex]] = [exerciseIds[nextIndex], exerciseIds[index]];
        return { ...preset, exerciseIds };
      }),
    }));
  }

  /**
   * プリセットの種目を選択日に一括追加する(既に追加済みのものは除く)
   */
  function startPreset(presetId: string) {
    if (state.workoutEndTimes[selectedDate]) return;
    const preset = state.presets.find((item) => item.id === presetId);
    if (!preset || !preset.exerciseIds.length)
      return showToast('プリセットに種目を追加してください');
    const todayExerciseIds = new Set(
      state.workouts
        .filter((workout) => workout.date === selectedDate)
        .map((workout) => workout.exerciseId),
    );
    const queuedExerciseIds = new Set<string>();
    const exercisesToAdd = preset.exerciseIds.flatMap((exerciseId) => {
      if (todayExerciseIds.has(exerciseId) || queuedExerciseIds.has(exerciseId)) return [];
      const exercise = state.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return [];
      queuedExerciseIds.add(exerciseId);
      return [exercise];
    });
    if (!exercisesToAdd.length) {
      showScreen('home');
      const hasExisting = preset.exerciseIds.some((exerciseId) => todayExerciseIds.has(exerciseId));
      return showToast(hasExisting ? 'すでに追加されています' : 'プリセットの種目が見つかりません');
    }
    const newWorkouts = exercisesToAdd.map((exercise) => createWorkout(exercise, selectedDate));
    saveState((prev) => ({ ...prev, workouts: [...prev.workouts, ...newWorkouts] }));
    showScreen('home');
    showToast(`${exercisesToAdd.length}種目を追加しました`);
  }

  return {
    currentPresetId,
    setCurrentPresetId,
    currentEditingPresetId,
    setCurrentEditingPresetId,
    currentPreset,
    editingPreset,
    createPreset,
    renamePreset,
    deletePreset,
    addExerciseToPreset,
    removeExerciseFromPreset,
    movePresetExercise,
    startPreset,
  };
}
