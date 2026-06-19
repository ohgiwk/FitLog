import { ChevronLeft, PartsIcon } from '../icons';
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
  };
}

/**
 * アプリ全体の表示・入力設定を変更する画面
 */
export function SettingsScreen() {
  const { weightUnit, onBack, onEditParts, onChangeWeightUnit } = useSettingsScreenModel();

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
      </div>
    </section>
  );
}
