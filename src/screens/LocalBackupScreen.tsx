import { ChangeEvent, useRef } from 'react';
import { ChevronLeft, ExportIcon, ImportIcon } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';

/**
 * 端末内データのJSON書き出し・読み込みを行う画面
 */
export function LocalBackupScreen() {
  const { actions } = useFitLogContext();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * 選択されたバックアップファイルを読み込み処理へ渡す
   */
  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await actions.importState(file);
  }

  return (
    <section className="screen active settings-screen">
      <header className="topbar">
        <div className="bar-row">
          <button
            className="bar-btn"
            type="button"
            aria-label="戻る"
            onClick={() => actions.setScreen('settings')}
          >
            <ChevronLeft />
          </button>
          <div className="bar-title">ローカルバックアップ</div>
          <span />
        </div>
      </header>
      <div className="settings-content">
        <input
          ref={importInputRef}
          hidden
          accept="application/json,.json"
          type="file"
          onChange={(event) => void handleImport(event)}
        />
        <section className="settings-section" aria-labelledby="local-backup-title">
          <h2 className="settings-section-title" id="local-backup-title">
            ローカルバックアップ
          </h2>
          <p className="settings-help settings-section-body">
            端末内の記録をJSONファイルとして保存したり、保存済みのJSONファイルから復元できます。
          </p>
          <button className="settings-link-row" type="button" onClick={actions.exportState}>
            <ExportIcon />
            <span>記録を書き出す</span>
          </button>
          <button
            className="settings-link-row"
            type="button"
            onClick={() => importInputRef.current?.click()}
          >
            <ImportIcon />
            <span>記録を読み込む</span>
          </button>
        </section>
      </div>
    </section>
  );
}
