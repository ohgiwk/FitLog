import { Exercise, PartSetting, Preset, State, Workout } from '../types';
import { defaultPartColor } from '../data/partColors';
import { isBlank, newSet, parseDate, uid } from '../utils';

/**
 * トレーニング日などで使う特別な部位。並びや色管理の対象外にする
 */
export const REST_PART = 'レスト';

/**
 * 明示的な部位設定(順序・色)に、データ上だけ存在する部位を補って
 * 表示順つきの完全な部位一覧を作る。
 * - 先頭は state.parts の順序をそのまま使う
 * - その後ろに、種目などに現れるが未登録の部位を五十音順で既定色で追加する
 * - 「レスト」は対象外にする
 */
export function buildOrderedParts(
  parts: PartSetting[],
  exercises: Exercise[],
  workouts: Workout[],
  trainingDays: State['trainingDays'],
  trainingPlans: State['trainingPlans'],
): PartSetting[] {
  const result: PartSetting[] = [];
  const seen = new Set<string>();
  parts.forEach((part) => {
    const name = part.name.trim();
    if (!name || name === REST_PART || seen.has(name)) return;
    seen.add(name);
    result.push({ name, color: part.color || defaultPartColor });
  });

  const implicit: string[] = [];
  const collect = (value: string) => {
    const name = value.trim();
    if (!name || name === REST_PART || seen.has(name) || implicit.includes(name)) return;
    implicit.push(name);
  };
  exercises.forEach((exercise) => collect(exercise.part));
  workouts.forEach((workout) => collect(workout.part));
  trainingDays.forEach((day) => day.parts.forEach(collect));
  trainingPlans.forEach((plan) => collect(plan.part));
  implicit.sort((a, b) => a.localeCompare(b, 'ja'));
  implicit.forEach((name) => {
    seen.add(name);
    result.push({ name, color: defaultPartColor });
  });
  return result;
}

/**
 * 部位名から表示色を引けるマップを作る
 */
export function buildPartColorMap(orderedParts: PartSetting[]): Map<string, string> {
  return new Map(orderedParts.map((part) => [part.name, part.color]));
}

export function findCurrentWorkout(
  workouts: Workout[],
  currentWorkoutId: string | null,
  selectedDate: string,
  selectedWorkouts: Workout[],
) {
  if (!currentWorkoutId) return null;
  const current = workouts.find((workout) => workout.id === currentWorkoutId);
  if (current?.date === selectedDate) return current;
  return selectedWorkouts.find((workout) => workout.id === currentWorkoutId) || null;
}

export function findCurrentPreset(presets: Preset[], currentPresetId: string | null) {
  return presets.find((preset) => preset.id === currentPresetId) || presets[0] || null;
}

export function buildSplitPartOptions(
  exercises: Exercise[],
  workouts: Workout[],
  trainingDays: State['trainingDays'],
  trainingPlans: State['trainingPlans'],
) {
  const parts = new Set<string>();
  exercises.forEach((exercise) => parts.add(exercise.part));
  workouts.forEach((workout) => parts.add(workout.part));
  trainingDays.forEach((day) => day.parts.forEach((part) => parts.add(part)));
  trainingPlans.forEach((plan) => parts.add(plan.part));
  parts.delete('');
  return [...parts].sort((a, b) => a.localeCompare(b, 'ja'));
}

export function plannedPartsForDate(date: string, trainingPlans: State['trainingPlans']) {
  const target = parseDate(date);
  const weekday = target.getDay();
  return [
    ...new Set(
      trainingPlans.flatMap((plan) => {
        if (plan.mode === 'weekly') return plan.weekdays.includes(weekday) ? [plan.part] : [];
        const start = plan.startDate ? parseDate(plan.startDate) : target;
        const days = Math.floor((target.getTime() - start.getTime()) / 86400000);
        return days >= 0 && days % plan.intervalDays === 0 ? [plan.part] : [];
      }),
    ),
  ];
}

export type HistoryDay = {
  date: string;
  parts: string[];
  workoutNames: string[];
};

export function buildVisibleHistory(
  workouts: Workout[],
  trainingDays: State['trainingDays'],
  partFilter: string,
): HistoryDay[] {
  const byDate = new Map<string, { date: string; parts: Set<string>; workoutNames: string[] }>();
  trainingDays.forEach((day) => {
    byDate.set(day.date, { date: day.date, parts: new Set(day.parts), workoutNames: [] });
  });
  workouts.forEach((workout) => {
    const day = byDate.get(workout.date) ?? {
      date: workout.date,
      parts: new Set<string>(),
      workoutNames: [],
    };
    day.parts.add(workout.part);
    day.workoutNames.push(workout.name);
    byDate.set(workout.date, day);
  });
  return [...byDate.values()]
    .filter((day) => partFilter === 'ALL' || day.parts.has(partFilter))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((day) => ({ ...day, parts: [...day.parts] }));
}

export function buildUpcomingPlans(
  selectedDate: string,
  trainingPlans: State['trainingPlans'],
  days = 7,
) {
  const start = parseDate(selectedDate);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
    return { date: value, parts: plannedPartsForDate(value, trainingPlans) };
  });
}

export function buildPartRecentLabels(
  groupedExercises: Map<string, Exercise[]>,
  workouts: Workout[],
  selectedDate: string,
) {
  const selectedTime = parseDate(selectedDate).getTime();
  const labels = new Map<string, string>();
  groupedExercises.forEach((exercises, part) => {
    const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
    const latest = workouts
      .filter(
        (workout) =>
          exerciseIds.has(workout.exerciseId) &&
          workout.date <= selectedDate &&
          workout.sets.some((set) => !isBlank(set.weight) || !isBlank(set.recordValue)),
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!latest) {
      labels.set(part, '履歴なし');
      return;
    }

    const daysAgo = Math.max(
      0,
      Math.round((selectedTime - parseDate(latest.date).getTime()) / 86400000),
    );
    labels.set(part, daysAgo === 0 ? '今日' : `${daysAgo}日前`);
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
    note: '',
  };
}
