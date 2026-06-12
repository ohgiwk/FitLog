import { FormEvent, useState } from 'react';
import { Exercise, ExerciseCategory, MeasurementType } from '../types';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  DragHandle,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from '../icons';
import { useFitLogContext } from '../hooks/FitLogContext';
import { exerciseCategories } from '../utils';

/**
 * 種目選択画面が必要とする state・派生値・操作を Context から組み立てる view-model フック
 */
function useSelectScreenModel() {
  const {
    groupedExercises,
    partRecentLabels,
    orderedParts,
    partColors,
    editMode,
    activePart,
    draggingExerciseId,
    actions,
  } = useFitLogContext();

  return {
    groupedExercises,
    partRecentLabels,
    orderedParts,
    partColors,
    editMode,
    activePart,
    draggingExerciseId,
    onBack: () => actions.setScreen('home'),
    /**
     * 編集モードを切り替える
     */
    onToggleEditMode: () => actions.setEditMode(!editMode),
    onAddExercise: actions.addExerciseToToday,
    onAddExerciseToPart: actions.addExerciseToPart,
    onStartDrag: actions.startPointerExerciseDrag,
    /**
     * 並び替え結果を確定し、ドラッグ中の状態を解除する
     */
    onCommitOrder: (rows: HTMLElement[]) => {
      actions.commitExerciseOrder(rows);
      actions.setDraggingExerciseId(null);
    },
    onDeleteExercise: actions.deleteExercise,
    onUpdateExercise: actions.updateExercise,
    onSelectPart: actions.selectPart,
  };
}

/**
 * 種目選択画面。部位タブで切り替えつつ、選択中の部位の種目一覧(カテゴリ別)を
 * 表示・追加・編集(並び替え/削除)する
 */
export function SelectScreen() {
  const {
    groupedExercises,
    partRecentLabels,
    orderedParts,
    partColors,
    editMode,
    activePart,
    draggingExerciseId,
    onBack,
    onToggleEditMode,
    onAddExercise,
    onAddExerciseToPart,
    onStartDrag,
    onCommitOrder,
    onDeleteExercise,
    onUpdateExercise,
    onSelectPart,
  } = useSelectScreenModel();
  const partOptions = orderedParts.map((part) => part.name);
  const selectableParts = partOptions.length ? partOptions : ['その他'];
  const [dialogPart, setDialogPart] = useState<string | null>(null);
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);
  const tabs = Array.from(groupedExercises.keys());
  const firstPart = tabs[0];
  /**
   * 選択中タブが未設定、または種目が無くなった部位を指しているときは先頭タブを使う
   */
  const currentPart = activePart && groupedExercises.has(activePart) ? activePart : firstPart;
  const currentExercises = currentPart ? groupedExercises.get(currentPart) || [] : [];

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
        <div className="part-tabs" role="tablist" aria-label="部位">
          {tabs.map((part) => {
            const isActive = part === currentPart;
            const color = partColors.get(part);
            /**
             * 文字色は常に白。選択中はその部位の色を背景にする
             */
            const style = isActive && color ? { background: color } : undefined;
            return (
              <button
                className={`part-tab ${isActive ? 'active' : ''}`}
                key={part}
                type="button"
                role="tab"
                aria-selected={isActive}
                style={style}
                onClick={() => onSelectPart(part)}
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
                {editMode ? `${currentPart}の種目` : partRecentLabels.get(currentPart) || '履歴なし'}
              </span>
              {editMode && (
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
            <div className="exercise-list" data-part-list={currentPart}>
              {exerciseCategories.flatMap(({ value, label }) => {
                const items = currentExercises.filter((exercise) => exercise.category === value);
                if (!items.length) return [];
                return [
                  <div className="category-subhead" key={`head-${value}`}>
                    {label}
                  </div>,
                  ...items.map((exercise) =>
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
                            Array.from(
                              document.querySelectorAll<HTMLElement>('[data-exercise-row]'),
                            ),
                          )
                        }
                      >
                        <span className="drag-handle" aria-hidden="true">
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
                  ),
                ];
              })}
            </div>
          </section>
        )}
      </div>
      {dialogPart !== null && (
        <AddExerciseDialog
          initialPart={dialogPart}
          parts={selectableParts}
          onClose={() => setDialogPart(null)}
          onSubmit={onAddExerciseToPart}
        />
      )}
      {editExercise !== null && (
        <EditExerciseDialog
          exercise={editExercise}
          onClose={() => setEditExercise(null)}
          onSubmit={onUpdateExercise}
        />
      )}
    </section>
  );
}

/**
 * 編集モードで部位ヘッダの「＋」から開く、種目追加ダイアログ。
 * 部位・種目名・(詳細設定の)記録単位を入力し、追加後はこの画面の編集モードに留まる
 */
function AddExerciseDialog({
  initialPart,
  parts,
  onClose,
  onSubmit,
}: {
  initialPart: string;
  parts: string[];
  onClose: () => void;
  onSubmit: (
    part: string,
    name: string,
    measurementType: MeasurementType,
    category: ExerciseCategory,
  ) => boolean;
}) {
  const [part, setPart] = useState(initialPart);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('free');
  const [measurementType, setMeasurementType] = useState<MeasurementType>('reps');
  const [detailOpen, setDetailOpen] = useState(false);

  /**
   * 入力内容で種目を追加し、成功したらダイアログを閉じる
   */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (onSubmit(part, name, measurementType, category)) onClose();
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="confirm-dialog add-exercise-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-exercise-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-title" id="add-exercise-title">
          種目を追加
        </div>
        <form className="add-form" onSubmit={handleSubmit}>
          <label>
            部位
            <select
              className="add-form-select"
              value={part}
              onChange={(event) => setPart(event.target.value)}
            >
              {parts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            種目名
            <input
              autoFocus
              maxLength={30}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            カテゴリ
            <select
              className="add-form-select"
              value={category}
              onChange={(event) => setCategory(event.target.value as ExerciseCategory)}
            >
              {exerciseCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="add-form-detail-toggle"
            type="button"
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((open) => !open)}
          >
            <span>詳細設定</span>
            {detailOpen ? <ChevronUp /> : <ChevronDown />}
          </button>
          {detailOpen && (
            <div className="form-field form-field-row">
              <div className="form-label">記録単位</div>
              <MeasurementToggle value={measurementType} onChange={setMeasurementType} />
            </div>
          )}
          <div className="confirm-actions">
            <button className="small-outline" type="button" onClick={onClose}>
              キャンセル
            </button>
            <button className="small-primary" type="submit" disabled={!name.trim()}>
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 編集モードで種目行の編集アイコンから開く、種目編集ダイアログ。
 * 種目名・カテゴリ・(詳細設定の)記録単位を編集し、保存すると編集モードに留まる
 */
function EditExerciseDialog({
  exercise,
  onClose,
  onSubmit,
}: {
  exercise: Exercise;
  onClose: () => void;
  onSubmit: (
    exerciseId: string,
    fields: { name: string; measurementType: MeasurementType; category: ExerciseCategory },
  ) => boolean;
}) {
  const [name, setName] = useState(exercise.name);
  const [category, setCategory] = useState<ExerciseCategory>(exercise.category);
  const [measurementType, setMeasurementType] = useState<MeasurementType>(exercise.measurementType);
  const [detailOpen, setDetailOpen] = useState(false);

  /**
   * 入力内容で種目を更新し、成功したらダイアログを閉じる
   */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (onSubmit(exercise.id, { name, measurementType, category })) onClose();
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="confirm-dialog add-exercise-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-exercise-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-title" id="edit-exercise-title">
          種目を編集
        </div>
        <form className="add-form" onSubmit={handleSubmit}>
          <label>
            種目名
            <input
              autoFocus
              maxLength={30}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            カテゴリ
            <select
              className="add-form-select"
              value={category}
              onChange={(event) => setCategory(event.target.value as ExerciseCategory)}
            >
              {exerciseCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="add-form-detail-toggle"
            type="button"
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((open) => !open)}
          >
            <span>詳細設定</span>
            {detailOpen ? <ChevronUp /> : <ChevronDown />}
          </button>
          {detailOpen && (
            <div className="form-field form-field-row">
              <div className="form-label">記録単位</div>
              <MeasurementToggle value={measurementType} onChange={setMeasurementType} />
            </div>
          )}
          <div className="confirm-actions">
            <button className="small-outline" type="button" onClick={onClose}>
              キャンセル
            </button>
            <button className="small-primary" type="submit" disabled={!name.trim()}>
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
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
