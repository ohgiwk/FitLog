import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SmithNoteContext, SmithNoteContextValue } from '../hooks/useSmithNoteContext';
import type { Exercise } from '../types';
import { ExerciseManageScreen } from './SelectScreen';

const exercise: Exercise = {
  id: 'e1',
  part: '胸',
  name: 'ベンチプレス',
  measurementType: 'reps',
  category: 'free',
};

describe('ExerciseManageScreen', () => {
  it('確認ダイアログで了承した後に種目を削除する', () => {
    const deleteExercise = vi.fn();
    const value = {
      groupedExercises: new Map([['胸', [exercise]]]),
      partRecentLabels: new Map(),
      partColors: new Map([['胸', '#ef4444']]),
      activePart: '胸',
      actions: {
        setScreen: vi.fn(),
        addExerciseToToday: vi.fn(),
        reorderPartExercises: vi.fn(),
        deleteExercise,
        openExerciseEditor: vi.fn(),
        selectPart: vi.fn(),
      },
    } as unknown as SmithNoteContextValue;

    render(
      <SmithNoteContext.Provider value={value}>
        <ExerciseManageScreen />
      </SmithNoteContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '種目を削除' }));

    expect(deleteExercise).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: '種目を削除しますか？' });
    expect(within(dialog).getByText(/ベンチプレス/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(deleteExercise).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '種目を削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除' }));

    expect(deleteExercise).toHaveBeenCalledWith('e1');
    expect(deleteExercise).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
