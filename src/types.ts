export type Screen = "home" | "select" | "detail" | "exerciseHistory" | "preset" | "presetEdit" | "history";

export type MeasurementType = "reps" | "seconds";

export type Exercise = {
  id: string;
  part: string;
  name: string;
  measurementType: MeasurementType;
};

export type WorkoutSet = {
  id: string;
  weight: string | number;
  recordValue: string | number;
};

export type Workout = {
  id: string;
  exerciseId: string;
  date: string;
  name: string;
  part: string;
  measurementType: MeasurementType;
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
