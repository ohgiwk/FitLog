import { act, renderHook } from '@testing-library/react';
import type { PointerEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useHomeCalendar } from './useHomeCalendar';

function pointerEvent(
  currentTarget: HTMLElement,
  clientX: number,
  clientY: number,
): PointerEvent<HTMLElement> {
  return {
    clientX,
    clientY,
    currentTarget,
    pointerId: 1,
  } as PointerEvent<HTMLElement>;
}

describe('useHomeCalendar pointer handling', () => {
  it('タップ開始時はキャプチャせず、横スワイプ開始後にキャプチャする', () => {
    const target = document.createElement('div');
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 320,
      top: 0,
      width: 320,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const setPointerCapture = vi.fn();
    const hasPointerCapture = vi.fn(() => false);
    target.setPointerCapture = setPointerCapture;
    target.hasPointerCapture = hasPointerCapture;
    const { result } = renderHook(() => useHomeCalendar('2026-07-27', vi.fn()));

    act(() => {
      result.current.startSwipe(pointerEvent(target, 100, 50));
    });
    expect(setPointerCapture).not.toHaveBeenCalled();

    act(() => {
      result.current.moveSwipe(pointerEvent(target, 115, 51));
    });
    expect(setPointerCapture).toHaveBeenCalledWith(1);
  });
});
