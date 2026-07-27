import { ExercisePicker } from '../components/ExercisePicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { useFitLogContext } from '../hooks/useFitLogContext';

type ExerciseListMode = 'select' | 'manage';

function useSelectScreenModel() {
  const { groupedExercises, partRecentLabels, partColors, activePart, actions } =
    useFitLogContext();
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
  const currentPart =
    model.activePart && model.groupedExercises.has(model.activePart)
      ? model.activePart
      : [...model.groupedExercises.keys()][0];

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
        onDeleteExercise={model.onDeleteExercise}
        onEditExercise={model.onOpenExerciseEditor}
        onReorder={model.onReorder}
        onSelectExercise={model.onAddExercise}
        onSelectPart={model.onSelectPart}
      />
    </section>
  );
}

export function SelectScreen() {
  return <ExerciseListScreen mode="select" />;
}

export function ExerciseManageScreen() {
  return <ExerciseListScreen mode="manage" />;
}
