import { createContext, useContext } from 'react';
import { useFitLog } from './useFitLog';

export type FitLogContextValue = ReturnType<typeof useFitLog>;

export const FitLogContext = createContext<FitLogContextValue | null>(null);

export function useFitLogContext(): FitLogContextValue {
  const value = useContext(FitLogContext);
  if (!value) {
    throw new Error('useFitLogContext は FitLogProvider の内側で使用してください');
  }
  return value;
}
