import { Component, type ErrorInfo, type ReactNode } from 'react';
import { storeKey } from '../storage';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

/**
 * 描画中に例外が起きても画面全体が真っ白にならないようにする境界。
 * 復旧手段として、データのバックアップ書き出しと再読み込みを提供する
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  /**
   * 子の描画で例外が発生したらエラー表示へ切り替える
   */
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  /**
   * 解析用にエラー内容をコンソールへ出力する
   */
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('描画中にエラーが発生しました', error, info);
  }

  /**
   * localStorage の保存データを直接読み出して JSON として書き出す。
   * React の state が壊れていても動くよう、保存済みデータをそのまま使う
   */
  private handleExport = () => {
    try {
      const data = localStorage.getItem(storeKey);
      if (!data) return;
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'fitlog-backup.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      // 書き出しに失敗しても復旧画面は維持する
    }
  };

  /**
   * ページを再読み込みして復旧を試みる
   */
  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary-card">
          <h1>問題が発生しました</h1>
          <p>
            画面の表示中にエラーが発生しました。記録データは端末に保存されています。
            念のためバックアップを書き出してから、再読み込みをお試しください。
          </p>
          <div className="error-boundary-actions">
            <button className="small-outline" type="button" onClick={this.handleExport}>
              データを書き出す
            </button>
            <button className="primary" type="button" onClick={this.handleReload}>
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }
}
