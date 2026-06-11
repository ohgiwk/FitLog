import { FormEvent, PointerEvent } from "react";
import { ChevronLeft, DragHandle, TrashIcon } from "../icons";
import { Exercise, MeasurementType } from "../types";

/**
 * 種目選択画面。部位ごとの種目一覧表示・追加・編集(並び替え/削除)を行う
 */
export function SelectScreen({ groupedExercises, partRecentLabels, editMode, addFormOpen, partInput, nameInput, measurementTypeInput, expandedParts, draggingExerciseId, onBack, onToggleEditMode, onToggleAddForm, onPartInput, onNameInput, onMeasurementTypeInput, onAddCustomExercise, onAddExercise, onStartDrag, onCommitOrder, onDeleteExercise, onUpdateExerciseMeasurementType, onTogglePartExpanded, onSetPartAndOpenForm }: {
  groupedExercises: Map<string, Exercise[]>;
  partRecentLabels: Map<string, string>;
  editMode: boolean;
  addFormOpen: boolean;
  partInput: string;
  nameInput: string;
  measurementTypeInput: MeasurementType;
  expandedParts: Set<string>;
  draggingExerciseId: string | null;
  onBack: () => void;
  onToggleEditMode: () => void;
  onToggleAddForm: () => void;
  onPartInput: (value: string) => void;
  onNameInput: (value: string) => void;
  onMeasurementTypeInput: (value: MeasurementType) => void;
  onAddCustomExercise: (event: FormEvent) => void;
  onAddExercise: (exerciseId: string) => void;
  onStartDrag: (event: PointerEvent<HTMLDivElement>) => void;
  onCommitOrder: (rows: HTMLElement[]) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onUpdateExerciseMeasurementType: (exerciseId: string, measurementType: MeasurementType) => void;
  onTogglePartExpanded: (part: string) => void;
  onSetPartAndOpenForm: (part: string) => void;
}) {
  return (
    <section className="screen active">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}><ChevronLeft /></button>
          <div className="bar-title">種目を選択</div>
          <button className="bar-btn right" type="button" onClick={onToggleEditMode}>{editMode ? "完了" : "編集"}</button>
        </div>
      </header>
      <div className="select-actions">
        <button className="outline-pill" type="button" onClick={onToggleAddForm}>部位・種目を追加</button>
      </div>
      {addFormOpen && (
        <form className="add-form" onSubmit={onAddCustomExercise}>
          <label>部位<input maxLength={12} placeholder="胸" value={partInput} onChange={(event) => onPartInput(event.target.value)} /></label>
          <label>種目名<input maxLength={30} value={nameInput} onChange={(event) => onNameInput(event.target.value)} /></label>
          <div className="form-field">
            <div className="form-label">記録単位</div>
            <MeasurementToggle value={measurementTypeInput} onChange={onMeasurementTypeInput} />
          </div>
          <button className="primary" type="submit">追加して記録へ</button>
        </form>
      )}
      <div className="content">
        {Array.from(groupedExercises.entries()).map(([part, exercises]) => {
          const expanded = expandedParts.has(part);
          const visibleExercises = editMode || expanded ? exercises : exercises.slice(0, 4);
          return (
            <section className="part-card" key={part}>
              <div className="part-title">{part}{editMode ? "" : ` - ${partRecentLabels.get(part) || "履歴なし"}`}</div>
              <div className="exercise-list" data-part-list={part}>
                {visibleExercises.map((exercise) =>
                  editMode ? (
                    <div
                      className={`exercise-option edit-row ${draggingExerciseId === exercise.id ? "dragging" : ""}`}
                      data-exercise-row={exercise.id}
                      draggable
                      key={exercise.id}
                      onPointerDown={onStartDrag}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", exercise.id);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDragEnd={() => onCommitOrder(Array.from(document.querySelectorAll<HTMLElement>("[data-exercise-row]")))}
                    >
                      <span className="drag-handle" aria-hidden="true"><DragHandle /></span>
                      <span className="exercise-name">{exercise.name}</span>
                      <MeasurementToggle
                        value={exercise.measurementType}
                        compact
                        onChange={(measurementType) => onUpdateExerciseMeasurementType(exercise.id, measurementType)}
                      />
                      <button className="delete-exercise" data-row-action type="button" aria-label="種目を削除" onClick={() => onDeleteExercise(exercise.id)}><TrashIcon /></button>
                    </div>
                  ) : (
                    <button className="exercise-option" key={exercise.id} type="button" onClick={() => onAddExercise(exercise.id)}>{exercise.name}</button>
                  )
                )}
              </div>
              {!editMode && (
                <div className="part-foot">
                  <button type="button" onClick={() => onSetPartAndOpenForm(part)}>種目を追加</button>
                  {exercises.length > 4 ? <button type="button" onClick={() => onTogglePartExpanded(part)}>{expanded ? "閉じる" : "すべて表示"}</button> : <span />}
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
function MeasurementToggle({ value, compact = false, onChange }: { value: MeasurementType; compact?: boolean; onChange: (value: MeasurementType) => void }) {
  return (
    <div className={`measurement-toggle ${compact ? "compact" : ""}`} data-row-action>
      <button className={value === "reps" ? "active" : ""} type="button" onClick={() => onChange("reps")}>回数</button>
      <button className={value === "seconds" ? "active" : ""} type="button" onClick={() => onChange("seconds")}>秒数</button>
    </div>
  );
}
