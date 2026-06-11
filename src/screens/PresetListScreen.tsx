import { useState } from 'react';
import { ChevronLeft, TrashIcon } from '../icons';
import { Preset } from '../types';
import { useFitLogContext } from '../hooks/FitLogContext';

/**
 * プリセット管理画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function usePresetListScreenModel() {
  const { state, actions } = useFitLogContext();

  return {
    presets: state.presets,
    exercises: state.exercises,
    onBack: () => actions.setScreen('home'),
    onCreate: actions.createPreset,
    /**
     * 編集対象のプリセットを設定し、編集画面へ遷移する
     */
    onEdit: (presetId: string) => {
      actions.setCurrentEditingPresetId(presetId);
      actions.setScreen('presetEdit');
    },
    onDelete: actions.deletePreset,
  };
}

/**
 * プリセット管理画面。プリセットの一覧表示・作成・編集・削除を行う
 */
export function PresetListScreen() {
  const { presets, exercises, onBack, onCreate, onEdit, onDelete } = usePresetListScreenModel();
  const [deleteTarget, setDeleteTarget] = useState<Preset | null>(null);

  /**
   * 確認ダイアログで選んだプリセットを削除する
   */
  function confirmDelete() {
    if (!deleteTarget) return;
    onDelete(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <section className="screen active">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>
            <ChevronLeft />
          </button>
          <div className="bar-title">プリセット管理</div>
          <button className="bar-btn right" type="button" onClick={onCreate}>
            追加
          </button>
        </div>
      </header>
      <div className="preset-wrap">
        {!presets.length ? (
          <div className="empty">
            <div>
              <strong>プリセットはまだありません</strong>
              <span>右上の追加から分割法メニューを作成できます。</span>
            </div>
          </div>
        ) : (
          <article className="preset-card">
            {presets.map((preset) => {
              const validCount = preset.exerciseIds.filter((exerciseId) =>
                exercises.some((exercise) => exercise.id === exerciseId),
              ).length;
              return (
                <div className="preset-list-row" key={preset.id}>
                  <button
                    className="preset-list-main"
                    type="button"
                    onClick={() => onEdit(preset.id)}
                  >
                    <div className="preset-list-name">{preset.name}</div>
                    <div className="preset-list-count">{validCount}種目</div>
                  </button>
                  <button className="small-outline" type="button" onClick={() => onEdit(preset.id)}>
                    編集
                  </button>
                  <button
                    className="preset-row-btn"
                    type="button"
                    aria-label="プリセット削除"
                    onClick={() => setDeleteTarget(preset)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </article>
        )}
      </div>
      {deleteTarget && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-delete-title"
          >
            <div id="preset-delete-title" className="confirm-title">
              プリセットを削除しますか？
            </div>
            <p>「{deleteTarget.name}」を削除します。この操作は元に戻せません。</p>
            <div className="confirm-actions">
              <button className="small-outline" type="button" onClick={() => setDeleteTarget(null)}>
                キャンセル
              </button>
              <button className="danger-button" type="button" onClick={confirmDelete}>
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
