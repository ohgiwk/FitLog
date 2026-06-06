import { starterCatalogVersion, starterExercises } from "./data/starterExercises";
import { MeasurementType, Preset, State, WorkoutSet } from "./types";
import { uid } from "./utils";

export const storeKey = "fit-log-v2";

export function loadState(): State {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey) || "null") as Partial<State> | null;
    if (saved?.exercises && saved?.workouts) {
      const catalogVersion = typeof saved.catalogVersion === "number" ? saved.catalogVersion : 1;
      const exercises = normalizeExercises(saved.exercises);
      return {
        exercises: catalogVersion < starterCatalogVersion ? mergeStarterExercises(exercises) : exercises,
        workouts: normalizeWorkouts(saved.workouts),
        presets: normalizePresets(saved.presets),
        catalogVersion: starterCatalogVersion,
      };
    }
  } catch {
    localStorage.removeItem(storeKey);
  }
  return { exercises: starterExercises, workouts: [], presets: [], catalogVersion: starterCatalogVersion };
}

function normalizePresets(presets: unknown): Preset[] {
  if (!Array.isArray(presets)) return [];
  return presets.map((preset) => ({
    id: typeof preset.id === "string" ? preset.id : uid(),
    name: typeof preset.name === "string" ? preset.name : "名称未設定",
    exerciseIds: Array.isArray(preset.exerciseIds) ? preset.exerciseIds.filter((id: unknown): id is string => typeof id === "string") : [],
  }));
}

function normalizeExercises(exercises: unknown): State["exercises"] {
  if (!Array.isArray(exercises)) return [];
  return exercises.flatMap((exercise) => {
    if (!exercise || typeof exercise !== "object") return [];
    const item = exercise as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.part !== "string" || typeof item.name !== "string") return [];
    return [{ id: item.id, part: item.part, name: item.name, measurementType: normalizeMeasurementType(item.measurementType) }];
  });
}

function normalizeWorkouts(workouts: unknown): State["workouts"] {
  if (!Array.isArray(workouts)) return [];
  return workouts.flatMap((workout) => {
    if (!workout || typeof workout !== "object") return [];
    const item = workout as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.exerciseId !== "string" ||
      typeof item.date !== "string" ||
      typeof item.name !== "string" ||
      typeof item.part !== "string"
    ) {
      return [];
    }
    return [{
      id: item.id,
      exerciseId: item.exerciseId,
      date: item.date,
      name: item.name,
      part: item.part,
      measurementType: normalizeMeasurementType(item.measurementType),
      sets: normalizeSets(item.sets),
    }];
  });
}

function normalizeSets(sets: unknown): WorkoutSet[] {
  if (!Array.isArray(sets)) return [];
  return sets.flatMap((set) => {
    if (!set || typeof set !== "object") return [];
    const item = set as Record<string, unknown>;
    if (typeof item.id !== "string") return [];
    return [{
      id: item.id,
      weight: normalizeSetValue(item.weight),
      recordValue: normalizeSetValue(item.recordValue ?? item.reps),
    }];
  });
}

function normalizeSetValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : "";
}

function normalizeMeasurementType(value: unknown): MeasurementType {
  return value === "seconds" ? "seconds" : "reps";
}

function mergeStarterExercises(exercises: State["exercises"]) {
  const existingKeys = new Set(exercises.map((exercise) => exerciseKey(exercise.part, exercise.name)));
  const additions = starterExercises.filter((exercise) => !existingKeys.has(exerciseKey(exercise.part, exercise.name)));
  return [...exercises, ...additions];
}

function exerciseKey(part: string, name: string) {
  return `${part.trim()}::${name.trim()}`;
}
