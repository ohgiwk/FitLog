import { useState } from 'react';
import { Exercise } from '../types';
import { ChevronLeft, DragHandle, EditIcon, PlusIcon, TrashIcon } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { exerciseCategories } from '../utils';
import { useExerciseReorder } from '../hooks/useExerciseReorder';
import { ExerciseDialog, ExerciseFormValue } from '../components/ExerciseDialog';

function useSelectScreenModel() {
  const {
    groupedExercises,
    partRecentLabels,
    orderedParts,
    partColors,
    editMode,
    activePart,
    actions,
  } = useFitLogContext();
  return {
    groupedExercises,
    partRecentLabels,
    orderedParts,
    partColors,
    editMode,
    activePart,
    onBack: () => actions.setScreen('home'),
    onToggleEditMode: () => actions.setEditMode(!editMode),
    onAddExercise: actions.addExerciseToToday,
    onAddExerciseToPart: actions.addExerciseToPart,
    onReorder: actions.reorderPartExercises,
    onDeleteExercise: actions.deleteExercise,
    onUpdateExercise: actions.updateExercise,
    onSelectPart: actions.selectPart,
  };
}

export function SelectScreen() {
  const model = useSelectScreenModel();
  const selectableParts = model.orderedParts.length
    ? model.orderedParts.map((part) => part.name)
    : ['その他'];
  const [dialogPart, setDialogPart] = useState<string | null>(null);
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);
  const tabs = [...model.groupedExercises.keys()];
  const currentPart =
    model.activePart && model.groupedExercises.has(model.activePart) ? model.activePart : tabs[0];
  const currentExercises = currentPart ? (model.groupedExercises.get(currentPart) ?? []) : [];
  const reorder = useExerciseReorder({
    exercises: currentExercises,
    onCommit: (layout) => {
      if (currentPart) model.onReorder(currentPart, layout);
    },
  });

  function addExercise(value: ExerciseFormValue) {
    return model.onAddExerciseToPart(value.part, value.name, value.measurementType, value.category);
  }

  function updateExercise(value: ExerciseFormValue) {
    return editExercise ? model.onUpdateExercise(editExercise.id, value) : false;
  }

  return (
    <section className="screen active">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={model.onBack}>
            <ChevronLeft />
          </button>
          <div className="bar-title">種目を選択</div>
          <button className="bar-btn right" type="button" onClick={model.onToggleEditMode}>
            {model.editMode ? '完了' : '編集'}
          </button>
        </div>
        <div className="part-tabs" role="tablist" aria-label="部位">
          {tabs.map((part) => {
            const isActive = part === currentPart;
            const color = model.partColors.get(part);
            return (
              <button
                className={`part-tab ${isActive ? 'active' : ''}`}
                key={part}
                type="button"
                role="tab"
                aria-selected={isActive}
                style={isActive && color ? { background: color } : undefined}
                onClick={() => model.onSelectPart(part)}
              >
                {part}
              </button>
            );
          })}
        </div>
      </header>
      <div className="content">
        {currentPart && (
          <section className="part-card">
            <div className="part-list-head">
              <span className="part-list-label">
                {model.editMode
                  ? `${currentPart}の種目`
                  : model.partRecentLabels.get(currentPart) || '履歴なし'}
              </span>
              {model.editMode && (
                <button
                  className="part-add"
                  type="button"
                  aria-label={`${currentPart}に種目を追加`}
                  onClick={() => setDialogPart(currentPart)}
                >
                  <PlusIcon />
                </button>
              )}
            </div>
            {model.editMode ? (
              <div className="exercise-list" ref={reorder.listRef}>
                {exerciseCategories.map(({ value, label }) => (
                  <div className="category-section" data-category-section={value} key={value}>
                    <div className="category-subhead">{label}</div>
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
                            onClick={() => setEditExercise(exercise)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="delete-exercise"
                            data-row-action
                            type="button"
                            aria-label="種目を削除"
                            onClick={() => model.onDeleteExercise(exercise.id)}
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
                {exerciseCategories.flatMap(({ value, label }) => {
                  const items = currentExercises.filter((exercise) => exercise.category === value);
                  if (!items.length) return [];
                  return [
                    <div className="category-subhead" key={`head-${value}`}>
                      {label}
                    </div>,
                    ...items.map((exercise) => (
                      <button
                        className="exercise-option"
                        key={exercise.id}
                        type="button"
                        onClick={() => model.onAddExercise(exercise.id)}
                      >
                        {exercise.name}
                      </button>
                    )),
                  ];
                })}
              </div>
            )}
          </section>
        )}
      </div>
      {dialogPart !== null && (
        <ExerciseDialog
          title="種目を追加"
          submitLabel="追加"
          initialValue={{
            part: dialogPart,
            name: '',
            category: 'free',
            measurementType: 'reps',
          }}
          parts={selectableParts}
          onClose={() => setDialogPart(null)}
          onSubmit={addExercise}
        />
      )}
      {editExercise !== null && (
        <ExerciseDialog
          title="種目を編集"
          submitLabel="保存"
          initialValue={{
            part: editExercise.part,
            name: editExercise.name,
            measurementType: editExercise.measurementType,
            category: editExercise.category,
          }}
          parts={selectableParts}
          onClose={() => setEditExercise(null)}
          onSubmit={updateExercise}
        />
      )}
    </section>
  );
}
