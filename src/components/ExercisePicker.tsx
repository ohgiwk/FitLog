import { DragHandle, EditIcon, TrashIcon } from '../icons';
import { ReorderItem, useExerciseReorder } from '../hooks/useExerciseReorder';
import type { Exercise } from '../types';
import { exerciseCategories } from '../utils';

type ExercisePickerProps = {
  activePart: string | null;
  groupedExercises: Map<string, Exercise[]>;
  label: string;
  mode: 'single' | 'multi' | 'manage';
  partColors: Map<string, string>;
  selectedExerciseIds?: string[];
  onDeleteExercise?: (exerciseId: string) => void;
  onEditExercise?: (part: string, exerciseId: string) => void;
  onReorder?: (part: string, layout: ReorderItem[]) => void;
  onSelectExercise?: (exerciseId: string) => void;
  onSelectPart: (part: string) => void;
};

export function ExercisePicker({
  activePart,
  groupedExercises,
  label,
  mode,
  partColors,
  selectedExerciseIds = [],
  onDeleteExercise,
  onEditExercise,
  onReorder,
  onSelectExercise,
  onSelectPart,
}: ExercisePickerProps) {
  const tabs = [...groupedExercises.keys()];
  const currentPart =
    activePart && groupedExercises.has(activePart) ? activePart : tabs[0];
  const currentExercises = currentPart ? (groupedExercises.get(currentPart) ?? []) : [];
  const reorder = useExerciseReorder({
    exercises: currentExercises,
    onCommit: (layout) => {
      if (currentPart) onReorder?.(currentPart, layout);
    },
  });
  const selectedIds = new Set(selectedExerciseIds);

  return (
    <>
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
              onClick={() => onSelectPart(part)}
            >
              {part}
            </button>
          );
        })}
      </div>
      <div className="content">
        {currentPart && (
          <section className="part-card">
            <div className="part-list-head">
              <span className="part-list-label">{label}</span>
            </div>
            {mode === 'manage' ? (
              <div className="exercise-list" ref={reorder.listRef}>
                {exerciseCategories.map(({ value, label: categoryLabel }) => (
                  <div className="category-section" data-category-section={value} key={value}>
                    <div className="category-subhead">{categoryLabel}</div>
                    <div className="category-rows">
                      {reorder.itemsFor(value).map((exercise) => (
                        <div
                          className={`exercise-option edit-row ${
                            reorder.draggingId === exercise.id ? 'dragging' : ''
                          }`}
                          data-exercise-row={exercise.id}
                          key={exercise.id}
                          onPointerDown={(event) => reorder.onPointerDown(event, exercise.id)}
                          onPointerMove={reorder.onPointerMove}
                          onPointerUp={reorder.onPointerUp}
                          onPointerCancel={reorder.onPointerUp}
                        >
                          <span className="drag-handle" data-drag-handle aria-hidden="true">
                            <DragHandle />
                          </span>
                          <span className="exercise-name">{exercise.name}</span>
                          <button
                            className="edit-exercise"
                            data-row-action
                            type="button"
                            aria-label="種目を編集"
                            onClick={() => onEditExercise?.(exercise.part, exercise.id)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="delete-exercise"
                            data-row-action
                            type="button"
                            aria-label="種目を削除"
                            onClick={() => onDeleteExercise?.(exercise.id)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="exercise-list">
                {exerciseCategories.flatMap(({ value, label: categoryLabel }) => {
                  const items = currentExercises.filter((exercise) => exercise.category === value);
                  if (!items.length) return [];
                  return [
                    <div className="category-subhead" key={`head-${value}`}>
                      {categoryLabel}
                    </div>,
                    ...items.map((exercise) => {
                      const selected = selectedIds.has(exercise.id);
                      return (
                        <button
                          className={`exercise-option ${
                            mode === 'multi' ? 'preset-exercise-option' : ''
                          } ${selected ? 'selected' : ''}`}
                          key={exercise.id}
                          type="button"
                          aria-pressed={mode === 'multi' ? selected : undefined}
                          onClick={() => onSelectExercise?.(exercise.id)}
                        >
                          {mode === 'multi' ? (
                            <>
                              <span>{exercise.name}</span>
                              <span className="preset-exercise-check" aria-hidden="true">
                                {selected ? '✓' : ''}
                              </span>
                            </>
                          ) : (
                            exercise.name
                          )}
                        </button>
                      );
                    }),
                  ];
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
