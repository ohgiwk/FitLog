import { MeasurementType } from '../types';
import { ChevronLeft, DragHandle, TrashIcon } from '../icons';
import { useFitLogContext } from '../hooks/FitLogContext';

/**
 * 種目選択画面が必要とする state・派生値・操作を Context から組み立てる view-model フック
 */
function useSelectScreenModel() {
  const {
    groupedExercises,
    partRecentLabels,
    editMode,
    addFormOpen,
    partInput,
    nameInput,
    measurementTypeInput,
    expandedParts,
    draggingExerciseId,
    actions,
  } = useFitLogContext();

  return {
    groupedExercises,
    partRecentLabels,
    editMode,
    addFormOpen,
    partInput,
    nameInput,
    measurementTypeInput,
    expandedParts,
    draggingExerciseId,
    onBack: () => actions.setScreen('home'),
    /**
     * 編集モードを切り替える。編集モードへ入るときは追加フォームを閉じる
     */
    onToggleEditMode: () => {
      const next = !editMode;
      actions.setEditMode(next);
      if (next) actions.setAddFormOpen(false);
    },
    onToggleAddForm: () => actions.setAddFormOpen(!addFormOpen),
    onPartInput: actions.setPartInput,
    onNameInput: actions.setNameInput,
    onMeasurementTypeInput: actions.setMeasurementTypeInput,
    onAddCustomExercise: actions.addCustomExercise,
    onAddExercise: actions.addExerciseToToday,
    onStartDrag: actions.startPointerExerciseDrag,
    /**
     * 並び替え結果を確定し、ドラッグ中の状態を解除する
     */
    onCommitOrder: (rows: HTMLElement[]) => {
      actions.commitExerciseOrder(rows);
      actions.setDraggingExerciseId(null);
    },
    onDeleteExercise: actions.deleteExercise,
    onUpdateExerciseMeasurementType: actions.updateExerciseMeasurementType,
    onTogglePartExpanded: actions.togglePartExpanded,
    /**
     * 指定した部位を入力欄へ反映し、追加フォームを開く
     */
    onSetPartAndOpenForm: (part: string) => {
      actions.setPartInput(part);
      actions.setAddFormOpen(true);
    },
  };
}

/**
 * 種目選択画面。部位ごとの種目一覧表示・追加・編集(並び替え/削除)を行う
 */
export function SelectScreen() {
  const {
    groupedExercises,
    partRecentLabels,
    editMode,
    addFormOpen,
    partInput,
    nameInput,
    measurementTypeInput,
    expandedParts,
    draggingExerciseId,
    onBack,
    onToggleEditMode,
    onToggleAddForm,
    onPartInput,
    onNameInput,
    onMeasurementTypeInput,
    onAddCustomExercise,
    onAddExercise,
    onStartDrag,
    onCommitOrder,
    onDeleteExercise,
    onUpdateExerciseMeasurementType,
    onTogglePartExpanded,
    onSetPartAndOpenForm,
  } = useSelectScreenModel();
  return (
    <section className="screen active">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>
            <ChevronLeft />
          </button>
          <div className="bar-title">種目を選択</div>
          <button className="bar-btn right" type="button" onClick={onToggleEditMode}>
            {editMode ? '完了' : '編集'}
          </button>
        </div>
      </header>
      <div className="select-actions">
        <button className="outline-pill" type="button" onClick={onToggleAddForm}>
          部位・種目を追加
        </button>
      </div>
      {addFormOpen && (
        <form className="add-form" onSubmit={onAddCustomExercise}>
          <label>
            部位
            <input
              maxLength={12}
              placeholder="胸"
              value={partInput}
              onChange={(event) => onPartInput(event.target.value)}
            />
          </label>
          <label>
            種目名
            <input
              maxLength={30}
              value={nameInput}
              onChange={(event) => onNameInput(event.target.value)}
            />
          </label>
          <div className="form-field">
            <div className="form-label">記録単位</div>
            <MeasurementToggle value={measurementTypeInput} onChange={onMeasurementTypeInput} />
          </div>
          <button className="primary" type="submit">
            追加して記録へ
          </button>
        </form>
      )}
      <div className="content">
        {Array.from(groupedExercises.entries()).map(([part, exercises]) => {
          const expanded = expandedParts.has(part);
          const visibleExercises = editMode || expanded ? exercises : exercises.slice(0, 4);
          return (
            <section className="part-card" key={part}>
              <div className="part-title">
                {part}
                {editMode ? '' : ` - ${partRecentLabels.get(part) || '履歴なし'}`}
              </div>
              <div className="exercise-list" data-part-list={part}>
                {visibleExercises.map((exercise) =>
                  editMode ? (
                    <div
                      className={`exercise-option edit-row ${draggingExerciseId === exercise.id ? 'dragging' : ''}`}
                      data-exercise-row={exercise.id}
                      draggable
                      key={exercise.id}
                      onPointerDown={onStartDrag}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', exercise.id);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDragEnd={() =>
                        onCommitOrder(
                          Array.from(document.querySelectorAll<HTMLElement>('[data-exercise-row]')),
                        )
                      }
                    >
                      <span className="drag-handle" aria-hidden="true">
                        <DragHandle />
                      </span>
                      <span className="exercise-name">{exercise.name}</span>
                      <MeasurementToggle
                        value={exercise.measurementType}
                        compact
                        onChange={(measurementType) =>
                          onUpdateExerciseMeasurementType(exercise.id, measurementType)
                        }
                      />
                      <button
                        className="delete-exercise"
                        data-row-action
                        type="button"
                        aria-label="種目を削除"
                        onClick={() => onDeleteExercise(exercise.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="exercise-option"
                      key={exercise.id}
                      type="button"
                      onClick={() => onAddExercise(exercise.id)}
                    >
                      {exercise.name}
                    </button>
                  ),
                )}
              </div>
              {!editMode && (
                <div className="part-foot">
                  <button type="button" onClick={() => onSetPartAndOpenForm(part)}>
                    種目を追加
                  </button>
                  {exercises.length > 4 ? (
                    <button type="button" onClick={() => onTogglePartExpanded(part)}>
                      {expanded ? '閉じる' : 'すべて表示'}
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 記録単位(回数/秒数)を切り替えるトグルボタン
 */
function MeasurementToggle({
  value,
  compact = false,
  onChange,
}: {
  value: MeasurementType;
  compact?: boolean;
  onChange: (value: MeasurementType) => void;
}) {
  return (
    <div className={`measurement-toggle ${compact ? 'compact' : ''}`} data-row-action>
      <button
        className={value === 'reps' ? 'active' : ''}
        type="button"
        onClick={() => onChange('reps')}
      >
        回数
      </button>
      <button
        className={value === 'seconds' ? 'active' : ''}
        type="button"
        onClick={() => onChange('seconds')}
      >
        秒数
      </button>
    </div>
  );
}
