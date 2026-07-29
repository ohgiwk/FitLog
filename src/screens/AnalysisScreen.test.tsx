import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FitLogContext, FitLogContextValue } from '../hooks/useFitLogContext';
import { createDefaultState } from '../storageNormalization';
import { AnalysisScreen } from './AnalysisScreen';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AnalysisScreen', () => {
  it('分析メニューのヘッダに「分析一覧」を表示する', () => {
    const value = {
      state: createDefaultState(),
      partColors: new Map(),
      analysisTargetExerciseId: null,
      actions: {
        goBack: vi.fn(),
      },
    } as unknown as FitLogContextValue;

    render(
      <FitLogContext.Provider value={value}>
        <AnalysisScreen />
      </FitLogContext.Provider>,
    );

    expect(screen.getByText('分析一覧', { selector: '.bar-title' })).toBeTruthy();
  });

  it.each(['成長グラフ', '総ボリューム', '自己ベスト', '実施回数'])(
    '詳細ページのヘッダに「%s」を表示する',
    (pageTitle) => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: true }) as MediaQueryList),
      );
      const value = {
        state: createDefaultState(),
        partColors: new Map(),
        analysisTargetExerciseId: null,
        actions: {
          goBack: vi.fn(),
        },
      } as unknown as FitLogContextValue;

      render(
        <FitLogContext.Provider value={value}>
          <AnalysisScreen />
        </FitLogContext.Provider>,
      );

      fireEvent.click(screen.getByRole('button', { name: new RegExp(pageTitle) }));

      expect(screen.getByText(pageTitle, { selector: '.bar-title' })).toBeTruthy();
    },
  );
});
