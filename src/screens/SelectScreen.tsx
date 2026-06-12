import { FormEvent, PointerEvent, useRef, useState } from 'react';
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
 * 器具カテゴリの表示順での並び(value のみ)
 */
const categoryOrder = exerciseCategories.map((item) => item.value);

/**
 * 種目選択画面が必要とする state・派生値・操作を Context から組み立てる view-model フック
 */
function useSelectScreenModel() {
  const { groupedExercises, partRecentLabels, orderedParts, partColors, editMode, activePart, actions } =
    useFitLogContext();

  return {
    groupedExercises,
    partRecentLabels,
    orderedParts,
    partColors,
    editMode,
    activePart,
    onBack: () => actions.setScreen('home'),
    /**
     * 編集モードを切り替える
     */
    onToggleEditMode: () => actions.setEditMode(!editMode),
    onAddExercise: actions.addExerciseToToday,
    onAddExerciseToPart: actions.addExerciseToPart,
    onReorder: actions.reorderPartExercises,
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
    onBack,
    onToggleEditMode,
    onAddExercise,
    onAddExerciseToPart,
    onReorder,
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

  const reorder = useExerciseReorder({
    exercises: currentExercises,
    onCommit: (layout) => {
      if (currentPart) onReorder(currentPart, layout);
    },
  });

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
            {editMode ? (
              <div className="exercise-list" ref={reorder.listRef}>
                {exerciseCategories.map(({ value, label }) => {
                  const items = reorder.itemsFor(value);
                  return (
                    <div className="category-section" data-category-section={value} key={value}>
                      <div className="category-subhead">{label}</div>
                      <div className="category-rows">
                        {items.map((exercise) => (
                          <div
                            className={`exercise-option edit-row ${reorder.draggingId === exercise.id ? 'dragging' : ''}`}
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
                              onClick={() => onDeleteExercise(exercise.id)}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
                        onClick={() => onAddExercise(exercise.id)}
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
          parts={selectableParts}
          onClose={() => setEditExercise(null)}
          onSubmit={onUpdateExercise}
        />
      )}
    </section>
  );
}

/**
 * 種目のレイアウト(表示順とカテゴリ)を表す 1 要素
 */
type ReorderItem = { id: string; category: ExerciseCategory };

/**
 * 2 つのレイアウトが同一(順序・カテゴリとも)か判定する
 */
function sameLayout(a: ReorderItem[], b: ReorderItem[]) {
  return (
    a.length === b.length &&
    a.every((item, index) => item.id === b[index].id && item.category === b[index].category)
  );
}

/**
 * 種目行のドラッグ並び替えを、DOM を直接書き換えずに React の state で管理するフック。
 * ポインタ位置から「挿入先カテゴリ」と「挿入位置」を計算し、作業中のレイアウトを返す。
 * カテゴリをまたいでドロップした種目は移動先カテゴリへ変わり、終了時に確定する
 */
function useExerciseReorder({
  exercises,
  onCommit,
}: {
  exercises: Exercise[];
  onCommit: (layout: ReorderItem[]) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [layout, setLayout] = useState<ReorderItem[] | null>(null);

  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  /**
   * 既定レイアウトは、カテゴリ表示順 → 各カテゴリ内は種目配列順で並べたもの
   */
  const baseLayout: ReorderItem[] = categoryOrder.flatMap((category) =>
    exercises
      .filter((exercise) => exercise.category === category)
      .map((exercise) => ({ id: exercise.id, category })),
  );
  const activeLayout = layout ?? baseLayout;

  /**
   * 指定カテゴリに属する種目を、現在の作業レイアウト順で返す
   */
  function itemsFor(category: ExerciseCategory): Exercise[] {
    return activeLayout
      .filter((item) => item.category === category)
      .map((item) => byId.get(item.id))
      .filter((exercise): exercise is Exercise => Boolean(exercise));
  }

  /**
   * フラットなレイアウト配列内で、対象カテゴリ・挿入先 ID から挿入位置を求める。
   * 挿入先 ID が無い(カテゴリ末尾/空カテゴリ)場合もグループ順を保つ位置を返す
   */
  function insertionIndex(list: ReorderItem[], category: ExerciseCategory, beforeId: string | null) {
    if (beforeId) {
      const index = list.findIndex((item) => item.id === beforeId);
      if (index !== -1) return index;
    }
    const targetRank = categoryOrder.indexOf(category);
    let index = 0;
    list.forEach((item, i) => {
      if (categoryOrder.indexOf(item.category) <= targetRank) index = i + 1;
    });
    return index;
  }

  /**
   * ドラッグハンドル上での押下だけドラッグを開始する
   */
  function onPointerDown(event: PointerEvent<HTMLDivElement>, id: string) {
    if (!(event.target as HTMLElement).closest('[data-drag-handle]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setLayout(baseLayout);
  }

  /**
   * ポインタ位置から挿入先カテゴリと位置を割り出し、ドラッグ中の種目を移動する
   */
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (draggingId === null || !listRef.current) return;
    const y = event.clientY;
    const sections = Array.from(
      listRef.current.querySelectorAll<HTMLElement>('[data-category-section]'),
    );
    if (!sections.length) return;

    /**
     * ポインタが含まれるカテゴリ区画を探す。無ければ先頭より上は先頭、以降は最後の区画
     */
    let targetCategory = sections[sections.length - 1].dataset.categorySection as ExerciseCategory;
    for (const section of sections) {
      const box = section.getBoundingClientRect();
      if (y < box.bottom) {
        targetCategory = section.dataset.categorySection as ExerciseCategory;
        break;
      }
    }

    const section = sections.find((item) => item.dataset.categorySection === targetCategory);
    let insertBeforeId: string | null = null;
    if (section) {
      const rows = Array.from(section.querySelectorAll<HTMLElement>('[data-exercise-row]'));
      for (const row of rows) {
        const id = row.dataset.exerciseRow;
        if (!id || id === draggingId) continue;
        const box = row.getBoundingClientRect();
        if (y < box.top + box.height / 2) {
          insertBeforeId = id;
          break;
        }
      }
    }

    setLayout((prev) => {
      const current = prev ?? baseLayout;
      const filtered = current.filter((item) => item.id !== draggingId);
      const index = insertionIndex(filtered, targetCategory, insertBeforeId);
      const next = [...filtered];
      next.splice(index, 0, { id: draggingId, category: targetCategory });
      return sameLayout(next, current) ? current : next;
    });
  }

  /**
   * ドラッグを終了し、レイアウト(順序・カテゴリ)が変わっていれば確定する
   */
  function onPointerUp() {
    if (draggingId !== null && layout && !sameLayout(layout, baseLayout)) {
      onCommit(layout);
    }
    setDraggingId(null);
    setLayout(null);
  }

  return { listRef, draggingId, itemsFor, onPointerDown, onPointerMove, onPointerUp };
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
  parts,
  onClose,
  onSubmit,
}: {
  exercise: Exercise;
  parts: string[];
  onClose: () => void;
  onSubmit: (
    exerciseId: string,
    fields: {
      part: string;
      name: string;
      measurementType: MeasurementType;
      category: ExerciseCategory;
    },
  ) => boolean;
}) {
  const [part, setPart] = useState(exercise.part);
  const [name, setName] = useState(exercise.name);
  const [category, setCategory] = useState<ExerciseCategory>(exercise.category);
  const [measurementType, setMeasurementType] = useState<MeasurementType>(exercise.measurementType);
  const [detailOpen, setDetailOpen] = useState(false);
  /**
   * 変更前の部位が選択肢に無い場合に備え、先頭へ補っておく
   */
  const partChoices = parts.includes(part) ? parts : [part, ...parts];

  /**
   * 入力内容で種目を更新し、成功したらダイアログを閉じる
   */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (onSubmit(exercise.id, { part, name, measurementType, category })) onClose();
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
            部位
            <select
              className="add-form-select"
              value={part}
              onChange={(event) => setPart(event.target.value)}
            >
              {partChoices.map((item) => (
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
