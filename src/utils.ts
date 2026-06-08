import { CalendarCell, Exercise, MeasurementType, SetIntensity, Workout, WorkoutSet } from "./types";

export function groupExercises(exercises: Exercise[]) {
  return exercises.reduce((groups, exercise) => {
    if (!groups.has(exercise.part)) groups.set(exercise.part, []);
    groups.get(exercise.part)?.push(exercise);
    return groups;
  }, new Map<string, Exercise[]>());
}

export function dragAfterElement(list: HTMLElement, y: number) {
  return Array.from(list.querySelectorAll<HTMLElement>("[data-exercise-row]:not(.dragging)")).reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null as HTMLElement | null }
  ).element;
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

export function newSet(): WorkoutSet {
  return { id: uid(), weight: "", recordValue: "", note: "" };
}

export const intensityOptions: { value: SetIntensity; label: string }[] = [
  { value: 1, label: "余裕" },
  { value: 2, label: "普通" },
  { value: 3, label: "きつい" },
  { value: 4, label: "かなりきつい" },
  { value: 5, label: "限界" },
];

export function calcRm(weight: number, reps: number) {
  if (!weight || !reps) return "0.0";
  return (weight * (1 + reps / 30)).toFixed(reps > 3 ? 1 : 2);
}

export function measurementUnit(measurementType: MeasurementType) {
  return measurementType === "seconds" ? "秒" : "回";
}

export function measurementLabel(measurementType: MeasurementType) {
  return measurementType === "seconds" ? "秒数" : "回数";
}

export function isRepsMeasurement(measurementType: MeasurementType) {
  return measurementType === "reps";
}

export function number(value: string | number) {
  return Number(value) || 0;
}

export function isBlank(value: string | number) {
  return String(value ?? "").trim() === "";
}

export function formatWeight(value: string | number) {
  return number(value).toFixed(1);
}

export function isUnstartedWorkout(workout: Workout) {
  return workout.sets.length === 5 && workout.sets.every((set) => number(set.weight) === 0 && number(set.recordValue) === 0);
}

export function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function prevMonthLabel(year: number, month: number) {
  const date = new Date(year, month - 1, 1);
  return `${String(date.getMonth() + 1).padStart(2, "0")}月`;
}

export function nextMonthLabel(year: number, month: number) {
  const date = new Date(year, month + 1, 1);
  return `${String(date.getMonth() + 1).padStart(2, "0")}月`;
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
