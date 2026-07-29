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

  it('goBackで直前に表示していた画面へ戻る', async () => {
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
      result.current.showScreen('select');
    });
    await waitFor(() => expect(result.current.screen).toBe('select'));

    act(() => {
      result.current.showScreen('exerciseManage');
    });
    await waitFor(() => expect(result.current.screen).toBe('exerciseManage'));

    act(() => {
      result.current.goBack();
    });

    await waitFor(() => expect(result.current.screen).toBe('select'));
    expect(result.current.transitionDirection).toBe('back');
  });

  it('種目選択から詳細へ進み、戻るとホームへ戻る', async () => {
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
      result.current.showScreen('select');
    });
    await waitFor(() => expect(result.current.screen).toBe('select'));

    act(() => {
      result.current.showScreen('detail');
    });
    await waitFor(() => expect(result.current.screen).toBe('detail'));
    expect(result.current.transitionFrom).toBe('select');
    expect(result.current.transitionDirection).toBe('forward');

    act(() => {
      result.current.goBack();
    });
    await waitFor(() => expect(result.current.screen).toBe('home'));
    expect(result.current.transitionDirection).toBe('back');
  });

  it('別の入口から開いた同じ画面でもgoBackで遷移元へ戻る', async () => {
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

    act(() => {
      result.current.showScreen('exerciseManage');
    });
    await waitFor(() => expect(result.current.screen).toBe('exerciseManage'));

    act(() => {
      result.current.goBack();
    });

    await waitFor(() => expect(result.current.screen).toBe('settings'));
  });

  it('直接アクセスで履歴がない場合は既定画面へ置き換える', async () => {
    const directWrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[screenPaths.exerciseManage]}>{children}</MemoryRouter>
    );
    const { result } = renderHook(
      () =>
        useNavigation({
          state: createDefaultState(),
          saveState: vi.fn(),
          setEditMode: vi.fn(),
          setGoalAchievement: vi.fn(),
        }),
      { wrapper: directWrapper },
    );

    act(() => {
      result.current.goBack();
    });

    await waitFor(() => expect(result.current.screen).toBe('settings'));
    expect(result.current.transitionDirection).toBe('back');
  });
});
