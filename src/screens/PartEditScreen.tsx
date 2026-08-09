import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { PartSetting } from '../types';
import { partColorPalette } from '../data/partColors';
import { DragHandle, TrashIcon } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { useFlatReorder } from '../hooks/useFlatReorder';

/**
 * 部位の編集画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function usePartEditScreenModel() {
  const { orderedParts, actions } = useFitLogContext();
  return {
    orderedParts,
    onAddPart: actions.addPart,
    onDeletePart: actions.deletePart,
    onReorderParts: actions.reorderParts,
    onSetPartColor: actions.setPartColor,
  };
}

/**
 * 部位の編集画面。部位の追加・削除・並び替え・表示色の変更を行う
 */
type PartEditScreenProps = {
  addDialogOpen: boolean;
  onCloseAddDialog: () => void;
};

export function PartEditScreen({ addDialogOpen, onCloseAddDialog }: PartEditScreenProps) {
  const { orderedParts, onAddPart, onDeletePart, onReorderParts, onSetPartColor } =
    usePartEditScreenModel();
  const [newPartName, setNewPartName] = useState('');
  const reorder = useFlatReorder({
    items: orderedParts.map((part) => part.name),
    onCommit: onReorderParts,
  });
  const partsByName = new Map(orderedParts.map((part) => [part.name, part]));
  const draggedPart = reorder.draggingId ? partsByName.get(reorder.draggingId) : undefined;

  useEffect(() => {
    if (addDialogOpen) setNewPartName('');
  }, [addDialogOpen]);

  /**
   * 入力中の名前で部位を追加し、入力欄を空に戻す
   */
  function handleAddPart(event: FormEvent) {
    event.preventDefault();
    const trimmed = newPartName.trim();
    if (!trimmed) return;
    onAddPart(trimmed);
    setNewPartName('');
    onCloseAddDialog();
  }

  return (
    <section className="screen active">
      <ScreenHeader title="部位の編集" />
      <div className="content">
        {!orderedParts.length ? (
          <div className="part-edit-empty">部位がありません</div>
        ) : (
          <div className="part-edit-list" ref={reorder.listRef}>
            {reorder.activeItems.map((name) => {
              const part = partsByName.get(name);
              if (!part) return null;
              return (
                <PartEditRow
                  key={part.name}
                  part={part}
                  dragging={reorder.draggingId === part.name}
                  onPointerDown={(event) => reorder.onPointerDown(event, part.name)}
                  onPointerMove={reorder.onPointerMove}
                  onPointerUp={reorder.onPointerUp}
                  onDelete={() => onDeletePart(part.name)}
                  onSelectColor={(color) => onSetPartColor(part.name, color)}
                />
              );
            })}
          </div>
        )}
      </div>
      {addDialogOpen && (
        <div className="dialog-backdrop" role="presentation">
          <form
            className="confirm-dialog part-add-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="part-add-title"
            onSubmit={handleAddPart}
          >
            <div id="part-add-title" className="confirm-title">
              部位を追加
            </div>
            <input
              autoFocus
              maxLength={12}
              placeholder="例: 腹"
              value={newPartName}
              aria-label="部位名"
              onChange={(event) => setNewPartName(event.target.value)}
            />
            <div className="confirm-actions">
              <button className="small-outline" type="button" onClick={onCloseAddDialog}>
                キャンセル
              </button>
              <button className="small-primary" type="submit" disabled={!newPartName.trim()}>
                追加
              </button>
            </div>
          </form>
        </div>
      )}
      {draggedPart &&
        reorder.dragOverlay &&
        createPortal(
          <div
            className="part-edit-row part-edit-drag-overlay"
            style={{
              borderLeftColor: draggedPart.color,
              left: reorder.dragOverlay.left,
              top: reorder.dragOverlay.top,
              width: reorder.dragOverlay.width,
            }}
            aria-hidden="true"
          >
            <div className="part-edit-head">
              <span className="drag-handle"><DragHandle /></span>
              <span className="part-edit-swatch" style={{ background: draggedPart.color }} />
              <span className="part-edit-name">{draggedPart.name}</span>
              <span className="part-edit-delete"><TrashIcon /></span>
            </div>
            <PartColorPicker part={draggedPart} />
          </div>,
          document.body,
        )}
    </section>
  );
}

type PartEditRowProps = {
  part: PartSetting;
  dragging: boolean;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onPointerMove: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp: React.PointerEventHandler<HTMLDivElement>;
  onDelete: () => void;
  onSelectColor: (color: string) => void;
};

/**
 * 部位 1 件の編集行。並び替え・削除と、8 色から表示色を選ぶボタンを持つ
 */
function PartEditRow({
  part,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDelete,
  onSelectColor,
}: PartEditRowProps) {
  return (
    <div
      className={`part-edit-row ${dragging ? 'dragging' : ''}`}
      data-reorder-row={part.name}
      style={{ borderLeftColor: part.color }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="part-edit-head">
        <span className="drag-handle" data-drag-handle aria-hidden="true">
          <DragHandle />
        </span>
        <span className="part-edit-swatch" style={{ background: part.color }} aria-hidden="true" />
        <span className="part-edit-name">{part.name}</span>
        <button
          className="part-edit-delete"
          type="button"
          aria-label={`${part.name}を削除`}
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>
      <PartColorPicker part={part} onSelectColor={onSelectColor} />
    </div>
  );
}

function PartColorPicker({
  part,
  onSelectColor,
}: {
  part: PartSetting;
  onSelectColor?: (color: string) => void;
}) {
  return (
    <div className="part-color-picker" role="group" aria-label={`${part.name}の色`}>
      {partColorPalette.map((color) => (
        <button
          className={`part-color-swatch ${part.color === color ? 'active' : ''}`}
          key={color}
          type="button"
          aria-label={`色 ${color}`}
          aria-pressed={part.color === color}
          style={{ background: color }}
          onClick={onSelectColor ? () => onSelectColor(color) : undefined}
        />
      ))}
    </div>
  );
}
