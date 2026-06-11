import { createContext, useContext, type ReactNode } from 'react';
import { useFitLog } from './useFitLog';

/**
 * useFitLog の戻り値型。各画面の view-model フックが参照する
 */
export type FitLogContextValue = ReturnType<typeof useFitLog>;

const FitLogContext = createContext<FitLogContextValue | null>(null);

/**
 * アプリ全体へ useFitLog の state・派生値・操作(actions)を配布する Provider。
 * 各画面は props ではなく useFitLogContext から必要な値を取り出す
 */
export function FitLogProvider({ children }: { children: ReactNode }) {
  const value = useFitLog();
  return <FitLogContext.Provider value={value}>{children}</FitLogContext.Provider>;
}

/**
 * FitLogProvider が配布する値を取得する。Provider の外で呼ぶとエラーになる
 */
export function useFitLogContext(): FitLogContextValue {
  const value = useContext(FitLogContext);
  if (!value) {
    throw new Error('useFitLogContext は FitLogProvider の内側で使用してください');
  }
  return value;
}
