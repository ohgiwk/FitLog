import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFitLogCore } from './useFitLogCore';

type CoreValue = ReturnType<typeof useFitLogCore>;

function CoreProbe({ onRender }: { onRender: (core: CoreValue) => void }) {
  const core = useFitLogCore();
  onRender(core);
  return <div>{core.toast?.message ?? 'toastなし'}</div>;
}

describe('useFitLogCore toast queue', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('表示中の toast がある場合は次の toast を順番に表示する', () => {
    let core: CoreValue | null = null;
    render(<CoreProbe onRender={(nextCore) => (core = nextCore)} />);

    expect(screen.getByText('toastなし')).toBeTruthy();

    act(() => {
      core?.showToast('1件目');
    });
    expect(screen.getByText('1件目')).toBeTruthy();

    act(() => {
      core?.showToast('2件目');
      core?.showToast('3件目');
    });
    expect(screen.getByText('1件目')).toBeTruthy();

    act(() => {
      core?.clearToast();
    });
    expect(screen.getByText('2件目')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByText('3件目')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByText('toastなし')).toBeTruthy();
  });
});
