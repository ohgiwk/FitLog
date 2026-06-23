import { PointerEvent, useMemo, useRef, useState } from 'react';
import { compactCalendarCells, localDate, parseDate } from '../utils';

export type HomeCalendarMode = 'week' | 'month';

const pageOffsets = [-1, 0, 1];

function weekCells(anchorDate: Date) {
  const start = new Date(anchorDate);
  start.setDate(anchorDate.getDate() - anchorDate.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: localDate(date), day: date.getDate(), inMonth: true };
  });
}

function moveCalendarAnchor(anchorDate: Date, mode: HomeCalendarMode, delta: number) {
  const next = new Date(anchorDate);
  if (mode === 'week') {
    next.setDate(next.getDate() + delta * 7);
    return next;
  }
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + delta);
  next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  return next;
}

/**
 * ホームの週/月カレンダーに必要な表示状態とスワイプ遷移を管理する
 */
export function useHomeCalendar(selectedDate: string, onSelectDate: (date: string) => void) {
  const [mode, setMode] = useState<HomeCalendarMode>('week');
  const [anchorDate, setAnchorDate] = useState(() => parseDate(selectedDate));
  const [dragOffset, setDragOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const swipeStart = useRef<{ x: number; y: number; width: number } | null>(null);
  const pendingMove = useRef<number | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const pages = useMemo(
    () =>
      pageOffsets.map((offset) => {
        const pageAnchor = moveCalendarAnchor(anchorDate, mode, offset);
        return {
          key: `${mode}-${localDate(pageAnchor)}-${offset}`,
          days:
            mode === 'week'
              ? weekCells(pageAnchor)
              : compactCalendarCells(pageAnchor.getFullYear(), pageAnchor.getMonth()),
        };
      }),
    [anchorDate, mode],
  );

  function clearTransitionTimer() {
    if (transitionTimer.current === null) return;
    globalThis.clearTimeout(transitionTimer.current);
    transitionTimer.current = null;
  }

  function finishTransition() {
    clearTransitionTimer();
    const nextMove = pendingMove.current;
    pendingMove.current = null;
    setAnimating(false);
    setDragOffset(0);
    if (nextMove) setAnchorDate((current) => moveCalendarAnchor(current, mode, nextMove));
  }

  function resetDrag() {
    pendingMove.current = null;
    clearTransitionTimer();
    setDragOffset(0);
    setAnimating(false);
  }

  function ignoreNextClick() {
    suppressClick.current = true;
    globalThis.setTimeout(() => {
      suppressClick.current = false;
    }, 240);
  }

  function selectDate(date: string) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSelectDate(date);
    setAnchorDate(parseDate(date));
    setMode('week');
  }

  function toggleMode() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    resetDrag();
    setMode((current) => (current === 'week' ? 'month' : 'week'));
  }

  function jumpToToday() {
    const date = localDate(new Date());
    onSelectDate(date);
    resetDrag();
    setAnchorDate(parseDate(date));
  }

  function startSwipe(event: PointerEvent<HTMLElement>) {
    if (animating) return;
    swipeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width: event.currentTarget.getBoundingClientRect().width,
    };
    pendingMove.current = null;
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startHandleSwipe(event: PointerEvent<HTMLButtonElement>) {
    swipeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width: event.currentTarget.getBoundingClientRect().width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveSwipe(event: PointerEvent<HTMLElement>) {
    const start = swipeStart.current;
    if (!start) return;
    const diffX = event.clientX - start.x;
    const diffY = event.clientY - start.y;
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 12) return;
    setDragOffset(Math.max(Math.min(diffX, start.width), -start.width));
  }

  function finishSwipe(event: PointerEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const diffX = event.clientX - start.x;
    const diffY = event.clientY - start.y;
    if (Math.abs(diffY) >= 44 && Math.abs(diffY) > Math.abs(diffX)) {
      ignoreNextClick();
      setMode(diffY > 0 ? 'month' : 'week');
      return;
    }
    if (Math.abs(diffX) < Math.max(56, start.width * 0.18) || Math.abs(diffX) <= Math.abs(diffY)) {
      pendingMove.current = null;
      setAnimating(dragOffset !== 0);
      setDragOffset(0);
      if (dragOffset !== 0) {
        clearTransitionTimer();
        transitionTimer.current = globalThis.setTimeout(finishTransition, 260);
      }
      return;
    }
    const nextMove = diffX < 0 ? 1 : -1;
    pendingMove.current = nextMove;
    ignoreNextClick();
    setAnimating(true);
    setDragOffset(-nextMove * start.width);
    clearTransitionTimer();
    transitionTimer.current = globalThis.setTimeout(finishTransition, 260);
  }

  function cancelSwipe() {
    swipeStart.current = null;
    pendingMove.current = null;
    setAnimating(dragOffset !== 0);
    setDragOffset(0);
    if (dragOffset !== 0) {
      clearTransitionTimer();
      transitionTimer.current = globalThis.setTimeout(finishTransition, 260);
    }
  }

  function finishHandleSwipe(event: PointerEvent<HTMLButtonElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const diffY = event.clientY - start.y;
    const diffX = event.clientX - start.x;
    if (Math.abs(diffY) < 28 || Math.abs(diffY) <= Math.abs(diffX)) return;
    ignoreNextClick();
    setMode(diffY > 0 ? 'month' : 'week');
  }

  return {
    mode,
    monthLabel: `${year}年${month + 1}月`,
    pages,
    dragOffset,
    animating,
    selectDate,
    toggleMode,
    jumpToToday,
    startSwipe,
    startHandleSwipe,
    moveSwipe,
    finishSwipe,
    cancelSwipe,
    cancelHandleSwipe: () => {
      swipeStart.current = null;
    },
    finishHandleSwipe,
    finishTransition,
  };
}
