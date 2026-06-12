import { Exercise, ExerciseCategory, MeasurementType, State } from '../types';
import { uid } from '../utils';
import { paletteColorAt } from '../data/partColors';

type ExerciseActionsDeps = {
  state: State;
  saveState: (updater: (draft: State) => State) => void;
  showToast: (message: string) => void;
};

/**
 * 種目マスタの追加・編集・削除・並び替えを担うフック
 */
export function useExerciseActions({ state, saveState, showToast }: ExerciseActionsDeps) {
  /**
   * 指定した部位に新しい種目を追加する(マスタにのみ追加し、画面遷移はしない)。
   * 追加できたら true を返す。部位が未登録ならパレット色つきで登録する
   */
  function addExerciseToPart(
    part: string,
    name: string,
    measurementType: MeasurementType,
    category: ExerciseCategory,
  ) {
    const trimmedPart = part.trim() || 'その他';
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('種目名を入力してください');
      return false;
    }
    const exercise: Exercise = {
      id: uid(),
      part: trimmedPart,
      name: trimmedName,
      measurementType,
      category,
    };
    saveState((prev) => {
      const parts = prev.parts.some((item) => item.name === trimmedPart)
        ? prev.parts
        : [...prev.parts, { name: trimmedPart, color: paletteColorAt(prev.parts.length) }];
      return { ...prev, parts, exercises: [exercise, ...prev.exercises] };
    });
    showToast(`${trimmedName}を追加しました`);
    return true;
  }

  /**
   * 種目の部位・名前・記録単位・器具カテゴリをまとめて更新する。
   * 種目名は trim して空なら更新せず false を返す。
   * 改名・部位変更時は既存ワークアウトの名前・部位スナップショットも追従させる
   */
  function updateExercise(
    exerciseId: string,
    fields: {
      part: string;
      name: string;
      measurementType: MeasurementType;
      category: ExerciseCategory;
    },
  ) {
    const trimmedName = fields.name.trim();
    const trimmedPart = fields.part.trim() || 'その他';
    if (!trimmedName) {
      showToast('種目名を入力してください');
      return false;
    }
    saveState((prev) => {
      const parts = prev.parts.some((item) => item.name === trimmedPart)
        ? prev.parts
        : [...prev.parts, { name: trimmedPart, color: paletteColorAt(prev.parts.length) }];
      return {
        ...prev,
        parts,
        exercises: prev.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                part: trimmedPart,
                name: trimmedName,
                measurementType: fields.measurementType,
                category: fields.category,
              }
            : exercise,
        ),
        workouts: prev.workouts.map((workout) =>
          workout.exerciseId === exerciseId
            ? { ...workout, name: trimmedName, part: trimmedPart }
            : workout,
        ),
      };
    });
    return true;
  }

  /**
   * 指定部位の種目を、与えられたレイアウト(並び順＋カテゴリ)へ反映する。
   * 部位内の種目だけを並び替え、他部位の種目はマスタ配列内の位置を保つ。
   * カテゴリをまたいでドロップした種目は、移動先のカテゴリへ変更される
   */
  function reorderPartExercises(
    part: string,
    layout: { id: string; category: ExerciseCategory }[],
  ) {
    saveState((prev) => {
      const partExercises = prev.exercises.filter((exercise) => exercise.part === part);
      const byId = new Map(partExercises.map((exercise) => [exercise.id, exercise]));
      const layoutIds = layout.map((item) => item.id);
      const ordered: Exercise[] = [];
      layout.forEach(({ id, category }) => {
        const exercise = byId.get(id);
        if (exercise) ordered.push({ ...exercise, category });
      });
      partExercises.forEach((exercise) => {
        if (!layoutIds.includes(exercise.id)) ordered.push(exercise);
      });
      let cursor = 0;
      const exercises = prev.exercises.map((exercise) =>
        exercise.part === part ? ordered[cursor++] : exercise,
      );
      return { ...prev, exercises };
    });
  }

  /**
   * 種目を削除し、各プリセットからも該当 ID を取り除く
   */
  function deleteExercise(exerciseId: string) {
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    saveState((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((item) => item.id !== exerciseId),
      presets: prev.presets.map((preset) => ({
        ...preset,
        exerciseIds: preset.exerciseIds.filter((id) => id !== exerciseId),
      })),
    }));
    showToast(`${exercise.name}を削除しました`);
  }

  return {
    addExerciseToPart,
    updateExercise,
    reorderPartExercises,
    deleteExercise,
  };
}
