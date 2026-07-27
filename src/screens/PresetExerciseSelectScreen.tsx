import { ExercisePicker } from '../components/ExercisePicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { useFitLogContext } from '../hooks/useFitLogContext';

/**
 * プリセット下書きへ追加する種目を部位・カテゴリ別に複数選択する画面
 */
export function PresetExerciseSelectScreen() {
  const { presetDraft, groupedExercises, partColors, activePart, actions } = useFitLogContext();

  if (!presetDraft) return null;

  return (
    <section className="screen active">
      <ScreenHeader
        title="メニュー種目"
        right={
          <button className="bar-btn right" type="button" onClick={actions.goBack}>
            完了
          </button>
        }
      />
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
