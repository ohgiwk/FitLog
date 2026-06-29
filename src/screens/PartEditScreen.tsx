import { FormEvent, useEffect, useState } from 'react';
import { PartSetting } from '../types';
import { partColorPalette } from '../data/partColors';
import { ChevronDown, ChevronUp, ChevronLeft, TrashIcon } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';

/**
 * 部位の編集画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function usePartEditScreenModel() {
  const { orderedParts, actions } = useFitLogContext();
  return {
    orderedParts,
    onBack: () => actions.setScreen('settings'),
    onAddPart: actions.addPart,
    onDeletePart: actions.deletePart,
    onMovePart: actions.movePart,
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
  const { orderedParts, onBack, onAddPart, onDeletePart, onMovePart, onSetPartColor } =
    usePartEditScreenModel();
  const [newPartName, setNewPartName] = useState('');

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
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>
            <ChevronLeft />
          </button>
          <div className="bar-title">部位の編集</div>
          <span />
        </div>
      </header>
      <div className="content">
        {!orderedParts.length ? (
          <div className="part-edit-empty">部位がありません</div>
        ) : (
          <div className="part-edit-list">
            {orderedParts.map((part, index) => (
              <PartEditRow
                key={part.name}
                part={part}
                isFirst={index === 0}
                isLast={index === orderedParts.length - 1}
                onMoveUp={() => onMovePart(part.name, -1)}
                onMoveDown={() => onMovePart(part.name, 1)}
                onDelete={() => onDeletePart(part.name)}
                onSelectColor={(color) => onSetPartColor(part.name, color)}
              />
            ))}
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
    </section>
  );
}

type PartEditRowProps = {
  part: PartSetting;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onSelectColor: (color: string) => void;
};

/**
 * 部位 1 件の編集行。並び替え・削除と、8 色から表示色を選ぶボタンを持つ
 */
function PartEditRow({
  part,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSelectColor,
}: PartEditRowProps) {
  return (
    <div className="part-edit-row" style={{ borderLeftColor: part.color }}>
      <div className="part-edit-head">
        <span className="part-edit-swatch" style={{ background: part.color }} aria-hidden="true" />
        <span className="part-edit-name">{part.name}</span>
        <div className="part-edit-order">
          <button
            type="button"
            aria-label="上へ"
            disabled={isFirst}
            onClick={onMoveUp}
          >
            <ChevronUp />
          </button>
          <button
            type="button"
            aria-label="下へ"
            disabled={isLast}
            onClick={onMoveDown}
          >
            <ChevronDown />
          </button>
        </div>
        <button
          className="part-edit-delete"
          type="button"
          aria-label={`${part.name}を削除`}
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>
      <div className="part-color-picker" role="group" aria-label={`${part.name}の色`}>
        {partColorPalette.map((color) => (
          <button
            className={`part-color-swatch ${part.color === color ? 'active' : ''}`}
            key={color}
            type="button"
            aria-label={`色 ${color}`}
            aria-pressed={part.color === color}
            style={{ background: color }}
            onClick={() => onSelectColor(color)}
          />
        ))}
      </div>
    </div>
  );
}
