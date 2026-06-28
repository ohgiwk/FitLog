import { ChevronLeft, EditIcon, ExportIcon, PartsIcon } from '../icons';
import { WeightUnit } from '../types';
import { weightUnitLabel } from '../utils';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { appVersion } from '../version';

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
    onEditExercises: () => actions.setScreen('exerciseManage'),
    onChangeWeightUnit: actions.setWeightUnit,
    onOpenLocalBackup: () => actions.setScreen('localBackup'),
    onOpenCloudBackup: () => actions.setScreen(actions.cloud.userEmail ? 'cloudBackups' : 'cloudAuth'),
  };
}

/**
 * アプリ全体の表示・入力設定を変更する画面
 */
export function SettingsScreen() {
  const {
    weightUnit,
    onBack,
    onEditParts,
    onEditExercises,
    onChangeWeightUnit,
    onOpenLocalBackup,
    onOpenCloudBackup,
  } =
    useSettingsScreenModel();

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
          <button className="settings-link-row" type="button" onClick={onEditExercises}>
            <EditIcon />
            <span>種目を編集</span>
          </button>
        </section>
        <section className="settings-section" aria-labelledby="data-management-title">
          <h2 className="settings-section-title" id="data-management-title">
            データ管理
          </h2>
          <button className="settings-link-row" type="button" onClick={onOpenLocalBackup}>
            <ExportIcon />
            <span>ローカルバックアップ</span>
          </button>
          <button className="settings-link-row" type="button" onClick={onOpenCloudBackup}>
            <ExportIcon />
            <span>クラウドバックアップ</span>
          </button>
        </section>
        <div className="settings-version" aria-label={`アプリバージョン ${appVersion}`}>
          {appVersion}
        </div>
      </div>
    </section>
  );
}
