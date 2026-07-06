import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  EditIcon,
  ExportIcon,
  NotificationIcon,
  PartsIcon,
  PrivacyIcon,
} from '../icons';
import { defaultRestTimerSeconds, restTimerPresetSeconds, ThemeMode, WeightUnit } from '../types';
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
    onChangeRestTimerDefaultSeconds: actions.setRestTimerDefaultSeconds,
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
    onChangeRestTimerDefaultSeconds,
    onOpenNotificationSettings,
    onOpenBackup,
    onOpenPrivacyPolicy,
    onOpenTermsOfService,
  } = useSettingsScreenModel();
  const [restTimerSecondsInput, setRestTimerSecondsInput] = useState(
    String(restTimerSettings.defaultSeconds),
  );
  const isRestTimerPresetSeconds = restTimerPresetSeconds.includes(
    restTimerSettings.defaultSeconds as (typeof restTimerPresetSeconds)[number],
  );
  const [restTimerSecondsMode, setRestTimerSecondsMode] = useState<'preset' | 'custom'>(
    isRestTimerPresetSeconds ? 'preset' : 'custom',
  );

  useEffect(() => {
    setRestTimerSecondsInput(String(restTimerSettings.defaultSeconds));
  }, [restTimerSettings.defaultSeconds]);

  function updateRestTimerSecondsInput(value: string) {
    const nextInput = value.replace(/[^\d]/g, '').slice(0, 3);
    setRestTimerSecondsInput(nextInput);
    if (nextInput) onChangeRestTimerDefaultSeconds(Number(nextInput));
  }

  function commitRestTimerSecondsInput() {
    if (restTimerSecondsInput) return;
    setRestTimerSecondsInput(String(restTimerSettings.defaultSeconds || defaultRestTimerSeconds));
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
        </section>
        <section className="settings-section" aria-labelledby="rest-timer-settings-title">
          <h2 className="settings-section-title" id="rest-timer-settings-title">
            レストタイマー
          </h2>
          <div className="settings-row">
            <div className="settings-label">
              <span>自動開始</span>
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
          <div className="settings-row rest-timer-default-row">
            <div className="settings-label">
              <span>デフォルト秒数</span>
              <strong>{restTimerSettings.defaultSeconds}秒</strong>
            </div>
            <div className="rest-timer-default-controls">
              <div
                className="unit-switch rest-timer-seconds-mode"
                role="group"
                aria-label="デフォルト秒数の入力方法"
              >
                <button
                  className={`unit-switch-button ${restTimerSecondsMode === 'preset' ? 'active' : ''}`}
                  type="button"
                  aria-pressed={restTimerSecondsMode === 'preset'}
                  onClick={() => {
                    setRestTimerSecondsMode('preset');
                    if (!isRestTimerPresetSeconds) {
                      onChangeRestTimerDefaultSeconds(defaultRestTimerSeconds);
                    }
                  }}
                >
                  選択
                </button>
                <button
                  className={`unit-switch-button ${restTimerSecondsMode === 'custom' ? 'active' : ''}`}
                  type="button"
                  aria-pressed={restTimerSecondsMode === 'custom'}
                  onClick={() => setRestTimerSecondsMode('custom')}
                >
                  自由
                </button>
              </div>
              {restTimerSecondsMode === 'preset' ? (
                <select
                  aria-label="レストタイマーのデフォルト秒数を選択"
                  value={
                    isRestTimerPresetSeconds
                      ? String(restTimerSettings.defaultSeconds)
                      : String(defaultRestTimerSeconds)
                  }
                  onChange={(event) => onChangeRestTimerDefaultSeconds(Number(event.target.value))}
                >
                  {restTimerPresetSeconds.map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {seconds}秒
                    </option>
                  ))}
                </select>
              ) : (
                <label className="rest-timer-custom-seconds">
                  <input
                    aria-label="レストタイマーのデフォルト秒数を自由入力"
                    type="number"
                    min="1"
                    max="999"
                    inputMode="numeric"
                    value={restTimerSecondsInput}
                    onBlur={commitRestTimerSecondsInput}
                    onChange={(event) => updateRestTimerSecondsInput(event.target.value)}
                  />
                  <span>秒</span>
                </label>
              )}
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
