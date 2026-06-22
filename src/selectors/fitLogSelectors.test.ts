import { describe, expect, it } from 'vitest';
import {
  buildExerciseCounts,
  buildPartCounts,
  buildVisibleHistory,
  plannedPartsForDate,
  scheduledPresetsForDate,
} from './fitLogSelectors';
import { Preset, TrainingPlan, Workout } from '../types';

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

const presets: Preset[] = [
  {
    id: 'preset-1',
    name: '上半身',
    exerciseIds: [],
    schedule: {
      mode: 'weekly',
      weekdays: [6],
      intervalDays: 1,
      startDate: '',
    },
  },
  {
    id: 'preset-2',
    name: '下半身',
    exerciseIds: [],
    schedule: {
      mode: 'interval',
      weekdays: [],
      intervalDays: 3,
      startDate: '2026-06-20',
    },
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

  it('曜日指定と間隔指定に一致するプリセットを一覧順で返す', () => {
    expect(scheduledPresetsForDate('2026-06-20', presets).map((preset) => preset.id)).toEqual([
      'preset-1',
      'preset-2',
    ]);
    expect(scheduledPresetsForDate('2026-06-23', presets).map((preset) => preset.id)).toEqual([
      'preset-2',
    ]);
  });
});

describe('analysis selectors', () => {
  it('記録済みワークアウトだけを種目別に集計し、回数の多い順に並べる', () => {
    const result = buildExerciseCounts([
      { ...workout, sets: [{ id: 's1', weight: 60, recordValue: 10 }] },
      {
        ...workout,
        id: 'w2',
        date: '2026-06-19',
        sets: [{ id: 's2', weight: '', recordValue: 8 }],
      },
      {
        ...workout,
        id: 'w3',
        exerciseId: 'e2',
        name: 'スクワット',
        part: '脚',
        sets: [{ id: 's3', weight: 80, recordValue: 8 }],
      },
      {
        ...workout,
        id: 'w4',
        exerciseId: 'e3',
        name: '懸垂',
        part: '背中',
        sets: [{ id: 's4', weight: '', recordValue: '' }],
      },
    ]);

    expect(result).toEqual([
      { exerciseId: 'e1', part: '胸', name: 'ベンチプレス', count: 2 },
      { exerciseId: 'e2', part: '脚', name: 'スクワット', count: 1 },
    ]);
  });

  it('記録済みワークアウトだけを部位別に集計する', () => {
    const result = buildPartCounts([
      { ...workout, sets: [{ id: 's1', weight: 60, recordValue: 10 }] },
      {
        ...workout,
        id: 'w2',
        exerciseId: 'e2',
        name: 'ダンベルフライ',
        sets: [{ id: 's2', weight: 20, recordValue: 10 }],
      },
      {
        ...workout,
        id: 'w3',
        exerciseId: 'e3',
        name: 'スクワット',
        part: '脚',
        sets: [{ id: 's3', weight: 80, recordValue: 8 }],
      },
      {
        ...workout,
        id: 'w4',
        exerciseId: 'e4',
        name: '懸垂',
        part: '背中',
        sets: [{ id: 's4', weight: '', recordValue: '' }],
      },
    ]);

    expect(result).toEqual([
      { part: '胸', count: 2 },
      { part: '脚', count: 1 },
    ]);
  });
});
