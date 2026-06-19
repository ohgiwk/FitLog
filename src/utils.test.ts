import { describe, expect, it } from 'vitest';
import {
  calcRm,
  calendarCells,
  formatStoredWeightInput,
  formatWeightForStorageInput,
  findExerciseGoalAchievementSet,
  isExerciseGoalAchieved,
  formatWeight,
  groupExercises,
  intensityOptions,
  isBlank,
  isRepsMeasurement,
  isUnstartedWorkout,
  localDate,
  measurementLabel,
  measurementUnit,
  newSet,
  nextMonthLabel,
  number,
  parseDate,
  prevMonthLabel,
  uid,
} from './utils';
import { Exercise, Workout, WorkoutSet } from './types';

/**
 * 空セット5つを持つ未開始ワークアウトを作るテスト用ヘルパー
 */
function makeWorkout(sets: WorkoutSet[]): Workout {
  return {
    id: 'w1',
    exerciseId: 'e1',
    date: '2026-01-01',
    name: 'ベンチプレス',
    part: '胸',
    measurementType: 'reps',
    sets,
    note: '',
  };
}

describe('calcRm', () => {
  it('重量か回数が0なら 0.0 を返す', () => {
    expect(calcRm(0, 10)).toBe('0.0');
    expect(calcRm(100, 0)).toBe('0.0');
  });

  it('回数が3より大きいと小数第1位で計算する', () => {
    expect(calcRm(100, 10)).toBe('133.3');
  });

  it('回数が3以下のときは小数第2位で計算する', () => {
    expect(calcRm(100, 3)).toBe('110.00');
    expect(calcRm(100, 1)).toBe('103.33');
  });
});

describe('number', () => {
  it('数値化できる文字列を数値へ変換する', () => {
    expect(number('12')).toBe(12);
    expect(number('3.5')).toBe(3.5);
  });

  it('数値化できない場合は 0 を返す', () => {
    expect(number('abc')).toBe(0);
    expect(number('')).toBe(0);
  });

  it('数値はそのまま返す', () => {
    expect(number(7)).toBe(7);
  });
});

describe('isBlank', () => {
  it('空文字や空白のみは true', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank('   ')).toBe(true);
  });

  it('値があれば false', () => {
    expect(isBlank('0')).toBe(false);
    expect(isBlank(0)).toBe(false);
    expect(isBlank('5')).toBe(false);
  });
});

describe('isExerciseGoalAchieved', () => {
  it('重量と回数の両方が目標以上のセットがあれば true', () => {
    expect(
      isExerciseGoalAchieved([{ id: 's1', weight: 82.5, recordValue: 10 }], {
        weight: 80,
        recordValue: 10,
      }),
    ).toBe(true);
  });

  it('条件が別々のセットに分かれている場合は false', () => {
    expect(
      isExerciseGoalAchieved(
        [
          { id: 's1', weight: 82.5, recordValue: 8 },
          { id: 's2', weight: 75, recordValue: 10 },
        ],
        { weight: 80, recordValue: 10 },
      ),
    ).toBe(false);
  });

  it('未入力の値は 0 の目標でも達成扱いにしない', () => {
    expect(
      isExerciseGoalAchieved([{ id: 's1', weight: '', recordValue: 30 }], {
        weight: 0,
        recordValue: 30,
      }),
    ).toBe(false);
  });
});

describe('findExerciseGoalAchievementSet', () => {
  it('目標を満たす最初のセットを返す', () => {
    const sets = [
      { id: 's1', weight: 80, recordValue: 8 },
      { id: 's2', weight: 82.5, recordValue: 10 },
      { id: 's3', weight: 85, recordValue: 12 },
    ];
    expect(findExerciseGoalAchievementSet(sets, { weight: 80, recordValue: 10 })).toEqual(sets[1]);
  });

  it('目標を満たすセットがなければ undefined', () => {
    expect(
      findExerciseGoalAchievementSet([{ id: 's1', weight: 80, recordValue: 8 }], {
        weight: 80,
        recordValue: 10,
      }),
    ).toBeUndefined();
  });
});

describe('formatWeight', () => {
  it('小数第1位の文字列にする', () => {
    expect(formatWeight('60')).toBe('60.0');
    expect(formatWeight(2.5)).toBe('2.5');
    expect(formatWeight('abc')).toBe('0.0');
  });

  it('lbs 指定では kg から lbs へ換算する', () => {
    expect(formatWeight(100, 'lbs')).toBe('220.5');
  });
});

describe('formatWeightForStorageInput', () => {
  it('kg 入力は入力中の文字列を保つ', () => {
    expect(formatStoredWeightInput('60.', 'kg')).toBe('60.');
    expect(formatWeightForStorageInput('60.', 'kg')).toBe('60.');
  });

  it('lbs 入力を kg 保存値へ換算する', () => {
    expect(formatWeightForStorageInput('220.462', 'lbs')).toBe('100');
  });

  it('空入力は空文字のまま扱う', () => {
    expect(formatWeightForStorageInput('', 'lbs')).toBe('');
  });
});

describe('measurement helpers', () => {
  it('単位を返す', () => {
    expect(measurementUnit('seconds')).toBe('秒');
    expect(measurementUnit('reps')).toBe('回');
  });

  it('ラベルを返す', () => {
    expect(measurementLabel('seconds')).toBe('秒数');
    expect(measurementLabel('reps')).toBe('回数');
  });

  it('reps 判定を返す', () => {
    expect(isRepsMeasurement('reps')).toBe(true);
    expect(isRepsMeasurement('seconds')).toBe(false);
  });
});

describe('isUnstartedWorkout', () => {
  it('空のセット5つなら未開始とみなす', () => {
    const workout = makeWorkout(Array.from({ length: 5 }, () => newSet()));
    expect(isUnstartedWorkout(workout)).toBe(true);
  });

  it('いずれかに記録があれば未開始ではない', () => {
    const sets = Array.from({ length: 5 }, () => newSet());
    sets[0] = { ...sets[0], weight: 60, recordValue: 10 };
    expect(isUnstartedWorkout(makeWorkout(sets))).toBe(false);
  });

  it('セット数が5でなければ未開始ではない', () => {
    const sets = Array.from({ length: 4 }, () => newSet());
    expect(isUnstartedWorkout(makeWorkout(sets))).toBe(false);
  });
});

describe('localDate / parseDate', () => {
  it('Date を YYYY-MM-DD 形式へ変換する', () => {
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('文字列からローカル日付を作る', () => {
    const date = parseDate('2026-01-05');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(5);
  });

  it('localDate と parseDate は往復する', () => {
    expect(localDate(parseDate('2026-06-11'))).toBe('2026-06-11');
  });
});

describe('calendarCells', () => {
  it('常に42セルを返す', () => {
    expect(calendarCells(2026, 0)).toHaveLength(42);
  });

  it('先頭は前月分から始まり、当月の1日を含む', () => {
    const cells = calendarCells(2026, 0);
    expect(cells[0].date).toBe('2025-12-28');
    expect(cells[0].inMonth).toBe(false);
    const firstOfMonth = cells.find((cell) => cell.date === '2026-01-01');
    expect(firstOfMonth?.inMonth).toBe(true);
    expect(firstOfMonth?.day).toBe(1);
  });
});

describe('month labels', () => {
  it('前月ラベルを返す', () => {
    expect(prevMonthLabel(2026, 0)).toBe('12月');
    expect(prevMonthLabel(2026, 5)).toBe('05月');
  });

  it('翌月ラベルを返す', () => {
    expect(nextMonthLabel(2026, 0)).toBe('02月');
    expect(nextMonthLabel(2026, 11)).toBe('01月');
  });
});

describe('groupExercises', () => {
  it('部位ごとにまとめる', () => {
    const exercises: Exercise[] = [
      { id: '1', part: '胸', name: 'ベンチプレス', measurementType: 'reps', category: 'free' },
      {
        id: '2',
        part: '背中',
        name: 'ラットプルダウン',
        measurementType: 'reps',
        category: 'machine',
      },
      {
        id: '3',
        part: '胸',
        name: 'ダンベルフライ',
        measurementType: 'reps',
        category: 'dumbbell',
      },
    ];
    const grouped = groupExercises(exercises);
    expect([...grouped.keys()]).toEqual(['胸', '背中']);
    expect(grouped.get('胸')).toHaveLength(2);
    expect(grouped.get('背中')).toHaveLength(1);
  });
});

describe('newSet', () => {
  it('空のセットを作る', () => {
    const set = newSet();
    expect(set.weight).toBe('');
    expect(set.recordValue).toBe('');
    expect(typeof set.id).toBe('string');
    expect(set.id.length).toBeGreaterThan(0);
  });
});

describe('uid', () => {
  it('呼び出すたびに異なる文字列を返す', () => {
    expect(uid()).not.toBe(uid());
  });
});

describe('intensityOptions', () => {
  it('5段階の強度を持つ', () => {
    expect(intensityOptions).toHaveLength(5);
    expect(intensityOptions.map((option) => option.value)).toEqual([1, 2, 3, 4, 5]);
  });
});
