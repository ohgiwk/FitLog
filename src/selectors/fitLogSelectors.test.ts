import { describe, expect, it } from 'vitest';
import { buildUpcomingPlans, buildVisibleHistory, plannedPartsForDate } from './fitLogSelectors';
import { TrainingPlan, Workout } from '../types';

const workout: Workout = {
  id: 'w1',
  exerciseId: 'e1',
  date: '2026-06-20',
  name: 'ベンチプレス',
  part: '胸',
  measurementType: 'reps',
  sets: [],
  note: '',
};

const plans: TrainingPlan[] = [
  {
    id: 'p1',
    part: '胸',
    mode: 'weekly',
    weekdays: [6],
    intervalDays: 1,
    startDate: '',
  },
  {
    id: 'p2',
    part: '脚',
    mode: 'interval',
    weekdays: [],
    intervalDays: 3,
    startDate: '2026-06-20',
  },
];

describe('history selectors', () => {
  it('履歴を日付ごとにまとめて部位で絞り込む', () => {
    const result = buildVisibleHistory([workout], [{ date: '2026-06-19', parts: ['背中'] }], '胸');
    expect(result).toEqual([
      {
        date: '2026-06-20',
        parts: ['胸'],
        workoutNames: ['ベンチプレス'],
      },
    ]);
  });

  it('曜日指定と間隔指定の予定をまとめる', () => {
    expect(plannedPartsForDate('2026-06-20', plans)).toEqual(['胸', '脚']);
    expect(plannedPartsForDate('2026-06-23', plans)).toEqual(['脚']);
  });

  it('選択日から指定日数の予定を作る', () => {
    const result = buildUpcomingPlans('2026-06-20', plans, 2);
    expect(result.map((item) => item.date)).toEqual(['2026-06-20', '2026-06-21']);
    expect(result[0].parts).toEqual(['胸', '脚']);
  });
});
