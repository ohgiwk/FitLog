import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FitLogContext, FitLogContextValue } from '../hooks/useFitLogContext';
import { State, Workout } from '../types';
import { DetailScreen } from './DetailScreen';

const workout: Workout = {
  id: 'w1',
  exerciseId: 'e1',
  date: '2026-07-06',
  name: 'ベンチプレス',
  part: '胸',
  measurementType: 'reps',
  sets: [{ id: 's1', weight: 50, recordValue: 10 }],
  note: '',
};

const state: State = {
  schemaVersion: 2,
  updatedAt: '2026-07-06T00:00:00.000Z',
  exercises: [
    {
      id: 'e1',
      part: '胸',
      name: 'ベンチプレス',
      measurementType: 'reps',
      category: 'free',
      availableGrips: ['normal'],
      availableGripStyles: ['thumbAround'],
    },
  ],
  goalAchievements: [],
  workouts: [workout],
  workoutStartTimes: {},
  workoutEndTimes: {},
  presets: [],
  trainingDays: [],
  trainingPlans: [],
  parts: [{ name: '胸', color: '#ef4444' }],
  hiddenParts: [],
  weightUnit: 'kg',
  themeMode: 'dark',
  notificationSettings: { enabled: false },
  catalogVersion: 1,
};

function renderDetailScreen({
  updateSet = vi.fn(),
  weightUnit = 'kg',
}: {
  updateSet?: ReturnType<typeof vi.fn>;
  weightUnit?: State['weightUnit'];
}) {
  const value = {
    currentWorkout: workout,
    state: { ...state, weightUnit },
    actions: {
      setScreen: vi.fn(),
      updateSet,
      updateWorkoutNote: vi.fn(),
      updateSetIntensity: vi.fn(),
      updateWorkoutGrip: vi.fn(),
      updateWorkoutGripStyle: vi.fn(),
      deleteSet: vi.fn(),
      addSet: vi.fn(),
      updateExerciseGoal: vi.fn(),
    },
  } as unknown as FitLogContextValue;

  return render(
    <FitLogContext.Provider value={value}>
      <DetailScreen />
    </FitLogContext.Provider>,
  );
}

function detailNumberInputs(container: HTMLElement) {
  return [...container.querySelectorAll('.detail-table input[type="number"]')] as HTMLInputElement[];
}

describe('DetailScreen set inputs', () => {
  it('重量入力中の文字列を保ち、保存値は数値へ変換する', () => {
    const updateSet = vi.fn();
    const { container } = renderDetailScreen({ updateSet });
    const [weightInput] = detailNumberInputs(container);

    fireEvent.change(weightInput, { target: { value: '60.5' } });

    expect(weightInput.value).toBe('60.5');
    expect(updateSet).toHaveBeenLastCalledWith('s1', 'weight', 60.5);

    fireEvent.blur(weightInput);
    expect(weightInput.value).toBe('50');
  });

  it('空の回数入力は null として保存する', () => {
    const updateSet = vi.fn();
    const { container } = renderDetailScreen({ updateSet });
    const [, recordInput] = detailNumberInputs(container);

    fireEvent.change(recordInput, { target: { value: '' } });

    expect(recordInput.value).toBe('');
    expect(updateSet).toHaveBeenLastCalledWith('s1', 'recordValue', null);
  });

  it('lbs 入力は kg の保存値へ変換する', () => {
    const updateSet = vi.fn();
    const { container } = renderDetailScreen({ updateSet, weightUnit: 'lbs' });
    const [weightInput] = detailNumberInputs(container);

    fireEvent.change(weightInput, { target: { value: '220.462' } });

    expect(weightInput.value).toBe('220.462');
    expect(updateSet).toHaveBeenLastCalledWith('s1', 'weight', 100);
  });
});
