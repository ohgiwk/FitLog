import { ExercisePicker } from '../components/ExercisePicker';
import { ChevronLeft } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';

/**
 * プリセット下書きへ追加する種目を部位・カテゴリ別に複数選択する画面
 */
export function PresetExerciseSelectScreen() {
  const { presetDraft, groupedExercises, partColors, activePart, actions } = useFitLogContext();

  if (!presetDraft) return null;

  return (
    <section className="screen active">
      <header className="topbar">
        <div className="bar-row">
          <button
            className="bar-btn"
            type="button"
            aria-label="戻る"
            onClick={() => actions.setScreen('presetEdit')}
          >
            <ChevronLeft />
          </button>
          <div className="bar-title">メニュー種目</div>
          <button
            className="bar-btn right"
            type="button"
            onClick={() => actions.setScreen('presetEdit')}
          >
            完了
          </button>
        </div>
      </header>
      <ExercisePicker
        activePart={activePart}
        groupedExercises={groupedExercises}
        label={`${presetDraft.exerciseIds.length}種目選択中`}
        mode="multi"
        partColors={partColors}
        selectedExerciseIds={presetDraft.exerciseIds}
        onSelectExercise={actions.togglePresetDraftExercise}
        onSelectPart={actions.selectPart}
      />
    </section>
  );
}
