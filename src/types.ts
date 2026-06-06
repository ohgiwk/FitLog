export type Screen = "home" | "select" | "detail" | "exerciseHistory" | "preset" | "presetEdit" | "history";

export type Exercise = {
  id: string;
  part: string;
  name: string;
};

export type WorkoutSet = {
  id: string;
  weight: string | number;
  reps: string | number;
};

export type Workout = {
  id: string;
  exerciseId: string;
  date: string;
  name: string;
  part: string;
  sets: WorkoutSet[];
};

export type Preset = {
  id: string;
  name: string;
  exerciseIds: string[];
};

export type State = {
  exercises: Exercise[];
  workouts: Workout[];
  presets: Preset[];
  catalogVersion: number;
};

export type CalendarCell = {
  date: string;
  day: number;
  inMonth: boolean;
};
