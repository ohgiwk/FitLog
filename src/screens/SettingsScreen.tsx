import { ChangeEvent, useRef } from 'react';
import { ChevronLeft, ExportIcon, ImportIcon, PartsIcon } from '../icons';
import { WeightUnit } from '../types';
import { weightUnitLabel } from '../utils';
import { useFitLogContext } from '../hooks/useFitLogContext';

const unitOptions: WeightUnit[] = ['kg', 'lbs'];

/**
 * 設定画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function useSettingsScreenModel() {
  const { state, actions } = useFitLogContext();

  return {
    weightUnit: state.weightUnit,
    onBack: () => actions.setScreen('home'),
    onEditParts: () => actions.setScreen('partEdit'),
    onChangeWeightUnit: actions.setWeightUnit,
    onExport: actions.exportState,
    onImport: actions.importState,
  };
}

/**
 * アプリ全体の表示・入力設定を変更する画面
 */
export function SettingsScreen() {
  const { weightUnit, onBack, onEditParts, onChangeWeightUnit, onExport, onImport } =
    useSettingsScreenModel();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * 選択されたバックアップファイルを読み込み処理へ渡す
   */
  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await onImport(file);
  }

  return (
    <section className="screen active settings-screen">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>
            <ChevronLeft />
          </button>
          <div className="bar-title">設定</div>
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
        <section className="settings-section" aria-label="単位設定">
          <div className="settings-row">
            <div className="settings-label">
              <span>単位</span>
              <strong>{weightUnitLabel(weightUnit)}</strong>
            </div>
            <div className="unit-switch" role="group" aria-label="重量単位">
              {unitOptions.map((unit) => (
                <button
                  className={`unit-switch-button ${weightUnit === unit ? 'active' : ''}`}
                  key={unit}
                  type="button"
                  aria-pressed={weightUnit === unit}
                  onClick={() => onChangeWeightUnit(unit)}
                >
                  {weightUnitLabel(unit)}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="settings-section" aria-label="部位設定">
          <button className="settings-link-row" type="button" onClick={onEditParts}>
            <PartsIcon />
            <span>部位を編集</span>
          </button>
        </section>
        <section className="settings-section" aria-labelledby="data-management-title">
          <h2 className="settings-section-title" id="data-management-title">
            データ管理
          </h2>
          <button className="settings-link-row" type="button" onClick={onExport}>
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
