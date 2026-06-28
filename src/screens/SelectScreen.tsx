import { ExercisePicker } from '../components/ExercisePicker';
import { ChevronLeft } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';

type ExerciseListMode = 'select' | 'manage';

function useSelectScreenModel(mode: ExerciseListMode) {
  const {
    groupedExercises,
    partRecentLabels,
    partColors,
    activePart,
    actions,
  } = useFitLogContext();
  const isManageMode = mode === 'manage';
  return {
    groupedExercises,
    partRecentLabels,
    partColors,
    activePart,
    onBack: () => actions.setScreen(isManageMode ? 'settings' : 'home'),
    onAddExercise: actions.addExerciseToToday,
    onReorder: actions.reorderPartExercises,
    onDeleteExercise: actions.deleteExercise,
    onOpenExerciseEditor: (part: string, exerciseId: string | null = null) =>
      actions.openExerciseEditor(part, exerciseId, isManageMode ? 'exerciseManage' : 'select'),
    onSelectPart: actions.selectPart,
  };
}

function ExerciseListScreen({ mode }: { mode: ExerciseListMode }) {
  const model = useSelectScreenModel(mode);
  const isManageMode = mode === 'manage';
  const currentPart =
    model.activePart && model.groupedExercises.has(model.activePart)
      ? model.activePart
      : [...model.groupedExercises.keys()][0];

  return (
    <section className="screen active">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={model.onBack}>
            <ChevronLeft />
          </button>
          <div className="bar-title">{mode === 'manage' ? '種目を編集' : '種目を選択'}</div>
          <span />
        </div>
      </header>
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
        onAddExercise={model.onOpenExerciseEditor}
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
