import { starterCatalogVersion, starterExercises } from './data/starterExercises';
import { defaultPartColor, paletteColorAt } from './data/partColors';
import {
  ExerciseCategory,
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

/**
 * 初期種目のカテゴリを「部位::種目名」から引くためのマップ。
 * 旧データ(カテゴリ未設定)を読み込むときのフォールバックに使う
 */
const starterCategoryByKey = new Map(
  starterExercises.map((exercise) => [
    exerciseKey(exercise.part, exercise.name),
    exercise.category,
  ]),
);

/**
 * 並び・色管理の対象外にする特別な部位
 */
const REST_PART = 'レスト';

export const storeKey = 'fit-log-v2';

/**
 * 読み込みに失敗した壊れた保存データの退避先キー。
 * 元データを削除する代わりにここへ退避し、後から復旧できるようにする
 */
export const corruptStoreKey = 'fit-log-v2-corrupt';

const defaultPresets: Preset[] = [
  { id: 'preset-chest-day', name: '胸の日', exerciseIds: [] },
  { id: 'preset-back-day', name: '背中の日', exerciseIds: [] },
  { id: 'preset-leg-day', name: '脚の日', exerciseIds: [] },
  { id: 'preset-shoulder-day', name: '肩の日', exerciseIds: [] },
];

/**
 * loadState の結果。state に加え、壊れたデータから初期化へ復帰したかを返す
 */
export type LoadResult = {
  state: State;
  recoveredFromCorruption: boolean;
};

/**
 * 部位名の配列から、表示順つきの部位設定(色つき)を作る。
 * 色はパレットを順番に循環して割り当てる
 */
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

/**
 * 何も保存されていないときに使う初期状態を作る
 */
function createDefaultState(): State {
  return {
    exercises: starterExercises,
    workouts: [],
    workoutStartTimes: {},
    presets: defaultPresets,
    trainingDays: [],
    trainingPlans: [],
    parts: buildPartsFromNames(starterExercises.map((exercise) => exercise.part)),
    weightUnit: 'kg',
    catalogVersion: starterCatalogVersion,
  };
}

/**
 * 壊れた保存データを退避先キーへコピーする。元データは削除しない。
 * 退避自体に失敗しても元データは storeKey 側に残るため、ここでは何もしない
 */
function preserveCorruptState(raw: string) {
  try {
    localStorage.setItem(corruptStoreKey, raw);
  } catch {
    // 退避できなくても元データは保持されるため、ここでは握りつぶす
  }
}

export function loadState(): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storeKey);
  } catch {
    return { state: createDefaultState(), recoveredFromCorruption: false };
  }
  if (!raw || raw === 'null') {
    return { state: createDefaultState(), recoveredFromCorruption: false };
  }
  try {
    const saved = JSON.parse(raw) as Partial<State> | null;
    const normalized = normalizeState(saved);
    if (normalized) return { state: normalized, recoveredFromCorruption: false };
  } catch {
    // 解析に失敗。データは消さず下で退避する
  }
  preserveCorruptState(raw);
  return { state: createDefaultState(), recoveredFromCorruption: true };
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
    workouts,
    workoutStartTimes: normalizeWorkoutStartTimes(saved.workoutStartTimes),
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

function normalizeWeightUnit(value: unknown): WeightUnit {
  return value === 'lbs' ? 'lbs' : 'kg';
}

/**
 * 保存済みの部位設定を正規化し、データ上だけに存在する部位を補う。
 * - 保存済み設定(名前・色)を順序を保って取り込む
 * - 種目などに現れる未登録の部位を後ろへ追加し、パレット色を割り当てる
 * - 「レスト」は対象外にする
 */
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
    saved.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      if (!name || name === REST_PART || seen.has(name)) return;
      const color =
        typeof record.color === 'string' && record.color ? record.color : defaultPartColor;
      seen.add(name);
      parts.push({ name, color });
    });
  }

  const derived: string[] = [];
  const collect = (value: string) => {
    const name = value.trim();
    if (!name || name === REST_PART || seen.has(name) || derived.includes(name)) return;
    derived.push(name);
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

export function parseImportedState(json: string): State | null {
  const parsed = JSON.parse(json) as Partial<State> | null;
  return normalizeState(parsed);
}

function normalizePresets(presets: unknown): Preset[] {
  if (!Array.isArray(presets)) return defaultPresets;
  const normalizedPresets = presets.map((preset) => {
    const item = (preset ?? {}) as Record<string, unknown>;
    return {
      id: typeof item.id === 'string' ? item.id : uid(),
      name: typeof item.name === 'string' ? item.name : '名称未設定',
      exerciseIds: Array.isArray(item.exerciseIds)
        ? item.exerciseIds.filter((id: unknown): id is string => typeof id === 'string')
        : [],
    };
  });
  return mergeDefaultPresets(normalizedPresets);
}

function normalizeTrainingDays(trainingDays: unknown): State['trainingDays'] {
  if (!Array.isArray(trainingDays)) return [];
  const byDate = new Map<string, Set<string>>();
  trainingDays.forEach((trainingDay) => {
    if (!trainingDay || typeof trainingDay !== 'object') return;
    const item = trainingDay as Record<string, unknown>;
    if (typeof item.date !== 'string') return;
    const parts = normalizeParts(item.parts ?? item.part);
    if (!parts.length) return;
    const existingParts = byDate.get(item.date) || new Set<string>();
    parts.forEach((part) => existingParts.add(part));
    byDate.set(item.date, existingParts);
  });
  return [...byDate].map(([date, parts]) => ({ date, parts: [...parts] }));
}

function normalizeWorkoutStartTimes(value: unknown): State['workoutStartTimes'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([date, time]) => {
      if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return [];
      return [[date, time]];
    }),
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

function normalizeTrainingPlans(trainingPlans: unknown): State['trainingPlans'] {
  if (!Array.isArray(trainingPlans)) return [];
  return trainingPlans.flatMap((trainingPlan) => {
    if (!trainingPlan || typeof trainingPlan !== 'object') return [];
    const item = trainingPlan as Record<string, unknown>;
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

function mergeDefaultPresets(presets: Preset[]) {
  const existingNames = new Set(presets.map((preset) => preset.name));
  const additions = defaultPresets.filter((preset) => !existingNames.has(preset.name));
  return [...presets, ...additions];
}

function normalizeExercises(exercises: unknown): State['exercises'] {
  if (!Array.isArray(exercises)) return [];
  return exercises.flatMap((exercise) => {
    if (!exercise || typeof exercise !== 'object') return [];
    const item = exercise as Record<string, unknown>;
    if (
      typeof item.id !== 'string' ||
      typeof item.part !== 'string' ||
      typeof item.name !== 'string'
    )
      return [];
    return [
      {
        id: item.id,
        part: item.part,
        name: item.name,
        measurementType: normalizeMeasurementType(item.measurementType),
        category: normalizeExerciseCategory(item.category, item.part, item.name),
      },
    ];
  });
}

/**
 * 種目の器具カテゴリを正規化する。
 * 未設定や不正な値のときは、初期種目に同名があればそのカテゴリを、なければ既定値を使う
 */
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

function normalizeWorkouts(workouts: unknown): State['workouts'] {
  if (!Array.isArray(workouts)) return [];
  return workouts.flatMap((workout) => {
    if (!workout || typeof workout !== 'object') return [];
    const item = workout as Record<string, unknown>;
    if (
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
      },
    ];
  });
}

function normalizeSets(sets: unknown): WorkoutSet[] {
  if (!Array.isArray(sets)) return [];
  return sets.flatMap((set) => {
    if (!set || typeof set !== 'object') return [];
    const item = set as Record<string, unknown>;
    if (typeof item.id !== 'string') return [];
    return [
      {
        id: item.id,
        weight: normalizeSetValue(item.weight),
        recordValue: normalizeSetValue(item.recordValue ?? item.reps),
        intensity: normalizeIntensity(item.intensity),
        note: typeof item.note === 'string' ? item.note : '',
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
  const additions = starterExercises.filter(
    (exercise) => !existingKeys.has(exerciseKey(exercise.part, exercise.name)),
  );
  return [...exercises, ...additions];
}

function exerciseKey(part: string, name: string) {
  return `${part.trim()}::${name.trim()}`;
}
