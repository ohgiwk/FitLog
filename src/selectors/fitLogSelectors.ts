import { Exercise, Preset, State, Workout } from "../types";
import { isBlank, newSet, parseDate, uid } from "../utils";

export function findCurrentWorkout(workouts: Workout[], currentWorkoutId: string | null, selectedDate: string, selectedWorkouts: Workout[]) {
  if (!currentWorkoutId) return null;
  const current = workouts.find((workout) => workout.id === currentWorkoutId);
  if (current?.date === selectedDate) return current;
  return selectedWorkouts.find((workout) => workout.id === currentWorkoutId) || null;
}

export function findCurrentPreset(presets: Preset[], currentPresetId: string | null) {
  return presets.find((preset) => preset.id === currentPresetId) || presets[0] || null;
}

export function buildSplitPartOptions(exercises: Exercise[], workouts: Workout[], trainingDays: State["trainingDays"], trainingPlans: State["trainingPlans"]) {
  const parts = new Set<string>();
  exercises.forEach((exercise) => parts.add(exercise.part));
  workouts.forEach((workout) => parts.add(workout.part));
  trainingDays.forEach((day) => day.parts.forEach((part) => parts.add(part)));
  trainingPlans.forEach((plan) => parts.add(plan.part));
  parts.delete("");
  return [...parts].sort((a, b) => a.localeCompare(b, "ja"));
}

export function plannedPartsForDate(date: string, trainingPlans: State["trainingPlans"]) {
  const target = parseDate(date);
  const weekday = target.getDay();
  return [...new Set(trainingPlans.flatMap((plan) => {
    if (plan.mode === "weekly") return plan.weekdays.includes(weekday) ? [plan.part] : [];
    const start = plan.startDate ? parseDate(plan.startDate) : target;
    const days = Math.floor((target.getTime() - start.getTime()) / 86400000);
    return days >= 0 && days % plan.intervalDays === 0 ? [plan.part] : [];
  }))];
}

export function buildPartRecentLabels(groupedExercises: Map<string, Exercise[]>, workouts: Workout[], selectedDate: string) {
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

export function createWorkout(exercise: Exercise, date: string): Workout {
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
