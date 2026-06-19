import { type ReactNode } from 'react';
import { useFitLog } from './useFitLog';
import { FitLogContext } from './useFitLogContext';

/**
 * アプリ全体へ useFitLog の state・派生値・操作(actions)を配布する Provider。
 * 各画面は props ではなく useFitLogContext から必要な値を取り出す
 */
export function FitLogProvider({ children }: { children: ReactNode }) {
  const value = useFitLog();
  return <FitLogContext.Provider value={value}>{children}</FitLogContext.Provider>;
}
