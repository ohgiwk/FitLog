import { FormEvent, PointerEvent } from 'react';
import { Exercise, MeasurementType, Screen, State } from '../types';
import { dragAfterElement, uid } from '../utils';
import { createWorkout } from '../selectors/fitLogSelectors';
import { paletteColorAt } from '../data/partColors';

type ExerciseActionsDeps = {
  state: State;
  saveState: (updater: (draft: State) => State) => void;
  showToast: (message: string) => void;
  showScreen: (next: Screen) => void;
  selectedDate: string;
  setCurrentWorkoutId: (workoutId: string | null) => void;
  partInput: string;
  nameInput: string;
  measurementTypeInput: MeasurementType;
  setNameInput: (value: string) => void;
  setMeasurementTypeInput: (value: MeasurementType) => void;
  setAddFormOpen: (value: boolean) => void;
  setDraggingExerciseId: (exerciseId: string | null) => void;
};

/**
 * 種目マスタの追加・編集・削除・並び替え(ドラッグ操作含む)を担うフック
 */
export function useExerciseActions({
  state,
  saveState,
  showToast,
  showScreen,
  selectedDate,
  setCurrentWorkoutId,
  partInput,
  nameInput,
  measurementTypeInput,
  setNameInput,
  setMeasurementTypeInput,
  setAddFormOpen,
  setDraggingExerciseId,
}: ExerciseActionsDeps) {
  /**
   * フォーム入力から新しい種目を作成し、その記録の詳細画面へ進む
   */
  function addCustomExercise(event: FormEvent) {
    event.preventDefault();
    const part = partInput.trim() || 'その他';
    const name = nameInput.trim();
    if (!name) return showToast('種目名を入力してください');

    const exercise: Exercise = { id: uid(), part, name, measurementType: measurementTypeInput };
    const workout = createWorkout(exercise, selectedDate);
    saveState((prev) => {
      const parts = prev.parts.some((item) => item.name === part)
        ? prev.parts
        : [...prev.parts, { name: part, color: paletteColorAt(prev.parts.length) }];
      return {
        ...prev,
        parts,
        exercises: [exercise, ...prev.exercises],
        workouts: [...prev.workouts, workout],
      };
    });
    setCurrentWorkoutId(workout.id);
    setNameInput('');
    setMeasurementTypeInput('reps');
    setAddFormOpen(false);
    showScreen('detail');
  }

  /**
   * 種目の計測方法(回数/秒数)を切り替える
   */
  function updateExerciseMeasurementType(exerciseId: string, measurementType: MeasurementType) {
    saveState((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, measurementType } : exercise,
      ),
    }));
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
    addCustomExercise,
    updateExerciseMeasurementType,
    deleteExercise,
    commitExerciseOrder,
    startPointerExerciseDrag,
  };
}
