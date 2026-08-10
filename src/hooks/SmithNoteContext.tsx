import { type ReactNode } from 'react';
import { useSmithNote } from './useSmithNote';
import { SmithNoteContext } from './useSmithNoteContext';

/**
 * アプリ全体へ useSmithNote の state・派生値・操作(actions)を配布する Provider。
 * 各画面は props ではなく useSmithNoteContext から必要な値を取り出す
 */
export function SmithNoteProvider({ children }: { children: ReactNode }) {
  const value = useSmithNote();
  return <SmithNoteContext.Provider value={value}>{children}</SmithNoteContext.Provider>;
}
