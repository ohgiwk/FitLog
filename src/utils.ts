import {
  CalendarCell,
  Exercise,
  ExerciseCategory,
  ExerciseGoal,
  MeasurementType,
  SetIntensity,
  WeightUnit,
  Workout,
  WorkoutSet,
} from './types';

/**
 * 種目の器具カテゴリの表示順とラベル。
 * 種目選択画面の小見出しやカテゴリ選択でこの順序を使う
 */
export const exerciseCategories: { value: ExerciseCategory; label: string }[] = [
  { value: 'free', label: 'フリーウエイト種目' },
  { value: 'machine', label: 'マシン種目' },
  { value: 'dumbbell', label: 'ダンベル種目' },
  { value: 'cable', label: 'ケーブル種目' },
  { value: 'bodyweight', label: '自重種目' },
];

/**
 * 種目のカテゴリ未設定時に使う既定カテゴリ
 */
export const defaultExerciseCategory: ExerciseCategory = 'free';

export function groupExercises(exercises: Exercise[]) {
  return exercises.reduce((groups, exercise) => {
    if (!groups.has(exercise.part)) groups.set(exercise.part, []);
    groups.get(exercise.part)?.push(exercise);
    return groups;
  }, new Map<string, Exercise[]>());
}

export function calendarCells(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: localDate(date), day: date.getDate(), inMonth: date.getMonth() === month };
  });
}

export function compactCalendarCells(year: number, month: number): CalendarCell[] {
  const cells = calendarCells(year, month);
  const lastInMonthIndex = cells.map((cell) => cell.inMonth).lastIndexOf(true);
  const visibleCellCount = Math.ceil((lastInMonthIndex + 1) / 7) * 7;
  return cells.slice(0, visibleCellCount);
}

export const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

export function hexToRgba(hex: string, alpha: number) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function newSet(): WorkoutSet {
  return { id: uid(), weight: '', recordValue: '' };
}

export const intensityOptions: { value: SetIntensity; label: string }[] = [
  { value: 1, label: '余裕' },
  { value: 2, label: '普通' },
  { value: 3, label: 'きつい' },
  { value: 4, label: 'かなりきつい' },
  { value: 5, label: '限界' },
];

export function calcRm(weight: number, reps: number) {
  if (!weight || !reps) return '0.0';
  return (weight * (1 + reps / 30)).toFixed(reps > 3 ? 1 : 2);
}

export function weightUnitLabel(unit: WeightUnit) {
  return unit === 'lbs' ? 'Lbs' : 'kg';
}

export function oppositeWeightUnit(unit: WeightUnit): WeightUnit {
  return unit === 'lbs' ? 'kg' : 'lbs';
}

export function convertWeightFromKg(value: string | number, unit: WeightUnit) {
  const weight = number(value);
  return unit === 'lbs' ? weight * 2.20462 : weight;
}

export function convertWeightToKg(value: string | number, unit: WeightUnit) {
  const weight = number(value);
  return unit === 'lbs' ? weight / 2.20462 : weight;
}

export function measurementUnit(measurementType: MeasurementType) {
  return measurementType === 'seconds' ? '秒' : '回';
}

export function measurementLabel(measurementType: MeasurementType) {
  return measurementType === 'seconds' ? '秒数' : '回数';
}

export function isRepsMeasurement(measurementType: MeasurementType) {
  return measurementType === 'reps';
}

export function number(value: string | number) {
  return Number(value) || 0;
}

export function isBlank(value: string | number) {
  return String(value ?? '').trim() === '';
}

/**
 * 重量または回数・秒数が入力されているセットか判定する
 */
export function isRecordedSet(set: WorkoutSet) {
  return !isBlank(set.weight) || !isBlank(set.recordValue);
}

/**
 * HH:mm 形式の開始・終了時刻から経過分数を求める
 */
export function calculateWorkoutDurationMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return end >= start ? end - start : 24 * 60 - start + end;
}

/**
 * 経過分数をトレーニング時間の表示文言へ整形する
 */
export function formatWorkoutDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes}分`;
  if (!remainingMinutes) return `${hours}時間`;
  return `${hours}時間${remainingMinutes}分`;
}

/**
 * HH:mm 形式の時刻を日本語の時分表記へ整形する
 */
export function formatWorkoutTime(time: string) {
  const [hours, minutes] = time.split(':');
  return `${hours}時${minutes}分`;
}

/**
 * 入力済みセットの重量と回数・秒数が、種目目標の両方に到達しているか判定する
 */
export function isExerciseGoalAchieved(sets: WorkoutSet[], goal: ExerciseGoal) {
  return Boolean(findExerciseGoalAchievementSet(sets, goal));
}

/**
 * 種目目標の重量と回数・秒数の両方を満たす最初の入力済みセットを返す
 */
export function findExerciseGoalAchievementSet(sets: WorkoutSet[], goal: ExerciseGoal) {
  return sets.find(
    (set) =>
      !isBlank(set.weight) &&
      !isBlank(set.recordValue) &&
      number(set.weight) >= goal.weight &&
      number(set.recordValue) >= goal.recordValue,
  );
}

export function formatWeight(value: string | number, unit: WeightUnit = 'kg') {
  return convertWeightFromKg(value, unit).toFixed(1);
}

export function formatStoredWeightInput(value: string | number, unit: WeightUnit) {
  if (isBlank(value)) return '';
  if (unit === 'kg') return String(value);
  return formatWeight(value, unit);
}

export function formatWeightForStorageInput(value: string, unit: WeightUnit) {
  if (value.trim() === '') return '';
  if (unit === 'kg') return value;
  const converted = convertWeightToKg(value, unit);
  if (!Number.isFinite(converted)) return '';
  if (converted === 0) return '0';
  return Number(converted.toFixed(4)).toString();
}

export function isUnstartedWorkout(workout: Workout) {
  return (
    workout.sets.length === 5 &&
    workout.sets.every((set) => number(set.weight) === 0 && number(set.recordValue) === 0)
  );
}

export function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function prevMonthLabel(year: number, month: number) {
  const date = new Date(year, month - 1, 1);
  return `${String(date.getMonth() + 1).padStart(2, '0')}月`;
}

export function nextMonthLabel(year: number, month: number) {
  const date = new Date(year, month + 1, 1);
  return `${String(date.getMonth() + 1).padStart(2, '0')}月`;
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
