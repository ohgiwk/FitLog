import { beforeEach, describe, expect, it } from 'vitest';
import {
  corruptStoreKey,
  loadState,
  normalizeState,
  parseImportedState,
  storeKey,
} from './storage';
import { starterCatalogVersion, starterExercises } from './data/starterExercises';
import { State } from './types';

/**
 * テスト用に最小限の正しい保存データを作る
 */
function makeValidSaved() {
  return {
    exercises: [{ id: 'e1', part: '胸', name: 'ベンチプレス', measurementType: 'reps' }],
    workouts: [],
    presets: [],
    trainingDays: [],
    trainingPlans: [],
    catalogVersion: starterCatalogVersion,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('loadState', () => {
  it('保存データが無ければ初期状態を返す(復旧扱いにしない)', () => {
    const result = loadState();
    expect(result.recoveredFromCorruption).toBe(false);
    expect(result.state.exercises.length).toBeGreaterThan(0);
    expect(result.state.workouts).toEqual([]);
  });

  it("'null' が保存されていても初期状態を返す", () => {
    localStorage.setItem(storeKey, 'null');
    const result = loadState();
    expect(result.recoveredFromCorruption).toBe(false);
    expect(result.state.workouts).toEqual([]);
  });

  it('正しい保存データはそのまま読み込む', () => {
    localStorage.setItem(storeKey, JSON.stringify(makeValidSaved()));
    const result = loadState();
    expect(result.recoveredFromCorruption).toBe(false);
    expect(result.state.exercises).toHaveLength(1);
    expect(result.state.exercises[0].name).toBe('ベンチプレス');
  });

  it('壊れた JSON はデータを消さず退避し、初期状態へ復帰する', () => {
    localStorage.setItem(storeKey, '{broken');
    const result = loadState();
    expect(result.recoveredFromCorruption).toBe(true);
    expect(result.state.exercises.length).toBeGreaterThan(0);
    expect(localStorage.getItem(corruptStoreKey)).toBe('{broken');
    expect(localStorage.getItem(storeKey)).toBe('{broken');
  });

  it('必須フィールドを欠く JSON も退避して復帰する', () => {
    localStorage.setItem(storeKey, JSON.stringify({ foo: 1 }));
    const result = loadState();
    expect(result.recoveredFromCorruption).toBe(true);
    expect(localStorage.getItem(corruptStoreKey)).toBe(JSON.stringify({ foo: 1 }));
  });
});

describe('normalizeState', () => {
  it('null や空オブジェクトは null を返す', () => {
    expect(normalizeState(null)).toBeNull();
    expect(normalizeState({})).toBeNull();
  });

  it('reps を recordValue へ移行する', () => {
    const saved = {
      exercises: [{ id: 'e1', part: '胸', name: 'ベンチ', measurementType: 'reps' }],
      workouts: [
        {
          id: 'w1',
          exerciseId: 'e1',
          date: '2026-01-01',
          name: 'ベンチ',
          part: '胸',
          measurementType: 'reps',
          sets: [{ id: 's1', weight: 50, reps: 10, intensity: 9 }],
        },
      ],
      catalogVersion: starterCatalogVersion,
    };
    const result = normalizeState(saved as unknown as Partial<State>);
    expect(result?.workouts[0].sets[0].recordValue).toBe(10);
  });

  it('不正な強度は undefined にする', () => {
    const saved = {
      exercises: [{ id: 'e1', part: '胸', name: 'ベンチ', measurementType: 'reps' }],
      workouts: [
        {
          id: 'w1',
          exerciseId: 'e1',
          date: '2026-01-01',
          name: 'ベンチ',
          part: '胸',
          measurementType: 'reps',
          sets: [{ id: 's1', weight: 50, recordValue: 10, intensity: 9 }],
        },
      ],
      catalogVersion: starterCatalogVersion,
    };
    const result = normalizeState(saved as unknown as Partial<State>);
    expect(result?.workouts[0].sets[0].intensity).toBeUndefined();
  });

  it('trainingDays の part を parts へ移行する', () => {
    const saved = {
      exercises: [{ id: 'e1', part: '胸', name: 'ベンチ', measurementType: 'reps' }],
      workouts: [],
      trainingDays: [{ date: '2026-01-01', part: '胸' }],
      catalogVersion: starterCatalogVersion,
    };
    const result = normalizeState(saved as unknown as Partial<State>);
    expect(result?.trainingDays[0]).toEqual({ date: '2026-01-01', parts: ['胸'] });
  });

  it('catalogVersion は常に最新へ更新される', () => {
    const result = normalizeState(makeValidSaved() as unknown as Partial<State>);
    expect(result?.catalogVersion).toBe(starterCatalogVersion);
  });

  it('古い catalogVersion では初期種目を補完する', () => {
    const saved = {
      exercises: [{ id: 'custom', part: 'カスタム', name: '独自種目', measurementType: 'reps' }],
      workouts: [],
      catalogVersion: 1,
    };
    const result = normalizeState(saved as unknown as Partial<State>);
    expect(result?.exercises).toHaveLength(1 + starterExercises.length);
  });
});

describe('parseImportedState', () => {
  it('正しい JSON 文字列を State へ変換する', () => {
    const result = parseImportedState(JSON.stringify(makeValidSaved()));
    expect(result).not.toBeNull();
    expect(result?.exercises).toHaveLength(1);
  });

  it('必須フィールドが無い JSON は null を返す', () => {
    expect(parseImportedState('{}')).toBeNull();
  });
});
