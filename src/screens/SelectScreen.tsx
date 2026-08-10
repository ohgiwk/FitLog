import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExercisePicker } from '../components/ExercisePicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { useSmithNoteContext } from '../hooks/useSmithNoteContext';
import type { Exercise } from '../types';

type ExerciseListMode = 'select' | 'manage';

function useSelectScreenModel() {
  const { groupedExercises, partRecentLabels, partColors, activePart, actions } =
    useSmithNoteContext();
  return {
    groupedExercises,
    partRecentLabels,
    partColors,
    activePart,
    onOpenExerciseManager: () => actions.setScreen('exerciseManage'),
    onAddExercise: actions.addExerciseToToday,
    onReorder: actions.reorderPartExercises,
    onDeleteExercise: actions.deleteExercise,
    onOpenExerciseEditor: (part: string, exerciseId: string | null = null) =>
      actions.openExerciseEditor(part, exerciseId),
    onSelectPart: actions.selectPart,
  };
}

function ExerciseListScreen({ mode }: { mode: ExerciseListMode }) {
  const model = useSelectScreenModel();
  const isManageMode = mode === 'manage';
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const currentPart =
    model.activePart && model.groupedExercises.has(model.activePart)
      ? model.activePart
      : [...model.groupedExercises.keys()][0];

  function requestDeleteExercise(exerciseId: string) {
    const exercise = [...model.groupedExercises.values()]
      .flat()
      .find((item) => item.id === exerciseId);
    if (exercise) setDeleteTarget(exercise);
  }

  function confirmDeleteExercise() {
    if (!deleteTarget) return;
    model.onDeleteExercise(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <section className="screen active">
      <ScreenHeader
        title={mode === 'manage' ? '種目一覧を編集' : '種目を選択'}
        right={
          isManageMode ? undefined : (
            <button className="bar-btn right" type="button" onClick={model.onOpenExerciseManager}>
              編集
            </button>
          )
        }
      />
      <ExercisePicker
        activePart={model.activePart}
        groupedExercises={model.groupedExercises}
        label={
          isManageMode && currentPart
            ? `${currentPart}の種目`
            : currentPart
              ? model.partRecentLabels.get(currentPart) || '履歴なし'
              : ''
        }
        mode={isManageMode ? 'manage' : 'single'}
        partColors={model.partColors}
        onDeleteExercise={requestDeleteExercise}
        onEditExercise={model.onOpenExerciseEditor}
        onReorder={model.onReorder}
        onSelectExercise={model.onAddExercise}
        onSelectPart={model.onSelectPart}
      />
      {deleteTarget && (
        <ConfirmDialog
          title="種目を削除しますか？"
          labelledBy="exercise-delete-title"
          onClose={() => setDeleteTarget(null)}
        >
          <p>
            「{deleteTarget.name}
            」を削除します。登録されているトレーニングメニューからも削除されます。
          </p>
          <div className="confirm-actions">
            <button className="small-outline" type="button" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </button>
            <button className="danger-button" type="button" onClick={confirmDeleteExercise}>
              削除
            </button>
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}

export function SelectScreen() {
  return <ExerciseListScreen mode="select" />;
}

export function ExerciseManageScreen() {
  return <ExerciseListScreen mode="manage" />;
}
