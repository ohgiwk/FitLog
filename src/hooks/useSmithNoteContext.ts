import { createContext, useContext } from 'react';
import { useSmithNote } from './useSmithNote';

export type SmithNoteContextValue = ReturnType<typeof useSmithNote>;

export const SmithNoteContext = createContext<SmithNoteContextValue | null>(null);

export function useSmithNoteContext(): SmithNoteContextValue {
  const value = useContext(SmithNoteContext);
  if (!value) {
    throw new Error('useSmithNoteContext は SmithNoteProvider の内側で使用してください');
  }
  return value;
}
