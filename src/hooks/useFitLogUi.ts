import { useState } from "react";
import { MeasurementType } from "../types";

/**
 * 保存対象ではない、画面操作のための一時的な UI 状態をまとめるフック
 */
export function useFitLogUi() {
  const [historyPartFilter, setHistoryPartFilter] = useState("ALL");
  const [editMode, setEditMode] = useState(false);
  const [expandedParts, setExpandedParts] = useState<Set<string>>(() => new Set());
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [partInput, setPartInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [measurementTypeInput, setMeasurementTypeInput] = useState<MeasurementType>("reps");
  const [draggingExerciseId, setDraggingExerciseId] = useState<string | null>(null);

  /**
   * 部位ごとの展開・折りたたみを切り替える
   */
  function togglePartExpanded(part: string) {
    setExpandedParts((prev) => {
      const next = new Set(prev);
      if (next.has(part)) next.delete(part);
      else next.add(part);
      return next;
    });
  }

  return {
    historyPartFilter,
    setHistoryPartFilter,
    editMode,
    setEditMode,
    expandedParts,
    setExpandedParts,
    addFormOpen,
    setAddFormOpen,
    partInput,
    setPartInput,
    nameInput,
    setNameInput,
    measurementTypeInput,
    setMeasurementTypeInput,
    draggingExerciseId,
    setDraggingExerciseId,
    togglePartExpanded,
  };
}

export type FitLogUi = ReturnType<typeof useFitLogUi>;
