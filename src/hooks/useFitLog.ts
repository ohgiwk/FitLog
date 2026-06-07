import { FormEvent, PointerEvent, useEffect, useMemo, useState } from "react";
import { loadState, storeKey } from "../storage";
import { Exercise, MeasurementType, Preset, Screen, SetIntensity, State, Workout } from "../types";
import { dragAfterElement, groupExercises, isBlank, localDate, newSet, parseDate, uid } from "../utils";

export function useFitLog() {
  const [selectedDate, setSelectedDate] = useState(() => localDate(new Date()));
  const [state, setState] = useState<State>(() => loadState());
  const [screen, setScreen] = useState<Screen>("home");
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
  const [currentEditingPresetId, setCurrentEditingPresetId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [expandedParts, setExpandedParts] = useState<Set<string>>(() => new Set());
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [partInput, setPartInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [measurementTypeInput, setMeasurementTypeInput] = useState<MeasurementType>("reps");
  const [toast, setToast] = useState("");
  const [draggingExerciseId, setDraggingExerciseId] = useState<string | null>(null);

  const selectedWorkouts = useMemo(
    () => state.workouts.filter((workout) => workout.date === selectedDate),
    [selectedDate, state.workouts]
  );
  const groupedExercises = useMemo(() => groupExercises(state.exercises), [state.exercises]);
  const currentWorkout = useMemo(() => findCurrentWorkout(state.workouts, currentWorkoutId, selectedDate, selectedWorkouts), [currentWorkoutId, selectedDate, selectedWorkouts, state.workouts]);
  const currentPreset = useMemo(() => findCurrentPreset(state.presets, currentPresetId), [currentPresetId, state.presets]);
  const editingPreset = useMemo(() => state.presets.find((preset) => preset.id === currentEditingPresetId) || null, [currentEditingPresetId, state.presets]);

  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!currentPreset && state.presets.length) setCurrentPresetId(state.presets[0].id);
    if (!state.presets.length) setCurrentPresetId(null);
  }, [currentPreset, state.presets]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message: string) {
    setToast(message);
  }

  function showScreen(next: Screen) {
    if (next !== "detail" && next !== "exerciseHistory") cleanupBlankDetailSets();
    if (next !== "select") setEditMode(false);
    setScreen(next);
  }

  function saveState(updater: (draft: State) => State) {
    setState((prev) => updater(prev));
  }

  function cleanupBlankDetailSets() {
    if (screen !== "detail" || !currentWorkout) return;
    saveState((prev) => {
      const workout = prev.workouts.find((item) => item.id === currentWorkout.id);
      if (!workout) return prev;
      const nextSets = workout.sets.filter((set) => !isBlank(set.weight) || !isBlank(set.recordValue));
      if (nextSets.length === workout.sets.length && nextSets.length) return prev;
      const workouts = nextSets.length
        ? prev.workouts.map((item) => (item.id === workout.id ? { ...item, sets: nextSets } : item))
        : prev.workouts.filter((item) => item.id !== workout.id);
      if (!nextSets.length) setCurrentWorkoutId(null);
      return { ...prev, workouts };
    });
  }

  function moveDate(days: number) {
    const next = parseDate(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(localDate(next));
    setCurrentWorkoutId(null);
    showScreen("home");
  }

  function moveMonth(delta: number) {
    const next = parseDate(selectedDate);
    next.setMonth(next.getMonth() + delta, 1);
    setSelectedDate(localDate(next));
    setCurrentWorkoutId(null);
  }

  function addExerciseToToday(exerciseId: string) {
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    const existing = state.workouts.find((item) => item.date === selectedDate && item.exerciseId === exerciseId);
    const workout = existing || createWorkout(exercise, selectedDate);
    saveState((prev) => {
      if (existing) return prev;
      return { ...prev, workouts: [...prev.workouts, workout] };
    });
    setCurrentWorkoutId(workout.id);
    showScreen("detail");
  }

  function addCustomExercise(event: FormEvent) {
    event.preventDefault();
    const part = partInput.trim() || "その他";
    const name = nameInput.trim();
    if (!name) return showToast("種目名を入力してください");

    const exercise: Exercise = { id: uid(), part, name, measurementType: measurementTypeInput };
    const workout = createWorkout(exercise, selectedDate);
    saveState((prev) => ({ ...prev, exercises: [exercise, ...prev.exercises], workouts: [...prev.workouts, workout] }));
    setCurrentWorkoutId(workout.id);
    setNameInput("");
    setMeasurementTypeInput("reps");
    setAddFormOpen(false);
    showScreen("detail");
  }

  function addSet(workoutId: string) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) =>
        workout.id === workoutId ? { ...workout, sets: [...workout.sets, newSet()] } : workout
      ),
    }));
    setCurrentWorkoutId(workoutId);
    showScreen("detail");
  }

  function updateSet(setId: string, field: "weight" | "recordValue" | "note", value: string) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) => ({
        ...workout,
        sets: workout.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
      })),
    }));
  }

  function updateSetIntensity(setId: string, intensity?: SetIntensity) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) => ({
        ...workout,
        sets: workout.sets.map((set) => {
          if (set.id !== setId) return set;
          if (!intensity) {
            const nextSet = { ...set };
            delete nextSet.intensity;
            return nextSet;
          }
          return { ...set, intensity };
        }),
      })),
    }));
  }

  function updateExerciseMeasurementType(exerciseId: string, measurementType: MeasurementType) {
    saveState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, measurementType } : exercise
      ),
    }));
  }

  function deleteSet(setId: string) {
    if (!currentWorkout) return;
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) =>
        workout.id === currentWorkout.id ? { ...workout, sets: workout.sets.filter((set) => set.id !== setId) } : workout
      ),
    }));
  }

  function moveWorkout(workoutId: string, direction: number) {
    const index = selectedWorkouts.findIndex((workout) => workout.id === workoutId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= selectedWorkouts.length) return;
    saveState((prev) => {
      const currentGlobalIndex = prev.workouts.findIndex((workout) => workout.id === selectedWorkouts[index].id);
      const nextGlobalIndex = prev.workouts.findIndex((workout) => workout.id === selectedWorkouts[nextIndex].id);
      const workouts = [...prev.workouts];
      [workouts[currentGlobalIndex], workouts[nextGlobalIndex]] = [workouts[nextGlobalIndex], workouts[currentGlobalIndex]];
      return { ...prev, workouts };
    });
  }

  function createPreset() {
    const preset: Preset = { id: uid(), name: "新規プリセット", exerciseIds: [] };
    saveState((prev) => ({ ...prev, presets: [preset, ...prev.presets] }));
    setCurrentPresetId(preset.id);
    setCurrentEditingPresetId(preset.id);
    showScreen("presetEdit");
  }

  function renamePreset(presetId: string, name: string) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) =>
        preset.id === presetId ? { ...preset, name: name.trim() || "名称未設定" } : preset
      ),
    }));
  }

  function deletePreset(presetId: string) {
    saveState((prev) => ({ ...prev, presets: prev.presets.filter((preset) => preset.id !== presetId) }));
    if (currentPresetId === presetId) setCurrentPresetId(null);
    if (currentEditingPresetId === presetId) setCurrentEditingPresetId(null);
    showScreen("preset");
  }

  function addExerciseToPreset(presetId: string, exerciseId: string) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) =>
        preset.id === presetId && !preset.exerciseIds.includes(exerciseId)
          ? { ...preset, exerciseIds: [...preset.exerciseIds, exerciseId] }
          : preset
      ),
    }));
  }

  function removeExerciseFromPreset(presetId: string, exerciseId: string) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) =>
        preset.id === presetId ? { ...preset, exerciseIds: preset.exerciseIds.filter((id) => id !== exerciseId) } : preset
      ),
    }));
  }

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

  function startPreset(presetId: string) {
    const preset = state.presets.find((item) => item.id === presetId);
    if (!preset || !preset.exerciseIds.length) return showToast("プリセットに種目を追加してください");
    let added = 0;
    saveState((prev) => {
      const todayExerciseIds = new Set(prev.workouts.filter((workout) => workout.date === selectedDate).map((workout) => workout.exerciseId));
      const workouts = [...prev.workouts];
      preset.exerciseIds.forEach((exerciseId) => {
        if (todayExerciseIds.has(exerciseId)) return;
        const exercise = prev.exercises.find((item) => item.id === exerciseId);
        if (!exercise) return;
        workouts.push(createWorkout(exercise, selectedDate));
        todayExerciseIds.add(exerciseId);
        added += 1;
      });
      return { ...prev, workouts };
    });
    showScreen("home");
    showToast(added ? `${added}種目を追加しました` : "すでに追加されています");
  }

  function deleteExercise(exerciseId: string) {
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    saveState((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((item) => item.id !== exerciseId),
      presets: prev.presets.map((preset) => ({
        ...preset,
        exerciseIds: preset.exerciseIds.filter((id) => id !== exerciseId),
      })),
    }));
    showToast(`${exercise.name}を削除しました`);
  }

  function commitExerciseOrder(rows: HTMLElement[]) {
    const byId = new Map(state.exercises.map((exercise) => [exercise.id, exercise]));
    const ordered: Exercise[] = [];
    rows.forEach((row) => {
      const exercise = byId.get(row.dataset.exerciseRow || "");
      const part = row.closest<HTMLElement>("[data-part-list]")?.dataset.partList;
      if (!exercise || !part) return;
      ordered.push({ ...exercise, part });
    });
    state.exercises.forEach((exercise) => {
      if (!ordered.some((item) => item.id === exercise.id)) ordered.push(exercise);
    });
    saveState((prev) => ({
      ...prev,
      exercises: ordered,
      workouts: prev.workouts.map((workout) => {
        const exercise = ordered.find((item) => item.id === workout.exerciseId);
        return exercise ? { ...workout, name: exercise.name, part: exercise.part } : workout;
      }),
    }));
  }

  function startPointerExerciseDrag(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-row-action]")) return;
    const row = event.currentTarget;
    let moved = false;
    setDraggingExerciseId(row.dataset.exerciseRow || null);
    row.setPointerCapture(event.pointerId);
    row.classList.add("dragging");

    const move = (moveEvent: globalThis.PointerEvent) => {
      moved = true;
      const list = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLElement>("[data-part-list]");
      if (!list) return;
      document.querySelectorAll(".drop-target").forEach((item) => item.classList.toggle("drop-target", item === list));
      const after = dragAfterElement(list, moveEvent.clientY);
      if (after) list.insertBefore(row, after);
      else list.appendChild(row);
    };

    const end = () => {
      row.classList.remove("dragging");
      document.querySelectorAll(".drop-target").forEach((list) => list.classList.remove("drop-target"));
      row.removeEventListener("pointermove", move);
      row.removeEventListener("pointerup", end);
      row.removeEventListener("pointercancel", end);
      if (moved) commitExerciseOrder(Array.from(document.querySelectorAll<HTMLElement>("[data-exercise-row]")));
      setDraggingExerciseId(null);
    };

    row.addEventListener("pointermove", move);
    row.addEventListener("pointerup", end);
    row.addEventListener("pointercancel", end);
  }

  function togglePartExpanded(part: string) {
    setExpandedParts((prev) => {
      const next = new Set(prev);
      if (next.has(part)) next.delete(part);
      else next.add(part);
      return next;
    });
  }

  return {
    addFormOpen,
    currentPreset,
    currentWorkout,
    draggingExerciseId,
    editMode,
    editingPreset,
    expandedParts,
    groupedExercises,
    nameInput,
    measurementTypeInput,
    partInput,
    screen,
    selectedDate,
    selectedWorkouts,
    state,
    toast,
    actions: {
      addCustomExercise,
      addExerciseToPreset,
      addExerciseToToday,
      addSet,
      commitExerciseOrder,
      createPreset,
      deleteExercise,
      deletePreset,
      deleteSet,
      moveDate,
      moveMonth,
      movePresetExercise,
      moveWorkout,
      removeExerciseFromPreset,
      renamePreset,
      selectDate: setSelectedDate,
      selectPreset: setCurrentPresetId,
      setAddFormOpen,
      setCurrentEditingPresetId,
      setCurrentWorkoutId,
      setDraggingExerciseId,
      setNameInput,
      setMeasurementTypeInput,
      setPartInput,
      setScreen: showScreen,
      setEditMode,
      startPointerExerciseDrag,
      startPreset,
      togglePartExpanded,
      updateExerciseMeasurementType,
      updateSet,
      updateSetIntensity,
    },
  };
}

function findCurrentWorkout(workouts: Workout[], currentWorkoutId: string | null, selectedDate: string, selectedWorkouts: Workout[]) {
  if (!currentWorkoutId) return null;
  const current = workouts.find((workout) => workout.id === currentWorkoutId);
  if (current?.date === selectedDate) return current;
  return selectedWorkouts.find((workout) => workout.id === currentWorkoutId) || null;
}

function findCurrentPreset(presets: Preset[], currentPresetId: string | null) {
  return presets.find((preset) => preset.id === currentPresetId) || presets[0] || null;
}

function createWorkout(exercise: Exercise, date: string): Workout {
  return {
    id: uid(),
    exerciseId: exercise.id,
    date,
    name: exercise.name,
    part: exercise.part,
    measurementType: exercise.measurementType,
    sets: Array.from({ length: 5 }, () => newSet()),
  };
}
