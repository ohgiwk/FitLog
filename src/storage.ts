import { State } from './types';
import { createDefaultState, normalizeState, parseImportedState } from './storageNormalization';

export const storeKey = 'fit-log-v2';
export const corruptStoreKey = 'fit-log-v2-corrupt';

export type LoadResult = {
  state: State;
  recoveredFromCorruption: boolean;
};

function preserveCorruptState(raw: string) {
  try {
    localStorage.setItem(corruptStoreKey, raw);
  } catch {
    /**
     * 元データは storeKey 側に残るため、退避失敗時も読み込み処理を継続する
     */
  }
}

export function loadState(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(storeKey);
  } catch {
    return { state: createDefaultState(), recoveredFromCorruption: false };
  }
  if (!raw || raw === 'null') {
    return { state: createDefaultState(), recoveredFromCorruption: false };
  }
  try {
    const normalized = normalizeState(JSON.parse(raw) as Partial<State> | null);
    if (normalized) return { state: normalized, recoveredFromCorruption: false };
  } catch {
    /**
     * 壊れた入力は削除せず、下で退避して初期状態へ復帰する
     */
  }
  preserveCorruptState(raw);
  return { state: createDefaultState(), recoveredFromCorruption: true };
}

export { normalizeState, parseImportedState };
