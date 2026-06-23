import { GripStyleType, GripType, Screen, SetIntensity, State, Workout } from '../types';
import { isUnstartedWorkout, newSet } from '../utils';
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
   * 指定日のトレーニングが終了済みか判定する
   */
  function isWorkoutDayEnded(date: string) {
    return Boolean(state.workoutEndTimes[date]);
  }

  /**
   * トレーニング終了時刻を保存し、保存した時刻を返す
   */
  function endWorkoutDay(removeUnstartedWorkouts = false) {
    if (!state.workoutStartTimes[selectedDate]) return null;
    const now = new Date();
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    saveState((prev) => ({
      ...prev,
      workouts: removeUnstartedWorkouts
        ? prev.workouts.filter(
            (workout) => workout.date !== selectedDate || !isUnstartedWorkout(workout),
          )
        : prev.workouts,
      workoutEndTimes: {
        ...prev.workoutEndTimes,
        [selectedDate]: endTime,
      },
    }));
    return endTime;
  }

  /**
   * 選択日の終了時刻を削除し、トレーニングを編集可能な状態へ戻す
   */
  function resumeWorkoutDay() {
    saveState((prev) => {
      const workoutEndTimes = { ...prev.workoutEndTimes };
      delete workoutEndTimes[selectedDate];
      return { ...prev, workoutEndTimes };
    });
  }

  /**
   * 詳細画面を開く。セットが5つ未満なら空セットを補充する
   */
  function openWorkoutDetail(workoutId: string) {
    const target = state.workouts.find((workout) => workout.id === workoutId);
    if (!target) return;
    if (isWorkoutDayEnded(target.date)) {
      setCurrentWorkoutId(workoutId);
      showScreen('detail');
      return;
    }
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
    if (isWorkoutDayEnded(selectedDate)) return;
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    const now = new Date();
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const existing = state.workouts.find(
      (item) => item.date === selectedDate && item.exerciseId === exerciseId,
    );
    const workout = existing || createWorkout(exercise, selectedDate);
    saveState((prev) => {
      const hasWorkoutsForDate = prev.workouts.some((item) => item.date === selectedDate);
      const workoutStartTimes =
        hasWorkoutsForDate && prev.workoutStartTimes[selectedDate]
          ? prev.workoutStartTimes
          : {
              ...prev.workoutStartTimes,
              [selectedDate]: startTime,
            };
      return {
        ...prev,
        workouts: existing ? prev.workouts : [...prev.workouts, workout],
        workoutStartTimes,
      };
    });
    if (existing) {
      openWorkoutDetail(workout.id);
      return;
    }
    setCurrentWorkoutId(workout.id);
    showScreen('detail');
  }

  /**
   * 指定ワークアウトに空のセットを1つ追加する
   */
  function addSet(workoutId: string) {
    const target = state.workouts.find((workout) => workout.id === workoutId);
    if (!target || isWorkoutDayEnded(target.date)) return;
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
    const target = state.workouts.find((workout) => workout.sets.some((set) => set.id === setId));
    if (!target || isWorkoutDayEnded(target.date)) return;
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
    const target = state.workouts.find((workout) => workout.id === workoutId);
    if (!target || isWorkoutDayEnded(target.date)) return;
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
    const target = state.workouts.find((workout) => workout.sets.some((set) => set.id === setId));
    if (!target || isWorkoutDayEnded(target.date)) return;
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
   * 種目記録の握りの向きを設定する。未指定(undefined)なら選択を解除する
   */
  function updateWorkoutGrip(workoutId: string, grip?: GripType) {
    const target = state.workouts.find((workout) => workout.id === workoutId);
    if (!target || isWorkoutDayEnded(target.date)) return;
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) => {
        if (workout.id !== workoutId) return workout;
        if (!grip) {
          const nextWorkout = { ...workout };
          delete nextWorkout.grip;
          return nextWorkout;
        }
        return { ...workout, grip };
      }),
    }));
  }

  /**
   * 種目記録の握り方を設定する。未指定(undefined)なら選択を解除する
   */
  function updateWorkoutGripStyle(workoutId: string, gripStyle?: GripStyleType) {
    const target = state.workouts.find((workout) => workout.id === workoutId);
    if (!target || isWorkoutDayEnded(target.date)) return;
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) => {
        if (workout.id !== workoutId) return workout;
        if (!gripStyle) {
          const nextWorkout = { ...workout };
          delete nextWorkout.gripStyle;
          return nextWorkout;
        }
        return { ...workout, gripStyle };
      }),
    }));
  }

  /**
   * 現在のワークアウトから指定セットを削除する
   */
  function deleteSet(setId: string) {
    if (!currentWorkout || isWorkoutDayEnded(currentWorkout.date)) return;
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
    const target = state.workouts.find((workout) => workout.id === workoutId);
    if (!target || isWorkoutDayEnded(target.date)) return;
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
    if (isWorkoutDayEnded(selectedDate)) return;
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
    endWorkoutDay,
    resumeWorkoutDay,
    addExerciseToToday,
    addSet,
    updateSet,
    updateWorkoutNote,
    updateSetIntensity,
    updateWorkoutGrip,
    updateWorkoutGripStyle,
    deleteSet,
    deleteWorkout,
    moveWorkout,
  };
}
