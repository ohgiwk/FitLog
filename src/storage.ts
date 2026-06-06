import { starterExercises } from "./data/starterExercises";
import { Preset, State } from "./types";
import { uid } from "./utils";

export const storeKey = "fit-log-v2";

export function loadState(): State {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey) || "null") as Partial<State> | null;
    if (saved?.exercises && saved?.workouts) {
      return {
        exercises: saved.exercises,
        workouts: saved.workouts,
        presets: normalizePresets(saved.presets),
      };
    }
  } catch {
    localStorage.removeItem(storeKey);
  }
  return { exercises: starterExercises, workouts: [], presets: [] };
}

function normalizePresets(presets: unknown): Preset[] {
  if (!Array.isArray(presets)) return [];
  return presets.map((preset) => ({
    id: typeof preset.id === "string" ? preset.id : uid(),
    name: typeof preset.name === "string" ? preset.name : "名称未設定",
    exerciseIds: Array.isArray(preset.exerciseIds) ? preset.exerciseIds.filter((id: unknown): id is string => typeof id === "string") : [],
  }));
}
