import { PointerEvent, useMemo, useRef, useState } from 'react';
import { Exercise, ExerciseCategory } from '../types';
import { exerciseCategories } from '../utils';

export type ReorderItem = { id: string; category: ExerciseCategory };

const categoryOrder = exerciseCategories.map((item) => item.value);

export function sameExerciseLayout(a: ReorderItem[], b: ReorderItem[]) {
  return (
    a.length === b.length &&
    a.every((item, index) => item.id === b[index].id && item.category === b[index].category)
  );
}

export function findExerciseInsertionIndex(
  layout: ReorderItem[],
  category: ExerciseCategory,
  beforeId: string | null,
) {
  if (beforeId) {
    const index = layout.findIndex((item) => item.id === beforeId);
    if (index !== -1) return index;
  }
  const targetRank = categoryOrder.indexOf(category);
  let index = 0;
  layout.forEach((item, itemIndex) => {
    if (categoryOrder.indexOf(item.category) <= targetRank) index = itemIndex + 1;
  });
  return index;
}

/**
 * ポインタ位置から種目の表示順とカテゴリを更新し、ドラッグ終了時だけ確定する
 */
export function useExerciseReorder({
  exercises,
  onCommit,
}: {
  exercises: Exercise[];
  onCommit: (layout: ReorderItem[]) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [layout, setLayout] = useState<ReorderItem[] | null>(null);
  const byId = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );
  const baseLayout = useMemo(
    () =>
      categoryOrder.flatMap((category) =>
        exercises
          .filter((exercise) => exercise.category === category)
          .map((exercise) => ({ id: exercise.id, category })),
      ),
    [exercises],
  );
  const activeLayout = layout ?? baseLayout;

  function itemsFor(category: ExerciseCategory) {
    return activeLayout
      .filter((item) => item.category === category)
      .map((item) => byId.get(item.id))
      .filter((exercise): exercise is Exercise => Boolean(exercise));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>, id: string) {
    if (!(event.target as HTMLElement).closest('[data-drag-handle]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setLayout(baseLayout);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (draggingId === null || !listRef.current) return;
    const sections = Array.from(
      listRef.current.querySelectorAll<HTMLElement>('[data-category-section]'),
    );
    if (!sections.length) return;

    const y = event.clientY;
    let targetCategory = sections[sections.length - 1].dataset.categorySection as ExerciseCategory;
    for (const section of sections) {
      if (y < section.getBoundingClientRect().bottom) {
        targetCategory = section.dataset.categorySection as ExerciseCategory;
        break;
      }
    }

    const section = sections.find((item) => item.dataset.categorySection === targetCategory);
    let beforeId: string | null = null;
    for (const row of section?.querySelectorAll<HTMLElement>('[data-exercise-row]') ?? []) {
      const id = row.dataset.exerciseRow;
      if (!id || id === draggingId) continue;
      const box = row.getBoundingClientRect();
      if (y < box.top + box.height / 2) {
        beforeId = id;
        break;
      }
    }

    setLayout((currentLayout) => {
      const current = currentLayout ?? baseLayout;
      const next = current.filter((item) => item.id !== draggingId);
      const index = findExerciseInsertionIndex(next, targetCategory, beforeId);
      next.splice(index, 0, { id: draggingId, category: targetCategory });
      return sameExerciseLayout(next, current) ? current : next;
    });
  }

  function onPointerUp() {
    if (draggingId !== null && layout && !sameExerciseLayout(layout, baseLayout)) onCommit(layout);
    setDraggingId(null);
    setLayout(null);
  }

  return { listRef, draggingId, itemsFor, onPointerDown, onPointerMove, onPointerUp };
}
