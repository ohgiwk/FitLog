import { describe, expect, it } from 'vitest';
import { moveItemBefore } from './useFlatReorder';

describe('flat reorder helpers', () => {
  it('指定した項目を別の項目の直前へ移動する', () => {
    expect(moveItemBefore(['a', 'b', 'c'], 'c', 'b')).toEqual(['a', 'c', 'b']);
  });

  it('挿入先がない場合は末尾へ移動する', () => {
    expect(moveItemBefore(['a', 'b', 'c'], 'a', null)).toEqual(['b', 'c', 'a']);
  });
});
