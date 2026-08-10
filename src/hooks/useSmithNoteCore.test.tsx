import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSmithNoteCore } from './useSmithNoteCore';

type CoreValue = ReturnType<typeof useSmithNoteCore>;

function CoreProbe({ onRender }: { onRender: (core: CoreValue) => void }) {
  const core = useSmithNoteCore();
  onRender(core);
  return <div>{core.toast?.message ?? 'toastなし'}</div>;
}

describe('useSmithNoteCore toast queue', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
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

  it('操作付き toast が2件続いても10秒後に消える', () => {
    let core: CoreValue | null = null;
    render(<CoreProbe onRender={(nextCore) => (core = nextCore)} />);

    act(() => {
      core?.showToast('削除1件目', { actionLabel: '元に戻す', onAction: vi.fn() });
      core?.showToast('削除2件目', { actionLabel: '元に戻す', onAction: vi.fn() });
    });
    expect(screen.getByText('削除1件目')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('削除2件目')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('toastなし')).toBeTruthy();
  });
});
