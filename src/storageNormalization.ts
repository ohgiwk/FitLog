import { defaultPartColor, paletteColorAt } from './data/partColors';
import { starterCatalogVersion, starterExercises } from './data/starterExercises';
import {
  ExerciseCategory,
  ExerciseGoal,
  ExerciseGoalAchievement,
  MeasurementType,
  PartSetting,
  Preset,
  SetIntensity,
  State,
  TrainingPlanMode,
  WeightUnit,
  WorkoutSet,
} from './types';
import { defaultExerciseCategory, uid } from './utils';

const REST_PART = 'レスト';
const defaultPresets: Preset[] = [
  { id: 'preset-chest-day', name: '胸の日', exerciseIds: [] },
  { id: 'preset-back-day', name: '背中の日', exerciseIds: [] },
  { id: 'preset-leg-day', name: '脚の日', exerciseIds: [] },
  { id: 'preset-shoulder-day', name: '肩の日', exerciseIds: [] },
];
const exerciseKey = (part: string, name: string) => `${part.trim()}::${name.trim()}`;
const starterCategoryByKey = new Map(
  starterExercises.map((exercise) => [
    exerciseKey(exercise.part, exercise.name),
    exercise.category,
  ]),
);

function recordOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredValue(value: unknown): value is string | number {
  return (typeof value === 'string' || typeof value === 'number') && String(value).trim() !== '';
}

function buildPartsFromNames(names: string[]): PartSetting[] {
  const parts: PartSetting[] = [];
  const seen = new Set<string>();
  names.forEach((value) => {
    const name = value.trim();
    if (!name || name === REST_PART || seen.has(name)) return;
    seen.add(name);
    parts.push({ name, color: paletteColorAt(parts.length) });
  });
  return parts;
}

export function createDefaultState(): State {
  return {
    exercises: starterExercises,
    goalAchievements: [],
    workouts: [],
    workoutStartTimes: {},
    workoutEndTimes: {},
    presets: defaultPresets,
    trainingDays: [],
    trainingPlans: [],
    parts: buildPartsFromNames(starterExercises.map((exercise) => exercise.part)),
    weightUnit: 'kg',
    catalogVersion: starterCatalogVersion,
  };
}

export function normalizeState(saved: Partial<State> | null | undefined): State | null {
  if (!saved?.exercises || !saved?.workouts) return null;
  const catalogVersion = typeof saved.catalogVersion === 'number' ? saved.catalogVersion : 1;
  const exercises = normalizeExercises(saved.exercises);
  const mergedExercises =
    catalogVersion < starterCatalogVersion ? mergeStarterExercises(exercises) : exercises;
  const workouts = normalizeWorkouts(saved.workouts);
  const trainingDays = normalizeTrainingDays(saved.trainingDays);
  const trainingPlans = normalizeTrainingPlans(saved.trainingPlans);
  return {
    exercises: mergedExercises,
    goalAchievements: normalizeGoalAchievements(saved.goalAchievements),
    workouts,
    workoutStartTimes: normalizeWorkoutTimes(saved.workoutStartTimes),
    workoutEndTimes: normalizeWorkoutTimes(saved.workoutEndTimes),
    presets: normalizePresets(saved.presets),
    trainingDays,
    trainingPlans,
    parts: normalizePartSettings(
      saved.parts,
      mergedExercises,
      workouts,
      trainingDays,
      trainingPlans,
    ),
    weightUnit: normalizeWeightUnit(saved.weightUnit),
    catalogVersion: starterCatalogVersion,
  };
}

export function parseImportedState(json: string): State | null {
  return normalizeState(JSON.parse(json) as Partial<State> | null);
}

function normalizeWeightUnit(value: unknown): WeightUnit {
  return value === 'lbs' ? 'lbs' : 'kg';
}

function normalizeGoalAchievements(value: unknown): ExerciseGoalAchievement[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((achievement) => {
    const item = recordOf(achievement);
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.exerciseId !== 'string' ||
      typeof item.exerciseName !== 'string' ||
      typeof item.date !== 'string' ||
      !requiredValue(item.weight) ||
      !requiredValue(item.recordValue) ||
      !requiredValue(item.goalWeight) ||
      !requiredValue(item.goalRecordValue)
    ) {
      return [];
    }
    const measurementType = normalizeMeasurementType(item.measurementType);
    const weight = Number(item.weight);
    const recordValue = Number(item.recordValue);
    const goalWeight = Number(item.goalWeight);
    const goalRecordValue = Number(item.goalRecordValue);
    if (
      !Number.isFinite(weight) ||
      !Number.isFinite(recordValue) ||
      !Number.isFinite(goalWeight) ||
      !Number.isFinite(goalRecordValue) ||
      weight < 0 ||
      recordValue <= 0 ||
      goalWeight < 0 ||
      goalRecordValue <= 0
    ) {
      return [];
    }
    return [
      {
        id: item.id,
        exerciseId: item.exerciseId,
        exerciseName: item.exerciseName,
        measurementType,
        date: item.date,
        weight,
        recordValue,
        goalWeight,
        goalRecordValue,
      },
    ];
  });
}

function normalizePartSettings(
  saved: unknown,
  exercises: State['exercises'],
  workouts: State['workouts'],
  trainingDays: State['trainingDays'],
  trainingPlans: State['trainingPlans'],
): PartSetting[] {
  const parts: PartSetting[] = [];
  const seen = new Set<string>();
  if (Array.isArray(saved)) {
    saved.forEach((value) => {
      const item = recordOf(value);
      if (!item) return;
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name || name === REST_PART || seen.has(name)) return;
      const color = typeof item.color === 'string' && item.color ? item.color : defaultPartColor;
      seen.add(name);
      parts.push({ name, color });
    });
  }

  const derived = new Set<string>();
  const collect = (value: string) => {
    const name = value.trim();
    if (name && name !== REST_PART && !seen.has(name)) derived.add(name);
  };
  exercises.forEach((exercise) => collect(exercise.part));
  workouts.forEach((workout) => collect(workout.part));
  trainingDays.forEach((day) => day.parts.forEach(collect));
  trainingPlans.forEach((plan) => collect(plan.part));
  derived.forEach((name) => {
    seen.add(name);
    parts.push({ name, color: paletteColorAt(parts.length) });
  });
  return parts;
}

function normalizePresets(value: unknown): Preset[] {
  if (!Array.isArray(value)) return defaultPresets;
  const presets = value.map((preset) => {
    const item = recordOf(preset) ?? {};
    return {
      id: typeof item.id === 'string' ? item.id : uid(),
      name: typeof item.name === 'string' ? item.name : '名称未設定',
      exerciseIds: Array.isArray(item.exerciseIds)
        ? item.exerciseIds.filter((id): id is string => typeof id === 'string')
        : [],
    };
  });
  const existingNames = new Set(presets.map((preset) => preset.name));
  return [...presets, ...defaultPresets.filter((preset) => !existingNames.has(preset.name))];
}

function normalizeTrainingDays(value: unknown): State['trainingDays'] {
  if (!Array.isArray(value)) return [];
  const byDate = new Map<string, Set<string>>();
  value.forEach((trainingDay) => {
    const item = recordOf(trainingDay);
    if (!item || typeof item.date !== 'string') return;
    const parts = normalizeParts(item.parts ?? item.part);
    if (!parts.length) return;
    const existingParts = byDate.get(item.date) ?? new Set<string>();
    parts.forEach((part) => existingParts.add(part));
    byDate.set(item.date, existingParts);
  });
  return [...byDate].map(([date, parts]) => ({ date, parts: [...parts] }));
}

function normalizeWorkoutTimes(value: unknown): State['workoutStartTimes'] {
  const record = recordOf(value);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && /^\d{2}:\d{2}$/.test(entry[1]),
    ),
  );
}

function normalizeParts(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      values.flatMap((item) => {
        if (typeof item !== 'string') return [];
        const part = item.trim();
        return part ? [part] : [];
      }),
    ),
  ];
}

function normalizeTrainingPlans(value: unknown): State['trainingPlans'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((trainingPlan) => {
    const item = recordOf(trainingPlan);
    if (!item) return [];
    const part = typeof item.part === 'string' ? item.part.trim() : '';
    if (!part) return [];
    return [
      {
        id: typeof item.id === 'string' ? item.id : uid(),
        part,
        mode: normalizeTrainingPlanMode(item.mode),
        weekdays: normalizeWeekdays(item.weekdays),
        intervalDays: normalizeIntervalDays(item.intervalDays),
        startDate: typeof item.startDate === 'string' ? item.startDate : '',
      },
    ];
  });
}

function normalizeTrainingPlanMode(value: unknown): TrainingPlanMode {
  return value === 'interval' ? 'interval' : 'weekly';
}

function normalizeWeekdays(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)),
  ].sort();
}

function normalizeIntervalDays(value: unknown) {
  const days = Number(value);
  return Number.isFinite(days) && days > 0 ? Math.round(days) : 1;
}

function normalizeExercises(value: unknown): State['exercises'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((exercise) => {
    const item = recordOf(exercise);
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.part !== 'string' ||
      typeof item.name !== 'string'
    ) {
      return [];
    }
    return [
      {
        id: item.id,
        part: item.part,
        name: item.name,
        measurementType: normalizeMeasurementType(item.measurementType),
        category: normalizeExerciseCategory(item.category, item.part, item.name),
        goal: normalizeExerciseGoal(item.goal),
      },
    ];
  });
}

function normalizeExerciseGoal(value: unknown): ExerciseGoal | undefined {
  const item = recordOf(value);
  if (!item || !requiredValue(item.weight) || !requiredValue(item.recordValue)) return undefined;
  const weight = Number(item.weight);
  const recordValue = Number(item.recordValue);
  if (!Number.isFinite(weight) || weight < 0) return undefined;
  if (!Number.isFinite(recordValue) || recordValue <= 0) return undefined;
  return { weight, recordValue };
}

function normalizeExerciseCategory(value: unknown, part: string, name: string): ExerciseCategory {
  if (
    value === 'free' ||
    value === 'machine' ||
    value === 'dumbbell' ||
    value === 'cable' ||
    value === 'bodyweight'
  ) {
    return value;
  }
  return starterCategoryByKey.get(exerciseKey(part, name)) ?? defaultExerciseCategory;
}

function normalizeWorkouts(value: unknown): State['workouts'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((workout) => {
    const item = recordOf(workout);
    if (
      !item ||
      typeof item.id !== 'string' ||
      typeof item.exerciseId !== 'string' ||
      typeof item.date !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.part !== 'string'
    ) {
      return [];
    }
    return [
      {
        id: item.id,
        exerciseId: item.exerciseId,
        date: item.date,
        name: item.name,
        part: item.part,
        measurementType: normalizeMeasurementType(item.measurementType),
        sets: normalizeSets(item.sets),
        note: typeof item.note === 'string' ? item.note : '',
      },
    ];
  });
}

function normalizeSets(value: unknown): WorkoutSet[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((set) => {
    const item = recordOf(set);
    if (!item || typeof item.id !== 'string') return [];
    return [
      {
        id: item.id,
        weight: normalizeSetValue(item.weight),
        recordValue: normalizeSetValue(item.recordValue ?? item.reps),
        intensity: normalizeIntensity(item.intensity),
      },
    ];
  });
}

function normalizeSetValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? value : '';
}

function normalizeMeasurementType(value: unknown): MeasurementType {
  return value === 'seconds' ? 'seconds' : 'reps';
}

function normalizeIntensity(value: unknown): SetIntensity | undefined {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
    ? value
    : undefined;
}

function mergeStarterExercises(exercises: State['exercises']) {
  const existingKeys = new Set(
    exercises.map((exercise) => exerciseKey(exercise.part, exercise.name)),
  );
  return [
    ...exercises,
    ...starterExercises.filter(
      (exercise) => !existingKeys.has(exerciseKey(exercise.part, exercise.name)),
    ),
  ];
}
