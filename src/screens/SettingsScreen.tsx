import {
  ChevronLeft,
  EditIcon,
  ExportIcon,
  NotificationIcon,
  PartsIcon,
  PrivacyIcon,
} from '../icons';
import { ThemeMode, WeightUnit } from '../types';
import { weightUnitLabel } from '../utils';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { appVersion } from '../version';

const unitOptions: WeightUnit[] = ['kg', 'lbs'];
const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'ダーク' },
  { value: 'light', label: 'ライト' },
];

/**
 * 設定画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function useSettingsScreenModel() {
  const { state, actions } = useFitLogContext();

  return {
    weightUnit: state.weightUnit,
    themeMode: state.themeMode,
    restTimerSettings: state.restTimerSettings,
    onBack: () => actions.setScreen('home'),
    onEditParts: () => actions.setScreen('partEdit'),
    onEditExercises: () => actions.setScreen('exerciseManage'),
    onChangeWeightUnit: actions.setWeightUnit,
    onChangeThemeMode: actions.setThemeMode,
    onChangeRestTimerAutoStart: actions.setRestTimerAutoStart,
    onOpenNotificationSettings: () => actions.setScreen('notificationSettings'),
    onOpenBackup: () => actions.setScreen('backup'),
    onOpenPrivacyPolicy: () => actions.setScreen('privacyPolicy'),
    onOpenTermsOfService: () => actions.setScreen('termsOfService'),
  };
}

/**
 * アプリ全体の表示・入力設定を変更する画面
 */
export function SettingsScreen() {
  const {
    weightUnit,
    themeMode,
    restTimerSettings,
    onBack,
    onEditParts,
    onEditExercises,
    onChangeWeightUnit,
    onChangeThemeMode,
    onChangeRestTimerAutoStart,
    onOpenNotificationSettings,
    onOpenBackup,
    onOpenPrivacyPolicy,
    onOpenTermsOfService,
  } = useSettingsScreenModel();

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
        <section className="settings-section" aria-labelledby="display-settings-title">
          <h2 className="settings-section-title" id="display-settings-title">
            表示設定
          </h2>
          <div className="settings-row">
            <div className="settings-label">
              <span>外観</span>
              <strong>{themeMode === 'dark' ? 'ダークモード' : 'ライトモード'}</strong>
            </div>
            <div className="unit-switch theme-switch" role="group" aria-label="外観モード">
              {themeOptions.map((theme) => (
                <button
                  className={`unit-switch-button ${themeMode === theme.value ? 'active' : ''}`}
                  key={theme.value}
                  type="button"
                  aria-pressed={themeMode === theme.value}
                  onClick={() => onChangeThemeMode(theme.value)}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
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
          <div className="settings-row">
            <div className="settings-label">
              <span>レストタイマー</span>
              <strong>強度入力時に自動で開始</strong>
            </div>
            <div className="unit-switch" role="group" aria-label="強度入力時のレストタイマー自動開始">
              <button
                className={`unit-switch-button ${restTimerSettings.autoStartOnIntensity ? 'active' : ''}`}
                type="button"
                aria-pressed={restTimerSettings.autoStartOnIntensity}
                onClick={() => onChangeRestTimerAutoStart(true)}
              >
                ON
              </button>
              <button
                className={`unit-switch-button ${restTimerSettings.autoStartOnIntensity ? '' : 'active'}`}
                type="button"
                aria-pressed={!restTimerSettings.autoStartOnIntensity}
                onClick={() => onChangeRestTimerAutoStart(false)}
              >
                OFF
              </button>
            </div>
          </div>
        </section>
        <section className="settings-section" aria-labelledby="master-management-title">
          <h2 className="settings-section-title" id="master-management-title">
            マスタ管理
          </h2>
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
          <button className="settings-link-row" type="button" onClick={onOpenBackup}>
            <ExportIcon />
            <span>バックアップ</span>
          </button>
        </section>
        <section className="settings-section" aria-labelledby="notification-settings-title">
          <h2 className="settings-section-title" id="notification-settings-title">
            通知
          </h2>
          <button className="settings-link-row" type="button" onClick={onOpenNotificationSettings}>
            <NotificationIcon />
            <span>通知設定</span>
          </button>
        </section>
        <section className="settings-section" aria-labelledby="about-app-title">
          <h2 className="settings-section-title" id="about-app-title">
            アプリ情報
          </h2>
          <button className="settings-link-row" type="button" onClick={onOpenPrivacyPolicy}>
            <PrivacyIcon />
            <span>プライバシーポリシー</span>
          </button>
          <button className="settings-link-row" type="button" onClick={onOpenTermsOfService}>
            <PrivacyIcon />
            <span>利用規約</span>
          </button>
        </section>
        <div className="settings-version" aria-label={`アプリバージョン ${appVersion}`}>
          {appVersion}
        </div>
      </div>
    </section>
  );
}
