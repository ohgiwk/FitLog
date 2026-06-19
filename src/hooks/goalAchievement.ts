import { State, Workout } from '../types';
import { findExerciseGoalAchievementSet, number, uid } from '../utils';
import { GoalAchievement } from './useFitLogUi';

export function findGoalAchievement(
  state: State,
  workout: Workout,
): { achievement: GoalAchievement; setWeight: number; setRecordValue: number } | null {
  const exercise = state.exercises.find((item) => item.id === workout.exerciseId);
  if (!exercise?.goal) return null;
  const achievedSet = findExerciseGoalAchievementSet(workout.sets, exercise.goal);
  if (!achievedSet) return null;
  return {
    achievement: {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      measurementType: exercise.measurementType,
      goal: exercise.goal,
    },
    setWeight: number(achievedSet.weight),
    setRecordValue: number(achievedSet.recordValue),
  };
}

export function appendGoalAchievement(
  state: State,
  workout: Workout,
  result: NonNullable<ReturnType<typeof findGoalAchievement>>,
): State {
  const { achievement } = result;
  const alreadyRecorded = state.goalAchievements.some(
    (record) =>
      record.exerciseId === achievement.exerciseId &&
      record.date === workout.date &&
      record.goalWeight === achievement.goal.weight &&
      record.goalRecordValue === achievement.goal.recordValue,
  );
  if (alreadyRecorded) return state;
  return {
    ...state,
    goalAchievements: [
      ...state.goalAchievements,
      {
        id: uid(),
        exerciseId: achievement.exerciseId,
        exerciseName: achievement.exerciseName,
        measurementType: achievement.measurementType,
        date: workout.date,
        weight: result.setWeight,
        recordValue: result.setRecordValue,
        goalWeight: achievement.goal.weight,
        goalRecordValue: achievement.goal.recordValue,
      },
    ],
  };
}
