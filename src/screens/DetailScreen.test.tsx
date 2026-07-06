import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { restTimerStartEvent } from '../components/RestTimer';
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
  restTimerSettings: { autoStartOnIntensity: true },
  catalogVersion: 1,
};

function renderDetailScreen({
  updateSet = vi.fn(),
  updateSetAchievement = vi.fn(),
  resetSetAchievement = vi.fn(),
  weightUnit = 'kg',
  currentWorkout = workout,
  restTimerAutoStart = true,
}: {
  updateSet?: ReturnType<typeof vi.fn>;
  updateSetAchievement?: ReturnType<typeof vi.fn>;
  resetSetAchievement?: ReturnType<typeof vi.fn>;
  weightUnit?: State['weightUnit'];
  currentWorkout?: Workout;
  restTimerAutoStart?: boolean;
}) {
  const value = {
    currentWorkout,
    state: {
      ...state,
      weightUnit,
      workouts: [currentWorkout],
      restTimerSettings: { autoStartOnIntensity: restTimerAutoStart },
    },
    actions: {
      setScreen: vi.fn(),
      updateSet,
      updateSetAchievement,
      resetSetAchievement,
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

  it('未判定のセットでは達成/未達ボタンを表示し、未達を記録できる', () => {
    const updateSetAchievement = vi.fn();
    const { container } = renderDetailScreen({ updateSetAchievement });

    const missedButton = within(container).getAllByRole('button', { name: '未達' }).find(
      (button) => !button.hasAttribute('disabled'),
    );
    expect(missedButton).toBeTruthy();
    fireEvent.click(missedButton!);

    expect(updateSetAchievement).toHaveBeenCalledWith('s1', 'missed');
  });

  it('未達セットでは目標値と強度ピッカーを表示する', () => {
    const missedWorkout: Workout = {
      ...workout,
      sets: [{ id: 's1', weight: 50, recordValue: 8, targetRecordValue: 10, achievement: 'missed' }],
    };
    const { container } = renderDetailScreen({ currentWorkout: missedWorkout });

    expect(within(container).getByText('目標 10回')).toBeTruthy();
    expect(within(container).queryByRole('button', { name: 'きつい' })).not.toBeNull();
  });

  it('戻るアイコンで達成判定を取り消せる', () => {
    const resetSetAchievement = vi.fn();
    const achievedWorkout: Workout = {
      ...workout,
      sets: [{ id: 's1', weight: 50, recordValue: 10, achievement: 'achieved' }],
    };
    const { container } = renderDetailScreen({ currentWorkout: achievedWorkout, resetSetAchievement });

    fireEvent.click(within(container).getByRole('button', { name: '1セット目の達成判定を戻す' }));

    expect(resetSetAchievement).toHaveBeenCalledWith('s1');
  });

  it('強度アイコンを押すとレストタイマー開始イベントを送る', () => {
    const achievedWorkout: Workout = {
      ...workout,
      sets: [{ id: 's1', weight: 50, recordValue: 10, achievement: 'achieved' }],
    };
    const onStartRestTimer = vi.fn();
    window.addEventListener(restTimerStartEvent, onStartRestTimer);
    const { container } = renderDetailScreen({ currentWorkout: achievedWorkout });

    fireEvent.click(within(container).getByRole('button', { name: 'きつい' }));
    window.removeEventListener(restTimerStartEvent, onStartRestTimer);

    expect(onStartRestTimer).toHaveBeenCalledTimes(1);
  });

  it('選択済みの強度アイコンを解除してもレストタイマー開始イベントを送らない', () => {
    const achievedWorkout: Workout = {
      ...workout,
      sets: [{ id: 's1', weight: 50, recordValue: 10, achievement: 'achieved', intensity: 3 }],
    };
    const onStartRestTimer = vi.fn();
    window.addEventListener(restTimerStartEvent, onStartRestTimer);
    const { container } = renderDetailScreen({ currentWorkout: achievedWorkout });

    fireEvent.click(within(container).getByRole('button', { name: 'きつい' }));
    window.removeEventListener(restTimerStartEvent, onStartRestTimer);

    expect(onStartRestTimer).not.toHaveBeenCalled();
  });

  it('設定がオフなら強度アイコンでレストタイマーを開始しない', () => {
    const achievedWorkout: Workout = {
      ...workout,
      sets: [{ id: 's1', weight: 50, recordValue: 10, achievement: 'achieved' }],
    };
    const onStartRestTimer = vi.fn();
    window.addEventListener(restTimerStartEvent, onStartRestTimer);
    const { container } = renderDetailScreen({
      currentWorkout: achievedWorkout,
      restTimerAutoStart: false,
    });

    fireEvent.click(within(container).getByRole('button', { name: 'きつい' }));
    window.removeEventListener(restTimerStartEvent, onStartRestTimer);

    expect(onStartRestTimer).not.toHaveBeenCalled();
  });
});
