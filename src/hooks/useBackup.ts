import { parseImportedState } from "../storage";
import { State } from "../types";
import { localDate } from "../utils";

type BackupDeps = {
  state: State;
  setState: (state: State) => void;
  showToast: (message: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  setCurrentWorkoutId: (workoutId: string | null) => void;
  setCurrentPresetId: (presetId: string | null) => void;
  setCurrentEditingPresetId: (presetId: string | null) => void;
};

/**
 * データのエクスポート(バックアップ)とインポート(復元)を担うフック
 */
export function useBackup({
  state,
  setState,
  showToast,
  selectedDate,
  setSelectedDate,
  setCurrentWorkoutId,
  setCurrentPresetId,
  setCurrentEditingPresetId,
}: BackupDeps) {
  /**
   * 現在の state を JSON ファイルとしてダウンロードする
   */
  function exportState() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fitlog-backup-${selectedDate}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("データをエクスポートしました");
  }

  /**
   * JSON ファイルを読み込んで正規化し、state を置き換える
   */
  async function importState(file: File) {
    try {
      const normalized = parseImportedState(await file.text());
      if (!normalized) return showToast("インポートできるデータが見つかりません");
      setState(normalized);
      setCurrentWorkoutId(null);
      setCurrentPresetId(normalized.presets[0]?.id || null);
      setCurrentEditingPresetId(null);
      setSelectedDate(localDate(new Date()));
      showToast("データをインポートしました");
    } catch {
      showToast("JSONの読み込みに失敗しました");
    }
  }

  return { exportState, importState };
}
