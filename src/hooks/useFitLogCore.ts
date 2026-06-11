import { useEffect, useRef, useState } from 'react';
import { loadState, storeKey } from '../storage';
import { State } from '../types';

/**
 * state を localStorage へ保存するまでの待ち時間(ミリ秒)。
 * 連続入力のたびに書き込むのを避け、最後の入力からこの時間後にまとめて保存する
 */
const SAVE_DEBOUNCE_MS = 400;

/**
 * state を localStorage へ保存する。
 * 容量超過やプライベートモードなどで失敗した場合は onError を呼ぶ
 */
function persistState(state: State, onError: () => void) {
  try {
    localStorage.setItem(storeKey, JSON.stringify(state));
  } catch {
    onError();
  }
}

/**
 * アプリの保存対象データ(state)とトースト表示を一元管理する土台フック
 */
export function useFitLogCore() {
  /**
   * 起動時に1度だけ localStorage から読み込み、復旧フラグも保持する
   */
  const [loadResult] = useState(loadState);
  const [state, setState] = useState<State>(loadResult.state);
  const [toast, setToast] = useState('');
  /**
   * 即時保存(flush)で常に最新の state を参照するための保持用 ref
   */
  const stateRef = useRef(state);
  stateRef.current = state;
  /**
   * 初回マウント時は読み込んだ内容をそのまま書き戻すだけなので保存をスキップする
   */
  const isFirstSaveRef = useRef(true);

  /**
   * 保存に失敗したことをトーストで知らせる
   */
  function notifySaveError() {
    setToast('保存に失敗しました。空き容量を確認してください');
  }

  /**
   * 壊れた保存データから初期化へ復帰した場合に、その旨をトーストで知らせる。
   * 旧データは退避済みなので消えていないことを伝える
   */
  useEffect(() => {
    if (loadResult.recoveredFromCorruption) {
      setToast('保存データを読み込めませんでした。旧データは退避済みです');
    }
  }, [loadResult.recoveredFromCorruption]);

  /**
   * state が変わるたびに、一定時間後へまとめて localStorage に保存する
   */
  useEffect(() => {
    if (isFirstSaveRef.current) {
      isFirstSaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      persistState(state, notifySaveError);
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  /**
   * アプリが非表示・終了に向かう瞬間に、デバウンス待ちの内容を取りこぼさず保存する
   */
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') {
        persistState(stateRef.current, notifySaveError);
      }
    };
    const flushNow = () => persistState(stateRef.current, notifySaveError);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flushNow);
    };
  }, []);

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
