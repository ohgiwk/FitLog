import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, TrashIcon } from "../icons";
import { Exercise, Preset } from "../types";

/**
 * プリセット編集画面。名称変更・種目の追加/削除/並び替えを行う
 */
export function PresetEditScreen({ preset, exercises, groupedExercises, onBack, onRename, onDelete, onAdd, onRemove, onMove }: {
  preset: Preset | null;
  exercises: Exercise[];
  groupedExercises: Map<string, Exercise[]>;
  onBack: () => void;
  onRename: (presetId: string, name: string) => void;
  onDelete: (presetId: string) => void;
  onAdd: (presetId: string, exerciseId: string) => void;
  onRemove: (presetId: string, exerciseId: string) => void;
  onMove: (presetId: string, exerciseId: string, direction: number) => void;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  /**
   * 確認ダイアログで編集中のプリセットを削除する
   */
  function confirmDelete() {
    if (!preset) return;
    onDelete(preset.id);
    setDeleteDialogOpen(false);
  }

  return (
    <section className="screen active">
      <header className="topbar"><div className="bar-row"><button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}><ChevronLeft /></button><div className="bar-title">プリセット編集</div><span /></div></header>
      <div className="preset-wrap">
        {!preset ? (
          <div className="empty"><div><strong>編集するプリセットを選択してください</strong><span>プリセット管理画面から編集できます。</span></div></div>
        ) : (
          <article className="preset-card">
            <header className="preset-card-head">
              <input className="preset-name-input" maxLength={24} value={preset.name} aria-label="プリセット名" onChange={(event) => onRename(preset.id, event.target.value)} />
              <button className="preset-delete" type="button" aria-label="プリセット削除" onClick={() => setDeleteDialogOpen(true)}><TrashIcon /></button>
            </header>
            <div>
              {preset.exerciseIds.length ? preset.exerciseIds.map((exerciseId, index) => {
                const exercise = exercises.find((item) => item.id === exerciseId);
                const name = exercise ? `${exercise.part} - ${exercise.name}` : "削除済みの種目";
                return (
                  <div className="preset-row" key={exerciseId}>
                    <div className="preset-row-name">{name}</div>
                    <button className="preset-row-btn" type="button" aria-label="上へ移動" disabled={index === 0} onClick={() => onMove(preset.id, exerciseId, -1)}><ChevronUp /></button>
                    <button className="preset-row-btn" type="button" aria-label="下へ移動" disabled={index === preset.exerciseIds.length - 1} onClick={() => onMove(preset.id, exerciseId, 1)}><ChevronDown /></button>
                    <button className="preset-row-btn" type="button" aria-label="種目を外す" onClick={() => onRemove(preset.id, exerciseId)}><TrashIcon /></button>
                  </div>
                );
              }) : (
                <div className="empty" style={{ minHeight: 120 }}><div><strong>種目未登録</strong><span>下の候補から種目を追加してください。</span></div></div>
              )}
            </div>
            <div className="preset-add">
              <div className="preset-add-title">種目を追加</div>
              {Array.from(groupedExercises.entries()).map(([part, partExercises]) => (
                <div className="preset-add-group" key={part}>
                  <div className="preset-add-part">{part}</div>
                  <div className="preset-add-options">
                    {partExercises.map((exercise) => (
                      <button key={exercise.id} type="button" disabled={preset.exerciseIds.includes(exercise.id)} onClick={() => onAdd(preset.id, exercise.id)}>{exercise.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}
      </div>
      {preset && deleteDialogOpen && (
        <div className="dialog-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="preset-edit-delete-title">
            <div id="preset-edit-delete-title" className="confirm-title">プリセットを削除しますか？</div>
            <p>「{preset.name}」を削除します。この操作は元に戻せません。</p>
            <div className="confirm-actions">
              <button className="small-outline" type="button" onClick={() => setDeleteDialogOpen(false)}>キャンセル</button>
              <button className="danger-button" type="button" onClick={confirmDelete}>削除</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
