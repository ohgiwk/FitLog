import { useState } from 'react';

/**
 * 保存対象ではない、画面操作のための一時的な UI 状態をまとめるフック
 */
export function useFitLogUi() {
  const [historyPartFilter, setHistoryPartFilter] = useState('ALL');
  const [editMode, setEditMode] = useState(false);
  const [activePart, setActivePart] = useState<string | null>(null);

  /**
   * 種目選択画面で表示する部位タブを切り替える
   */
  function selectPart(part: string) {
    setActivePart(part);
  }

  return {
    historyPartFilter,
    setHistoryPartFilter,
    editMode,
    setEditMode,
    activePart,
    setActivePart,
    selectPart,
  };
}

export type FitLogUi = ReturnType<typeof useFitLogUi>;
