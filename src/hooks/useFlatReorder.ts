import { PointerEvent, useRef, useState } from 'react';

export type DragOverlayPosition = {
  left: number;
  top: number;
  width: number;
};

export function moveItemBefore(items: string[], movingId: string, beforeId: string | null) {
  const next = items.filter((id) => id !== movingId);
  const index = beforeId ? next.indexOf(beforeId) : next.length;
  next.splice(index === -1 ? next.length : index, 0, movingId);
  return next;
}

/**
 * フラットな一覧をポインタ位置に合わせて並び替え、ドラッグ終了時に確定する
 */
export function useFlatReorder({
  items,
  onCommit,
}: {
  items: string[];
  onCommit: (items: string[]) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [dragOverlay, setDragOverlay] = useState<DragOverlayPosition | null>(null);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const activeItems = dragOrder ?? items;

  function onPointerDown(event: PointerEvent<HTMLDivElement>, id: string) {
    if (!(event.target as HTMLElement).closest('[data-drag-handle]')) return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerOffsetRef.current = {
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    };
    setDraggingId(id);
    setDragOrder(items);
    setDragOverlay({
      left: box.left,
      top: box.top,
      width: box.width,
    });
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (draggingId === null || !listRef.current) return;
    const y = event.clientY;
    setDragOverlay((current) =>
      current
        ? {
            ...current,
            left: event.clientX - pointerOffsetRef.current.x,
            top: y - pointerOffsetRef.current.y,
          }
        : current,
    );
    let beforeId: string | null = null;

    for (const row of listRef.current.querySelectorAll<HTMLElement>('[data-reorder-row]')) {
      const id = row.dataset.reorderRow;
      if (!id || id === draggingId) continue;
      const box = row.getBoundingClientRect();
      if (y < box.top + box.height / 2) {
        beforeId = id;
        break;
      }
    }

    setDragOrder((currentOrder) => {
      const current = currentOrder ?? items;
      const next = moveItemBefore(current, draggingId, beforeId);
      return next.every((id, index) => id === current[index]) ? current : next;
    });
  }

  function onPointerUp() {
    if (
      draggingId !== null &&
      dragOrder &&
      !dragOrder.every((id, index) => id === items[index])
    ) {
      onCommit(dragOrder);
    }
    setDraggingId(null);
    setDragOrder(null);
    setDragOverlay(null);
  }

  return {
    listRef,
    draggingId,
    dragOverlay,
    activeItems,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
