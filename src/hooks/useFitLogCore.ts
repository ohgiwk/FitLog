import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { loadState, storeKey } from '../storage';
import { State } from '../types';

export type ToastState = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * state を localStorage へ保存するまでの待ち時間(ミリ秒)。
 * 連続入力のたびに書き込むのを避け、最後の入力からこの時間後にまとめて保存する
 */
const SAVE_DEBOUNCE_MS = 400;

/**
 * state を localStorage へ保存する。
 * 容量超過やプライベートモードなどで失敗した場合は onError を呼ぶ
 */
function stampState(state: State): State {
  return { ...state, updatedAt: new Date().toISOString() };
}

function readStoredUpdatedAt() {
  try {
    const raw = localStorage.getItem(storeKey);
    if (!raw || raw === 'null') return null;
    const parsed = JSON.parse(raw) as Partial<State> | null;
    return typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : null;
  } catch {
    return null;
  }
}

function persistState({
  state,
  lastKnownStoredUpdatedAt,
  hasExternalStorageConflict,
  onConflict,
  onError,
}: {
  state: State;
  lastKnownStoredUpdatedAt: MutableRefObject<string | null>;
  hasExternalStorageConflict: MutableRefObject<boolean>;
  onConflict: () => void;
  onError: () => void;
}) {
  try {
    const storedUpdatedAt = readStoredUpdatedAt();
    if (
      hasExternalStorageConflict.current ||
      (storedUpdatedAt &&
        lastKnownStoredUpdatedAt.current &&
        storedUpdatedAt !== lastKnownStoredUpdatedAt.current &&
        storedUpdatedAt !== state.updatedAt)
    ) {
      hasExternalStorageConflict.current = true;
      onConflict();
      return;
    }
    localStorage.setItem(storeKey, JSON.stringify(state));
    lastKnownStoredUpdatedAt.current = state.updatedAt;
    hasExternalStorageConflict.current = false;
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
  const [toast, setToast] = useState<ToastState | null>(null);
  /**
   * 即時保存(flush)で常に最新の state を参照するための保持用 ref
   */
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastKnownStoredUpdatedAt = useRef<string | null>(loadResult.state.updatedAt);
  const hasExternalStorageConflict = useRef(false);
  /**
   * 初回マウント時は読み込んだ内容をそのまま書き戻すだけなので保存をスキップする
   */
  const isFirstSaveRef = useRef(true);

  /**
   * 保存に失敗したことをトーストで知らせる
   */
  const notifySaveError = useCallback(() => {
    setToast({ message: '保存に失敗しました。空き容量を確認してください' });
  }, []);

  const notifyStorageConflict = useCallback(() => {
    setToast({ message: '別のタブで更新されました。再読み込みしてから続けてください' });
  }, []);

  /**
   * 壊れた保存データから初期化へ復帰した場合に、その旨をトーストで知らせる。
   * 旧データは退避済みなので消えていないことを伝える
   */
  useEffect(() => {
    if (loadResult.recoveredFromCorruption) {
      setToast({ message: '保存データを読み込めませんでした。旧データは退避済みです' });
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
      persistState({
        state,
        lastKnownStoredUpdatedAt,
        hasExternalStorageConflict,
        onConflict: notifyStorageConflict,
        onError: notifySaveError,
      });
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [notifySaveError, notifyStorageConflict, state]);

  /**
   * アプリが非表示・終了に向かう瞬間に、デバウンス待ちの内容を取りこぼさず保存する
   */
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') {
        persistState({
          state: stateRef.current,
          lastKnownStoredUpdatedAt,
          hasExternalStorageConflict,
          onConflict: notifyStorageConflict,
          onError: notifySaveError,
        });
      }
    };
    const flushNow = () =>
      persistState({
        state: stateRef.current,
        lastKnownStoredUpdatedAt,
        hasExternalStorageConflict,
        onConflict: notifyStorageConflict,
        onError: notifySaveError,
      });
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flushNow);
    };
  }, [notifySaveError, notifyStorageConflict]);

  /**
   * 別タブ・別ウィンドウの保存を検知し、古い state での無警告上書きを止める
   */
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storeKey) return;
      const storedUpdatedAt = readStoredUpdatedAt();
      if (!storedUpdatedAt || storedUpdatedAt === lastKnownStoredUpdatedAt.current) return;
      hasExternalStorageConflict.current = true;
      notifyStorageConflict();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [notifyStorageConflict]);

  /**
   * トースト表示後、一定時間で自動的に消す
   */
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.onAction ? 5000 : 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /**
   * 直前の state を受け取って新しい state を返す更新関数
   */
  const saveState = useCallback((updater: (draft: State) => State) => {
    setState((prev) => stampState(updater(prev)));
  }, []);

  /**
   * 現在の state を localStorage へ即時保存する
   */
  const flushState = useCallback(() => {
    persistState({
      state: stateRef.current,
      lastKnownStoredUpdatedAt,
      hasExternalStorageConflict,
      onConflict: notifyStorageConflict,
      onError: notifySaveError,
    });
  }, [notifySaveError, notifyStorageConflict]);

  /**
   * 画面下部に短いメッセージを表示する
   */
  const showToast = useCallback((message: string, action?: Omit<ToastState, 'message'>) => {
    setToast({ message, ...action });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const replaceState = useCallback((nextState: State) => {
    setState(stampState(nextState));
    hasExternalStorageConflict.current = false;
    lastKnownStoredUpdatedAt.current = null;
  }, []);

  return { state, setState: replaceState, saveState, flushState, toast, showToast, clearToast };
}
