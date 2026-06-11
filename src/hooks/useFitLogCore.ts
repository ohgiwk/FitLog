import { useEffect, useState } from 'react';
import { loadState, storeKey } from '../storage';
import { State } from '../types';

/**
 * アプリの保存対象データ(state)とトースト表示を一元管理する土台フック
 */
export function useFitLogCore() {
  const [state, setState] = useState<State>(() => loadState());
  const [toast, setToast] = useState('');

  /**
   * state が変わるたびに localStorage へ保存する
   */
  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }, [state]);

  /**
   * トースト表示後、一定時間で自動的に消す
   */
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /**
   * 直前の state を受け取って新しい state を返す更新関数
   */
  function saveState(updater: (draft: State) => State) {
    setState((prev) => updater(prev));
  }

  /**
   * 画面下部に短いメッセージを表示する
   */
  function showToast(message: string) {
    setToast(message);
  }

  return { state, setState, saveState, toast, showToast };
}

export type FitLogCore = ReturnType<typeof useFitLogCore>;
