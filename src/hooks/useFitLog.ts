import { useBackup } from './useBackup';
import { useExerciseActions } from './useExerciseActions';
import { useFitLogCore } from './useFitLogCore';
import { useFitLogSelectors } from './useFitLogSelectors';
import { useFitLogUi } from './useFitLogUi';
import { useNavigation } from './useNavigation';
import { usePartActions } from './usePartActions';
import { usePresetActions } from './usePresetActions';
import { useWorkoutActions } from './useWorkoutActions';
import { Preset, WeightUnit } from '../types';
import { uid } from '../utils';

/**
 * 各フックを束ね、画面に渡す state・派生値・操作(actions)をまとめる統合フック
 */
export function useFitLog() {
  const core = useFitLogCore();
  const ui = useFitLogUi();
  const nav = useNavigation({
    state: core.state,
    saveState: core.saveState,
    setEditMode: ui.setEditMode,
    setGoalAchievement: ui.setGoalAchievement,
  });
  const selectors = useFitLogSelectors(core.state, nav.selectedDate);

  const presets = usePresetActions({
    state: core.state,
    saveState: core.saveState,
    showToast: core.showToast,
    showScreen: nav.showScreen,
    selectedDate: nav.selectedDate,
  });

  const workout = useWorkoutActions({
    state: core.state,
    saveState: core.saveState,
    showToast: core.showToast,
    showScreen: nav.showScreen,
    selectedDate: nav.selectedDate,
    currentWorkout: nav.currentWorkout,
    currentWorkoutId: nav.currentWorkoutId,
    setCurrentWorkoutId: nav.setCurrentWorkoutId,
    selectedWorkouts: nav.selectedWorkouts,
  });

  const exercise = useExerciseActions({
    state: core.state,
    saveState: core.saveState,
    showToast: core.showToast,
  });

  const part = usePartActions({
    state: core.state,
    saveState: core.saveState,
    showToast: core.showToast,
  });

  const backup = useBackup({
    state: core.state,
    setState: core.setState,
    showToast: core.showToast,
    selectedDate: nav.selectedDate,
    setSelectedDate: nav.setSelectedDate,
    setCurrentWorkoutId: nav.setCurrentWorkoutId,
    setCurrentPresetId: presets.setCurrentPresetId,
  });

  function setWeightUnit(weightUnit: WeightUnit) {
    core.saveState((current) => ({ ...current, weightUnit }));
  }

  function openExerciseEditor(part: string, exerciseId: string | null = null) {
    ui.setExerciseEditor({ part, exerciseId });
    nav.showScreen('exerciseEdit');
  }

  function closeExerciseEditor() {
    ui.setExerciseEditor(null);
    nav.showScreen('select');
  }

  /**
   * 新規プリセットの下書きを作成して編集画面を開く
   */
  function createPresetDraft() {
    ui.setPresetDraft({ id: uid(), name: '新規プリセット', exerciseIds: [] });
    nav.showScreen('presetEdit');
  }

  /**
   * 既存プリセットを複製した下書きで編集画面を開く
   */
  function editPreset(presetId: string) {
    const preset = core.state.presets.find((item) => item.id === presetId);
    if (!preset) return;
    ui.setPresetDraft({
      ...preset,
      exerciseIds: [...preset.exerciseIds],
      schedule: preset.schedule
        ? { ...preset.schedule, weekdays: [...preset.schedule.weekdays] }
        : undefined,
    });
    nav.showScreen('presetEdit');
  }

  /**
   * プリセット下書きの一部を更新する
   */
  function updatePresetDraft(update: Partial<Preset>) {
    ui.setPresetDraft((current) => (current ? { ...current, ...update } : current));
  }

  /**
   * プリセット下書きの種目を追加・解除する
   */
  function togglePresetDraftExercise(exerciseId: string) {
    ui.setPresetDraft((current) => {
      if (!current) return current;
      const exerciseIds = current.exerciseIds.includes(exerciseId)
        ? current.exerciseIds.filter((id) => id !== exerciseId)
        : [...current.exerciseIds, exerciseId];
      return { ...current, exerciseIds };
    });
  }

  /**
   * プリセット下書きを保存して計画画面へ戻る
   */
  function savePresetDraft() {
    if (!ui.presetDraft) return;
    presets.savePreset(ui.presetDraft);
    ui.setPresetDraft(null);
    ui.setHistoryView('plan');
    nav.showScreen('history');
  }

  /**
   * プリセット下書きを破棄して計画画面へ戻る
   */
  function cancelPresetDraft() {
    ui.setPresetDraft(null);
    ui.setHistoryView('plan');
    nav.showScreen('history');
  }

  return {
    currentPreset: presets.currentPreset,
    currentWorkout: nav.currentWorkout,
    editMode: ui.editMode,
    presetDraft: ui.presetDraft,
    activePart: ui.activePart,
    exerciseEditor: ui.exerciseEditor,
    groupedExercises: selectors.groupedExercises,
    historyPartFilter: ui.historyPartFilter,
    historyView: ui.historyView,
    partRecentLabels: selectors.partRecentLabels,
    orderedParts: selectors.orderedParts,
    partColors: selectors.partColors,
    screen: nav.screen,
    selectedDate: nav.selectedDate,
    selectedScheduledPresets: selectors.selectedScheduledPresets,
    selectedWorkouts: nav.selectedWorkouts,
    splitPartOptions: selectors.splitPartOptions,
    state: core.state,
    toast: core.toast,
    goalAchievement: ui.goalAchievement,
    actions: {
      addExerciseToPart: exercise.addExerciseToPart,
      addExerciseToToday: workout.addExerciseToToday,
      addSet: workout.addSet,
      reorderPartExercises: exercise.reorderPartExercises,
      createPresetDraft,
      deleteExercise: exercise.deleteExercise,
      deletePreset: presets.deletePreset,
      deleteSet: workout.deleteSet,
      deleteWorkout: workout.deleteWorkout,
      endWorkoutDay: workout.endWorkoutDay,
      exportState: backup.exportState,
      importState: backup.importState,
      moveDate: nav.moveDate,
      moveMonth: nav.moveMonth,
      moveWorkout: workout.moveWorkout,
      openWorkoutDetail: workout.openWorkoutDetail,
      openExerciseEditor,
      editPreset,
      updatePresetDraft,
      togglePresetDraftExercise,
      savePresetDraft,
      cancelPresetDraft,
      resumeWorkoutDay: workout.resumeWorkoutDay,
      selectDate: nav.setSelectedDate,
      selectPreset: presets.setCurrentPresetId,
      setCurrentWorkoutId: nav.setCurrentWorkoutId,
      setHistoryPartFilter: ui.setHistoryPartFilter,
      setHistoryView: ui.setHistoryView,
      setScreen: nav.showScreen,
      setEditMode: ui.setEditMode,
      setWeightUnit,
      startPreset: presets.startPreset,
      addPart: part.addPart,
      deletePart: part.deletePart,
      movePart: part.movePart,
      setPartColor: part.setPartColor,
      selectPart: ui.selectPart,
      updateExercise: exercise.updateExercise,
      updateExerciseGoal: exercise.updateExerciseGoal,
      clearGoalAchievement: () => ui.setGoalAchievement(null),
      closeExerciseEditor,
      updateSet: workout.updateSet,
      updateWorkoutNote: workout.updateWorkoutNote,
      updateSetIntensity: workout.updateSetIntensity,
      updateWorkoutGrip: workout.updateWorkoutGrip,
      updateWorkoutGripStyle: workout.updateWorkoutGripStyle,
    },
  };
}
