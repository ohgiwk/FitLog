import { starterCatalogVersion, starterExercises } from "./data/starterExercises";
import { Preset, State } from "./types";
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
        workouts: saved.workouts,
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
    return [{ id: item.id, part: item.part, name: item.name }];
  });
}

function mergeStarterExercises(exercises: State["exercises"]) {
  const existingKeys = new Set(exercises.map((exercise) => exerciseKey(exercise.part, exercise.name)));
  const additions = starterExercises.filter((exercise) => !existingKeys.has(exerciseKey(exercise.part, exercise.name)));
  return [...exercises, ...additions];
}

function exerciseKey(part: string, name: string) {
  return `${part.trim()}::${name.trim()}`;
}
