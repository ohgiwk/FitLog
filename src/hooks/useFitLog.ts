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
    showScreen: nav.showScreen,
    selectedDate: nav.selectedDate,
    setCurrentWorkoutId: nav.setCurrentWorkoutId,
    partInput: ui.partInput,
    nameInput: ui.nameInput,
    measurementTypeInput: ui.measurementTypeInput,
    setNameInput: ui.setNameInput,
    setMeasurementTypeInput: ui.setMeasurementTypeInput,
    setAddFormOpen: ui.setAddFormOpen,
    setDraggingExerciseId: ui.setDraggingExerciseId,
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
    addFormOpen: ui.addFormOpen,
    currentPreset: presets.currentPreset,
    currentWorkout: nav.currentWorkout,
    draggingExerciseId: ui.draggingExerciseId,
    editMode: ui.editMode,
    editingPreset: presets.editingPreset,
    expandedParts: ui.expandedParts,
    groupedExercises: selectors.groupedExercises,
    historyPartFilter: ui.historyPartFilter,
    partRecentLabels: selectors.partRecentLabels,
    orderedParts: selectors.orderedParts,
    partColors: selectors.partColors,
    nameInput: ui.nameInput,
    measurementTypeInput: ui.measurementTypeInput,
    partInput: ui.partInput,
    screen: nav.screen,
    selectedDate: nav.selectedDate,
    selectedPlannedParts: selectors.selectedPlannedParts,
    selectedWorkouts: nav.selectedWorkouts,
    splitPartOptions: selectors.splitPartOptions,
    state: core.state,
    toast: core.toast,
    actions: {
      addCustomExercise: exercise.addCustomExercise,
      addExerciseToPreset: presets.addExerciseToPreset,
      addExerciseToToday: workout.addExerciseToToday,
      addSet: workout.addSet,
      commitExerciseOrder: exercise.commitExerciseOrder,
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
      setAddFormOpen: ui.setAddFormOpen,
      setCurrentEditingPresetId: presets.setCurrentEditingPresetId,
      setCurrentWorkoutId: nav.setCurrentWorkoutId,
      setDraggingExerciseId: ui.setDraggingExerciseId,
      setHistoryPartFilter: ui.setHistoryPartFilter,
      setNameInput: ui.setNameInput,
      setMeasurementTypeInput: ui.setMeasurementTypeInput,
      setPartInput: ui.setPartInput,
      setScreen: nav.showScreen,
      setEditMode: ui.setEditMode,
      startPointerExerciseDrag: exercise.startPointerExerciseDrag,
      startPreset: presets.startPreset,
      addTrainingPlan: trainingPlan.addTrainingPlan,
      upsertTrainingPlan: trainingPlan.upsertTrainingPlan,
      addPart: part.addPart,
      deletePart: part.deletePart,
      movePart: part.movePart,
      setPartColor: part.setPartColor,
      togglePartExpanded: ui.togglePartExpanded,
      updateExerciseMeasurementType: exercise.updateExerciseMeasurementType,
      updateSet: workout.updateSet,
      updateSetIntensity: workout.updateSetIntensity,
    },
  };
}
