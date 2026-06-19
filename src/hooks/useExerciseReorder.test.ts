import { describe, expect, it } from 'vitest';
import { findExerciseInsertionIndex, sameExerciseLayout } from './useExerciseReorder';

const layout = [
  { id: 'free-1', category: 'free' as const },
  { id: 'machine-1', category: 'machine' as const },
];

describe('exercise reorder helpers', () => {
  it('順序とカテゴリが同じレイアウトを同一と判定する', () => {
    expect(sameExerciseLayout(layout, [...layout])).toBe(true);
    expect(sameExerciseLayout(layout, [...layout].reverse())).toBe(false);
  });

  it('挿入先IDがあればその直前を返す', () => {
    expect(findExerciseInsertionIndex(layout, 'machine', 'machine-1')).toBe(1);
  });

  it('挿入先IDがなければカテゴリ末尾を返す', () => {
    expect(findExerciseInsertionIndex(layout, 'free', null)).toBe(1);
    expect(findExerciseInsertionIndex(layout, 'cable', null)).toBe(2);
  });
});
