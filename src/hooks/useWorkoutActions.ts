import { Screen, SetIntensity, State, Workout } from '../types';
import { newSet } from '../utils';
import { createWorkout } from '../selectors/fitLogSelectors';

type WorkoutActionsDeps = {
  state: State;
  saveState: (updater: (draft: State) => State) => void;
  showToast: (message: string) => void;
  showScreen: (next: Screen) => void;
  selectedDate: string;
  currentWorkout: Workout | null;
  currentWorkoutId: string | null;
  setCurrentWorkoutId: (workoutId: string | null) => void;
  selectedWorkouts: Workout[];
};

/**
 * ワークアウトとセットの追加・更新・削除・並び替えを担うフック
 */
export function useWorkoutActions({
  state,
  saveState,
  showToast,
  showScreen,
  selectedDate,
  currentWorkout,
  currentWorkoutId,
  setCurrentWorkoutId,
  selectedWorkouts,
}: WorkoutActionsDeps) {
  /**
   * トレーニング開始時刻を保存し、種目選択画面へ進む
   */
  function startWorkoutDay() {
    const now = new Date();
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    saveState((prev) => ({
      ...prev,
      workoutStartTimes: {
        ...prev.workoutStartTimes,
        [selectedDate]: startTime,
      },
    }));
    showScreen('select');
  }

  /**
   * 詳細画面を開く。セットが5つ未満なら空セットを補充する
   */
  function openWorkoutDetail(workoutId: string) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) => {
        if (workout.id !== workoutId || workout.sets.length >= 5) return workout;
        return {
          ...workout,
          sets: [
            ...workout.sets,
            ...Array.from({ length: 5 - workout.sets.length }, () => newSet()),
          ],
        };
      }),
    }));
    setCurrentWorkoutId(workoutId);
    showScreen('detail');
  }

  /**
   * 選択日に種目を追加する。既にあれば再利用してその詳細を開く
   */
  function addExerciseToToday(exerciseId: string) {
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    const existing = state.workouts.find(
      (item) => item.date === selectedDate && item.exerciseId === exerciseId,
    );
    const workout = existing || createWorkout(exercise, selectedDate);
    saveState((prev) => {
      if (existing) return prev;
      return { ...prev, workouts: [...prev.workouts, workout] };
    });
    openWorkoutDetail(workout.id);
  }

  /**
   * 指定ワークアウトに空のセットを1つ追加する
   */
  function addSet(workoutId: string) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) =>
        workout.id === workoutId ? { ...workout, sets: [...workout.sets, newSet()] } : workout,
      ),
    }));
    setCurrentWorkoutId(workoutId);
    showScreen('detail');
  }

  /**
   * セットの重量・回数(秒数)を更新する
   */
  function updateSet(setId: string, field: 'weight' | 'recordValue', value: string) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) => ({
        ...workout,
        sets: workout.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
      })),
    }));
  }

  /**
   * ワークアウト単位のメモを更新する
   */
  function updateWorkoutNote(workoutId: string, note: string) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) =>
        workout.id === workoutId ? { ...workout, note } : workout,
      ),
    }));
  }

  /**
   * セットの強度を設定する。未指定(undefined)なら強度を解除する
   */
  function updateSetIntensity(setId: string, intensity?: SetIntensity) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) => ({
        ...workout,
        sets: workout.sets.map((set) => {
          if (set.id !== setId) return set;
          if (!intensity) {
            const nextSet = { ...set };
            delete nextSet.intensity;
            return nextSet;
          }
          return { ...set, intensity };
        }),
      })),
    }));
  }

  /**
   * 現在のワークアウトから指定セットを削除する
   */
  function deleteSet(setId: string) {
    if (!currentWorkout) return;
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) =>
        workout.id === currentWorkout.id
          ? { ...workout, sets: workout.sets.filter((set) => set.id !== setId) }
          : workout,
      ),
    }));
  }

  /**
   * ワークアウト(種目の記録)ごと削除する
   */
  function deleteWorkout(workoutId: string) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.filter((workout) => workout.id !== workoutId),
    }));
    if (currentWorkoutId === workoutId) setCurrentWorkoutId(null);
    showToast('種目の記録を削除しました');
  }

  /**
   * 選択日内でのワークアウトの並び順を1つ前後に入れ替える
   */
  function moveWorkout(workoutId: string, direction: number) {
    const index = selectedWorkouts.findIndex((workout) => workout.id === workoutId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= selectedWorkouts.length) return;
    saveState((prev) => {
      const currentGlobalIndex = prev.workouts.findIndex(
        (workout) => workout.id === selectedWorkouts[index].id,
      );
      const nextGlobalIndex = prev.workouts.findIndex(
        (workout) => workout.id === selectedWorkouts[nextIndex].id,
      );
      const workouts = [...prev.workouts];
      [workouts[currentGlobalIndex], workouts[nextGlobalIndex]] = [
        workouts[nextGlobalIndex],
        workouts[currentGlobalIndex],
      ];
      return { ...prev, workouts };
    });
  }

  return {
    openWorkoutDetail,
    startWorkoutDay,
    addExerciseToToday,
    addSet,
    updateSet,
    updateWorkoutNote,
    updateSetIntensity,
    deleteSet,
    deleteWorkout,
    moveWorkout,
  };
}
