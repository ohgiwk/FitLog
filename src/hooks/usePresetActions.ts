import { useEffect, useMemo, useState } from 'react';
import { Preset, Screen, State } from '../types';
import {
  createWorkout,
  findCurrentPreset,
  scheduledPresetsForDate,
} from '../selectors/fitLogSelectors';

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

  /**
   * 現在選択中のプリセット
   */
  const currentPreset = useMemo(
    () => findCurrentPreset(state.presets, currentPresetId),
    [currentPresetId, state.presets],
  );
  const scheduledPresetId = useMemo(
    () => scheduledPresetsForDate(selectedDate, state.presets)[0]?.id ?? null,
    [selectedDate, state.presets],
  );
  /**
   * プリセットの増減に合わせて選択中 ID を補正する
   */
  useEffect(() => {
    if (!currentPreset && state.presets.length) setCurrentPresetId(state.presets[0].id);
    if (!state.presets.length) setCurrentPresetId(null);
  }, [currentPreset, state.presets]);

  /**
   * 選択日に予定されたプリセットがあればホームの既定選択へ反映する
   */
  useEffect(() => {
    if (scheduledPresetId) setCurrentPresetId(scheduledPresetId);
  }, [scheduledPresetId, selectedDate]);

  /**
   * 編集画面の下書きを新規作成または既存プリセットへ反映する
   */
  function savePreset(preset: Preset) {
    const normalizedPreset: Preset = {
      ...preset,
      name: preset.name.trim() || '名称未設定',
      exerciseIds: [...new Set(preset.exerciseIds)],
      schedule: preset.schedule
        ? {
            mode: preset.schedule.mode,
            weekdays:
              preset.schedule.mode === 'weekly'
                ? [...new Set(preset.schedule.weekdays)]
                    .filter((weekday) => weekday >= 0 && weekday <= 6)
                    .sort((a, b) => a - b)
                : [],
            intervalDays:
              preset.schedule.mode === 'interval'
                ? Math.max(1, Math.round(preset.schedule.intervalDays || 1))
                : 1,
            startDate: preset.schedule.startDate || selectedDate,
          }
        : undefined,
    };
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.some((item) => item.id === normalizedPreset.id)
        ? prev.presets.map((item) => (item.id === normalizedPreset.id ? normalizedPreset : item))
        : [normalizedPreset, ...prev.presets],
    }));
    setCurrentPresetId(normalizedPreset.id);
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
    currentPreset,
    savePreset,
    deletePreset,
    startPreset,
  };
}
