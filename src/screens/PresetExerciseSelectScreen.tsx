import { ChevronLeft } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { exerciseCategories } from '../utils';

/**
 * プリセット下書きへ追加する種目を部位・カテゴリ別に複数選択する画面
 */
export function PresetExerciseSelectScreen() {
  const { presetDraft, groupedExercises, partColors, activePart, actions } = useFitLogContext();
  const tabs = [...groupedExercises.keys()];
  const currentPart = activePart && groupedExercises.has(activePart) ? activePart : tabs[0];
  const currentExercises = currentPart ? (groupedExercises.get(currentPart) ?? []) : [];

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
          <div className="bar-title">プリセット種目</div>
          <button
            className="bar-btn right"
            type="button"
            onClick={() => actions.setScreen('presetEdit')}
          >
            完了
          </button>
        </div>
        <div className="part-tabs" role="tablist" aria-label="部位">
          {tabs.map((part) => {
            const isActive = part === currentPart;
            const color = partColors.get(part);
            return (
              <button
                className={`part-tab ${isActive ? 'active' : ''}`}
                key={part}
                type="button"
                role="tab"
                aria-selected={isActive}
                style={isActive && color ? { background: color } : undefined}
                onClick={() => actions.selectPart(part)}
              >
                {part}
              </button>
            );
          })}
        </div>
      </header>
      <div className="content">
        <section className="part-card">
          <div className="part-list-head">
            <span className="part-list-label">{presetDraft.exerciseIds.length}種目選択中</span>
          </div>
          <div className="exercise-list">
            {exerciseCategories.flatMap(({ value, label }) => {
              const items = currentExercises.filter((exercise) => exercise.category === value);
              if (!items.length) return [];
              return [
                <div className="category-subhead" key={`head-${value}`}>
                  {label}
                </div>,
                ...items.map((exercise) => {
                  const selected = presetDraft.exerciseIds.includes(exercise.id);
                  return (
                    <button
                      className={`exercise-option preset-exercise-option ${selected ? 'selected' : ''}`}
                      key={exercise.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => actions.togglePresetDraftExercise(exercise.id)}
                    >
                      <span>{exercise.name}</span>
                      <span className="preset-exercise-check" aria-hidden="true">
                        {selected ? '✓' : ''}
                      </span>
                    </button>
                  );
                }),
              ];
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
