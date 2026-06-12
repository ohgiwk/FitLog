import { PointerEvent } from 'react';
import { Exercise, ExerciseCategory, MeasurementType, State } from '../types';
import { dragAfterElement, uid } from '../utils';
import { paletteColorAt } from '../data/partColors';

type ExerciseActionsDeps = {
  state: State;
  saveState: (updater: (draft: State) => State) => void;
  showToast: (message: string) => void;
  setDraggingExerciseId: (exerciseId: string | null) => void;
};

/**
 * 種目マスタの追加・編集・削除・並び替え(ドラッグ操作含む)を担うフック
 */
export function useExerciseActions({
  state,
  saveState,
  showToast,
  setDraggingExerciseId,
}: ExerciseActionsDeps) {
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
   * 種目の名前・記録単位・器具カテゴリをまとめて更新する。
   * 種目名は trim して空なら更新せず false を返す。
   * 改名時は既存ワークアウトの名前スナップショットも追従させる
   */
  function updateExercise(
    exerciseId: string,
    fields: { name: string; measurementType: MeasurementType; category: ExerciseCategory },
  ) {
    const trimmedName = fields.name.trim();
    if (!trimmedName) {
      showToast('種目名を入力してください');
      return false;
    }
    saveState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              name: trimmedName,
              measurementType: fields.measurementType,
              category: fields.category,
            }
          : exercise,
      ),
      workouts: prev.workouts.map((workout) =>
        workout.exerciseId === exerciseId ? { ...workout, name: trimmedName } : workout,
      ),
    }));
    return true;
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

  /**
   * ドラッグ後の DOM の並び順を読み取り、種目の順序と部位を state に反映する
   */
  function commitExerciseOrder(rows: HTMLElement[]) {
    const byId = new Map(state.exercises.map((exercise) => [exercise.id, exercise]));
    const ordered: Exercise[] = [];
    rows.forEach((row) => {
      const exercise = byId.get(row.dataset.exerciseRow || '');
      const part = row.closest<HTMLElement>('[data-part-list]')?.dataset.partList;
      if (!exercise || !part) return;
      ordered.push({ ...exercise, part });
    });
    state.exercises.forEach((exercise) => {
      if (!ordered.some((item) => item.id === exercise.id)) ordered.push(exercise);
    });
    saveState((prev) => ({
      ...prev,
      exercises: ordered,
      workouts: prev.workouts.map((workout) => {
        const exercise = ordered.find((item) => item.id === workout.exerciseId);
        return exercise ? { ...workout, name: exercise.name, part: exercise.part } : workout;
      }),
    }));
  }

  /**
   * ポインタ操作で種目行のドラッグ並び替えを開始する
   */
  function startPointerExerciseDrag(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-row-action]')) return;
    const row = event.currentTarget;
    let moved = false;
    setDraggingExerciseId(row.dataset.exerciseRow || null);
    row.setPointerCapture(event.pointerId);
    row.classList.add('dragging');

    /**
     * ドラッグ中に行を移動先のリスト・位置へ差し込む
     */
    const move = (moveEvent: globalThis.PointerEvent) => {
      moved = true;
      const list = document
        .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
        ?.closest<HTMLElement>('[data-part-list]');
      if (!list) return;
      document
        .querySelectorAll('.drop-target')
        .forEach((item) => item.classList.toggle('drop-target', item === list));
      const after = dragAfterElement(list, moveEvent.clientY);
      if (after) list.insertBefore(row, after);
      else list.appendChild(row);
    };

    /**
     * ドラッグ終了時に後片付けし、移動があれば並び順を確定する
     */
    const end = () => {
      row.classList.remove('dragging');
      document
        .querySelectorAll('.drop-target')
        .forEach((list) => list.classList.remove('drop-target'));
      row.removeEventListener('pointermove', move);
      row.removeEventListener('pointerup', end);
      row.removeEventListener('pointercancel', end);
      if (moved)
        commitExerciseOrder(
          Array.from(document.querySelectorAll<HTMLElement>('[data-exercise-row]')),
        );
      setDraggingExerciseId(null);
    };

    row.addEventListener('pointermove', move);
    row.addEventListener('pointerup', end);
    row.addEventListener('pointercancel', end);
  }

  return {
    addExerciseToPart,
    updateExercise,
    deleteExercise,
    commitExerciseOrder,
    startPointerExerciseDrag,
  };
}
