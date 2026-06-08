import { FormEvent, PointerEvent, useEffect, useMemo, useState } from "react";
import { loadState, storeKey } from "../storage";
import { Exercise, MeasurementType, Preset, Screen, SetIntensity, State, TrainingPlanMode, Workout } from "../types";
import { dragAfterElement, groupExercises, isBlank, localDate, newSet, parseDate, uid } from "../utils";

export function useFitLog() {
  const [selectedDate, setSelectedDate] = useState(() => localDate(new Date()));
  const [state, setState] = useState<State>(() => loadState());
  const [screen, setScreen] = useState<Screen>("home");
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
  const [currentEditingPresetId, setCurrentEditingPresetId] = useState<string | null>(null);
  const [historyPartFilter, setHistoryPartFilter] = useState("ALL");
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
  const splitPartOptions = useMemo(() => buildSplitPartOptions(state.exercises, state.workouts, state.trainingDays, state.trainingPlans), [state.exercises, state.trainingDays, state.trainingPlans, state.workouts]);
  const selectedPlannedParts = useMemo(() => plannedPartsForDate(selectedDate, state.trainingPlans), [selectedDate, state.trainingPlans]);
  const partRecentLabels = useMemo(
    () => buildPartRecentLabels(groupedExercises, state.workouts, selectedDate),
    [groupedExercises, selectedDate, state.workouts]
  );
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
      const recordedSets = workout.sets.filter((set) => !isBlank(set.weight) || !isBlank(set.recordValue));
      if (!recordedSets.length) return prev;
      if (recordedSets.length === workout.sets.length) return prev;
      const workouts = prev.workouts.map((item) => (item.id === workout.id ? { ...item, sets: recordedSets } : item));
      return { ...prev, workouts };
    });
  }

  function openWorkoutDetail(workoutId: string) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) => {
        if (workout.id !== workoutId || workout.sets.length >= 5) return workout;
        return {
          ...workout,
          sets: [...workout.sets, ...Array.from({ length: 5 - workout.sets.length }, () => newSet())],
        };
      }),
    }));
    setCurrentWorkoutId(workoutId);
    showScreen("detail");
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

  function addTrainingPlan(part: string, mode: TrainingPlanMode, weekdays: number[], intervalDays: number, startDate: string) {
    const normalizedPart = part.trim();
    if (!normalizedPart) return showToast("部位を選択してください");
    if (mode === "weekly" && !weekdays.length) return showToast("曜日を選択してください");
    if (mode === "interval" && (!intervalDays || intervalDays < 1)) return showToast("間隔を入力してください");
    const plan = {
      id: uid(),
      part: normalizedPart,
      mode,
      weekdays: mode === "weekly" ? [...new Set(weekdays)].sort() : [],
      intervalDays: mode === "interval" ? Math.max(1, Math.round(intervalDays)) : 1,
      startDate: startDate || selectedDate,
    };
    saveState((prev) => {
      const existing = prev.trainingPlans.find((item) => item.part === normalizedPart);
      const trainingPlans = existing
        ? prev.trainingPlans.map((item) => (item.id === existing.id ? { ...plan, id: existing.id } : item))
        : [plan, ...prev.trainingPlans];
      return { ...prev, trainingPlans };
    });
    showToast("計画を保存しました");
  }

  function deleteTrainingPlan(planId: string) {
    saveState((prev) => ({ ...prev, trainingPlans: prev.trainingPlans.filter((plan) => plan.id !== planId) }));
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
    openWorkoutDetail(workout.id);
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

  function deleteWorkout(workoutId: string) {
    saveState((prev) => ({ ...prev, workouts: prev.workouts.filter((workout) => workout.id !== workoutId) }));
    if (currentWorkoutId === workoutId) setCurrentWorkoutId(null);
    showToast("種目の記録を削除しました");
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
    const todayExerciseIds = new Set(state.workouts.filter((workout) => workout.date === selectedDate).map((workout) => workout.exerciseId));
    const queuedExerciseIds = new Set<string>();
    const exercisesToAdd = preset.exerciseIds.flatMap((exerciseId) => {
      if (todayExerciseIds.has(exerciseId) || queuedExerciseIds.has(exerciseId)) return [];
      const exercise = state.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return [];
      queuedExerciseIds.add(exerciseId);
      return [exercise];
    });
    if (!exercisesToAdd.length) {
      showScreen("home");
      const hasExisting = preset.exerciseIds.some((exerciseId) => todayExerciseIds.has(exerciseId));
      return showToast(hasExisting ? "すでに追加されています" : "プリセットの種目が見つかりません");
    }
    const newWorkouts = exercisesToAdd.map((exercise) => createWorkout(exercise, selectedDate));
    saveState((prev) => ({ ...prev, workouts: [...prev.workouts, ...newWorkouts] }));
    showScreen("home");
    showToast(`${exercisesToAdd.length}種目を追加しました`);
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
    historyPartFilter,
    partRecentLabels,
    nameInput,
    measurementTypeInput,
    partInput,
    screen,
    selectedDate,
    selectedPlannedParts,
    selectedWorkouts,
    splitPartOptions,
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
      deleteTrainingPlan,
      deleteWorkout,
      moveDate,
      moveMonth,
      movePresetExercise,
      moveWorkout,
      openWorkoutDetail,
      removeExerciseFromPreset,
      renamePreset,
      selectDate: setSelectedDate,
      selectPreset: setCurrentPresetId,
      setAddFormOpen,
      setCurrentEditingPresetId,
      setCurrentWorkoutId,
      setDraggingExerciseId,
      setHistoryPartFilter,
      setNameInput,
      setMeasurementTypeInput,
      setPartInput,
      setScreen: showScreen,
      setEditMode,
      startPointerExerciseDrag,
      startPreset,
      addTrainingPlan,
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

function buildSplitPartOptions(exercises: Exercise[], workouts: Workout[], trainingDays: State["trainingDays"], trainingPlans: State["trainingPlans"]) {
  const parts = new Set<string>();
  exercises.forEach((exercise) => parts.add(exercise.part));
  workouts.forEach((workout) => parts.add(workout.part));
  trainingDays.forEach((day) => day.parts.forEach((part) => parts.add(part)));
  trainingPlans.forEach((plan) => parts.add(plan.part));
  parts.delete("");
  return [...parts].sort((a, b) => a.localeCompare(b, "ja"));
}

function plannedPartsForDate(date: string, trainingPlans: State["trainingPlans"]) {
  const target = parseDate(date);
  const weekday = target.getDay();
  return [...new Set(trainingPlans.flatMap((plan) => {
    if (plan.mode === "weekly") return plan.weekdays.includes(weekday) ? [plan.part] : [];
    const start = plan.startDate ? parseDate(plan.startDate) : target;
    const days = Math.floor((target.getTime() - start.getTime()) / 86400000);
    return days >= 0 && days % plan.intervalDays === 0 ? [plan.part] : [];
  }))];
}

function buildPartRecentLabels(groupedExercises: Map<string, Exercise[]>, workouts: Workout[], selectedDate: string) {
  const selectedTime = parseDate(selectedDate).getTime();
  const labels = new Map<string, string>();
  groupedExercises.forEach((exercises, part) => {
    const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
    const latest = workouts
      .filter((workout) =>
        exerciseIds.has(workout.exerciseId) &&
        workout.date <= selectedDate &&
        workout.sets.some((set) => !isBlank(set.weight) || !isBlank(set.recordValue))
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!latest) {
      labels.set(part, "履歴なし");
      return;
    }

    const daysAgo = Math.max(0, Math.round((selectedTime - parseDate(latest.date).getTime()) / 86400000));
    labels.set(part, daysAgo === 0 ? "今日" : `${daysAgo}日前`);
  });
  return labels;
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
