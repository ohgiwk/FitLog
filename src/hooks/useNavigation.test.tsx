import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../storageNormalization';
import { screenPaths } from '../routes';
import { useNavigation } from './useNavigation';

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={[screenPaths.home]}>{children}</MemoryRouter>;
}

describe('useNavigation routing', () => {
  it('ルートの初期パスを画面状態へ反映する', () => {
    const settingsWrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[screenPaths.settings]}>{children}</MemoryRouter>
    );
    const { result } = renderHook(
      () =>
        useNavigation({
          state: createDefaultState(),
          saveState: vi.fn(),
          setEditMode: vi.fn(),
          setGoalAchievement: vi.fn(),
        }),
      { wrapper: settingsWrapper },
    );

    expect(result.current.screen).toBe('settings');
  });

  it('showScreenでルートと画面状態を切り替える', async () => {
    const { result } = renderHook(
      () =>
        useNavigation({
          state: createDefaultState(),
          saveState: vi.fn(),
          setEditMode: vi.fn(),
          setGoalAchievement: vi.fn(),
        }),
      { wrapper },
    );

    act(() => {
      result.current.showScreen('analysis');
    });

    await waitFor(() => expect(result.current.screen).toBe('analysis'));
    expect(result.current.transitionFrom).toBe('home');
    expect(result.current.transitionDirection).toBe('forward');
  });
});
