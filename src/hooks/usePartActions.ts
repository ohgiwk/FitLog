import { PartSetting, State } from '../types';
import { paletteColorAt } from '../data/partColors';
import { buildOrderedParts } from '../selectors/fitLogSelectors';

type PartActionsDeps = {
  state: State;
  saveState: (updater: (draft: State) => State) => void;
  showToast: (message: string) => void;
};

/**
 * 直近の state から表示順つきの部位一覧(明示設定＋データ由来)を作る
 */
function orderedPartsOf(state: State): PartSetting[] {
  return buildOrderedParts(
    state.parts,
    state.exercises,
    state.workouts,
    state.trainingDays,
    state.trainingPlans,
  );
}

/**
 * 部位の追加・削除・並び替え・色変更を担うフック。
 * いずれの操作でも、表示順つきの完全な一覧を `state.parts` へ書き戻す
 */
export function usePartActions({ state, saveState, showToast }: PartActionsDeps) {
  /**
   * 新しい部位を末尾に追加する。空・重複は受け付けない
   */
  function addPart(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return showToast('部位名を入力してください');
    if (orderedPartsOf(state).some((part) => part.name === trimmed)) {
      return showToast('同じ名前の部位があります');
    }
    saveState((prev) => {
      const parts = orderedPartsOf(prev);
      return { ...prev, parts: [...parts, { name: trimmed, color: paletteColorAt(parts.length) }] };
    });
    showToast('部位を追加しました');
  }

  /**
   * 部位を削除する。種目が残っている部位は削除させない。
   * 削除時はその部位の分割計画も合わせて取り除く
   */
  function deletePart(name: string) {
    if (state.exercises.some((exercise) => exercise.part === name)) {
      return showToast('種目がある部位は削除できません');
    }
    saveState((prev) => ({
      ...prev,
      parts: orderedPartsOf(prev).filter((part) => part.name !== name),
      trainingPlans: prev.trainingPlans.filter((plan) => plan.part !== name),
    }));
    showToast('部位を削除しました');
  }

  /**
   * 部位の表示順を 1 つ前後に動かす
   */
  function movePart(name: string, direction: -1 | 1) {
    saveState((prev) => {
      const parts = orderedPartsOf(prev);
      const index = parts.findIndex((part) => part.name === name);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= parts.length) return prev;
      const next = [...parts];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, parts: next };
    });
  }

  /**
   * 部位の表示色を変更する
   */
  function setPartColor(name: string, color: string) {
    saveState((prev) => ({
      ...prev,
      parts: orderedPartsOf(prev).map((part) => (part.name === name ? { ...part, color } : part)),
    }));
  }

  return { addPart, deletePart, movePart, setPartColor };
}
