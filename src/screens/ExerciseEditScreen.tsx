import { useState } from 'react';
import { ExerciseForm, ExerciseFormValue } from '../components/ExerciseForm';
import { ScreenHeader } from '../components/ScreenHeader';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { allGripStyleTypes, allGripTypes } from '../utils';

/**
 * 種目の追加・編集を行う専用画面
 */
export function ExerciseEditScreen() {
  const { exerciseEditor, orderedParts, state, actions } = useFitLogContext();
  const exercise = exerciseEditor?.exerciseId
    ? state.exercises.find((item) => item.id === exerciseEditor.exerciseId)
    : undefined;
  const isEditing = Boolean(exerciseEditor?.exerciseId);
  const [value, setValue] = useState<ExerciseFormValue>(() => ({
    part: exercise?.part ?? exerciseEditor?.part ?? 'その他',
    name: exercise?.name ?? '',
    measurementType: exercise?.measurementType ?? 'reps',
    category: exercise?.category ?? 'free',
    availableGrips: exercise?.availableGrips ?? [...allGripTypes],
    availableGripStyles: exercise?.availableGripStyles ?? [...allGripStyleTypes],
  }));

  if (!exerciseEditor || (isEditing && !exercise)) return null;

  const parts = orderedParts.length ? orderedParts.map((part) => part.name) : ['その他'];

  function save(next: ExerciseFormValue) {
    const saved = exercise
      ? actions.updateExercise(exercise.id, next)
      : actions.addExerciseToPart(
          next.part,
          next.name,
          next.measurementType,
          next.category,
          next.availableGrips,
          next.availableGripStyles,
        );
    if (!saved) return;
    actions.selectPart(next.part.trim() || 'その他');
    actions.closeExerciseEditor();
  }

  return (
    <section className="screen active">
      <ScreenHeader
        title={isEditing ? '種目を編集' : '種目を追加'}
        onBack={actions.closeExerciseEditor}
      />
      <div className="content exercise-editor-content">
        <ExerciseForm
          value={value}
          parts={parts}
          submitLabel={isEditing ? '保存' : '追加'}
          onChange={setValue}
          onCancel={actions.closeExerciseEditor}
          onSubmit={save}
        />
      </div>
    </section>
  );
}
