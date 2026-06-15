import { useBackup } from './useBackup';
import { useExerciseActions } from './useExerciseActions';
import { useFitLogCore } from './useFitLogCore';
import { useFitLogSelectors } from './useFitLogSelectors';
import { useFitLogUi } from './useFitLogUi';
import { useNavigation } from './useNavigation';
import { usePartActions } from './usePartActions';
import { usePresetActions } from './usePresetActions';
import { useTrainingPlanActions } from './useTrainingPlanActions';
import { useWorkoutActions } from './useWorkoutActions';

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

  const trainingPlan = useTrainingPlanActions({
    saveState: core.saveState,
    showToast: core.showToast,
    selectedDate: nav.selectedDate,
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
    setCurrentEditingPresetId: presets.setCurrentEditingPresetId,
  });

  return {
    currentPreset: presets.currentPreset,
    currentWorkout: nav.currentWorkout,
    editMode: ui.editMode,
    editingPreset: presets.editingPreset,
    activePart: ui.activePart,
    groupedExercises: selectors.groupedExercises,
    historyPartFilter: ui.historyPartFilter,
    partRecentLabels: selectors.partRecentLabels,
    orderedParts: selectors.orderedParts,
    partColors: selectors.partColors,
    screen: nav.screen,
    selectedDate: nav.selectedDate,
    selectedPlannedParts: selectors.selectedPlannedParts,
    selectedWorkouts: nav.selectedWorkouts,
    splitPartOptions: selectors.splitPartOptions,
    state: core.state,
    toast: core.toast,
    actions: {
      addExerciseToPart: exercise.addExerciseToPart,
      addExerciseToPreset: presets.addExerciseToPreset,
      addExerciseToToday: workout.addExerciseToToday,
      addSet: workout.addSet,
      reorderPartExercises: exercise.reorderPartExercises,
      createPreset: presets.createPreset,
      deleteExercise: exercise.deleteExercise,
      deletePreset: presets.deletePreset,
      deleteSet: workout.deleteSet,
      deleteTrainingPlan: trainingPlan.deleteTrainingPlan,
      deleteWorkout: workout.deleteWorkout,
      exportState: backup.exportState,
      importState: backup.importState,
      moveDate: nav.moveDate,
      moveMonth: nav.moveMonth,
      movePresetExercise: presets.movePresetExercise,
      moveWorkout: workout.moveWorkout,
      openWorkoutDetail: workout.openWorkoutDetail,
      removeExerciseFromPreset: presets.removeExerciseFromPreset,
      renamePreset: presets.renamePreset,
      selectDate: nav.setSelectedDate,
      selectPreset: presets.setCurrentPresetId,
      setCurrentEditingPresetId: presets.setCurrentEditingPresetId,
      setCurrentWorkoutId: nav.setCurrentWorkoutId,
      setHistoryPartFilter: ui.setHistoryPartFilter,
      setScreen: nav.showScreen,
      setEditMode: ui.setEditMode,
      startWorkoutDay: workout.startWorkoutDay,
      startPreset: presets.startPreset,
      addTrainingPlan: trainingPlan.addTrainingPlan,
      upsertTrainingPlan: trainingPlan.upsertTrainingPlan,
      addPart: part.addPart,
      deletePart: part.deletePart,
      movePart: part.movePart,
      setPartColor: part.setPartColor,
      selectPart: ui.selectPart,
      updateExercise: exercise.updateExercise,
      updateSet: workout.updateSet,
      updateSetIntensity: workout.updateSetIntensity,
    },
  };
}
