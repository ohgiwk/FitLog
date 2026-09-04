import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../storageNormalization';
import type { CloudBackup } from '../cloudBackup';
import { hasLocalData, restoredSelectedDate, wouldOverwriteWithEmptyState } from './useBackup';

describe('hasLocalData', () => {
  it('初期状態はローカルデータなしとして扱う', () => {
    expect(hasLocalData(createDefaultState())).toBe(false);
  });

  it('記録または設定が変更されていればローカルデータありとして扱う', () => {
    const state = createDefaultState();
    state.themeMode = 'light';

    expect(hasLocalData(state)).toBe(true);
  });
});

describe('restoredSelectedDate', () => {
  it('復元データに記録があれば最新の記録日を表示する', () => {
    const state = createDefaultState();
    state.workouts = [
      { id: 'old', date: '2026-08-01' },
      { id: 'latest', date: '2026-08-20' },
    ] as typeof state.workouts;

    expect(restoredSelectedDate(state, '2026-08-10')).toBe('2026-08-20');
  });

  it('復元データに記録がなければ今日を表示する', () => {
    expect(restoredSelectedDate(createDefaultState(), '2026-08-10')).toBe('2026-08-10');
  });
});

describe('wouldOverwriteWithEmptyState', () => {
  const currentBackup: CloudBackup = {
    id: 'current',
    source: 'account',
    createdAt: '2026-08-20T00:00:00.000Z',
    deviceId: 'device',
    deviceName: null,
    exerciseCount: createDefaultState().exercises.length,
    workoutCount: 3,
    presetCount: createDefaultState().presets.length,
    goalAchievementCount: 0,
    lastWorkoutDate: '2026-08-20',
  };

  it('既存の記録がローカルで全消失した場合は上書きを止める', () => {
    expect(wouldOverwriteWithEmptyState(createDefaultState(), [currentBackup])).toBe(true);
  });

  it('既存の記録がローカルにも残っていれば上書きできる', () => {
    const state = createDefaultState();
    state.workouts = [{ id: 'workout' }] as typeof state.workouts;

    expect(wouldOverwriteWithEmptyState(state, [currentBackup])).toBe(false);
  });

  it('上書き対象の固定バックアップがなければ新規保存できる', () => {
    expect(
      wouldOverwriteWithEmptyState(createDefaultState(), [
        { ...currentBackup, id: 'legacy', source: 'legacy' },
      ]),
    ).toBe(false);
  });
});
