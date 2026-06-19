import { useEffect, useState } from 'react';
import { CalendarIcon, HomeIcon } from './icons';
import { FitLogProvider, useFitLogContext } from './hooks/FitLogContext';
import { DetailScreen } from './screens/DetailScreen';
import { ExerciseHistoryScreen } from './screens/ExerciseHistoryScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { GoalAchievementScreen } from './screens/GoalAchievementScreen';
import { PartEditScreen } from './screens/PartEditScreen';
import { PresetEditScreen } from './screens/PresetEditScreen';
import { PresetListScreen } from './screens/PresetListScreen';
import { SelectScreen } from './screens/SelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import {
  formatStoredWeightInput,
  formatWeightForStorageInput,
  measurementUnit,
  number,
  weightUnitLabel,
} from './utils';

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

export function App() {
  return (
    <FitLogProvider>
      <AppShell />
    </FitLogProvider>
  );
}

/**
 * 画面の切り替えとボトムナビ・トーストを担当する外枠。
 * 各画面に渡す値は Context から各画面が自分で取得するため props は持たせない
 */
function AppShell() {
  const { screen, currentWorkout, toast, goalAchievement, state, actions } = useFitLogContext();
  const [updateServiceWorker, setUpdateServiceWorker] = useState<UpdateServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const onPwaUpdate = (event: Event) => {
      const { detail } = event as CustomEvent<{ updateSW: UpdateServiceWorker }>;
      setUpdateServiceWorker(() => detail.updateSW);
    };

    window.addEventListener('fitlog:pwa-update', onPwaUpdate);
    return () => window.removeEventListener('fitlog:pwa-update', onPwaUpdate);
  }, []);

  async function applyUpdate() {
    if (!updateServiceWorker) return;
    setUpdating(true);
    await updateServiceWorker(true);
  }

  return (
    <>
      <main className="app">
        {screen === 'home' && <HomeScreen />}
        {screen === 'select' && <SelectScreen />}
        {screen === 'detail' && currentWorkout && <DetailScreen />}
        {screen === 'exerciseHistory' && currentWorkout && <ExerciseHistoryScreen />}
        {screen === 'goalAchievements' && <GoalAchievementScreen />}
        {screen === 'preset' && <PresetListScreen />}
        {screen === 'presetEdit' && <PresetEditScreen />}
        {screen === 'history' && <HistoryScreen />}
        {screen === 'partEdit' && <PartEditScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>

      <nav className="bottom-nav">
        <button
          className={`nav-item ${screen === 'home' ? 'active' : ''}`}
          type="button"
          onClick={() => actions.setScreen('home')}
        >
          <HomeIcon />
          <span>ホーム</span>
        </button>
        <button
          className={`nav-item ${screen === 'history' ? 'active' : ''}`}
          type="button"
          onClick={() => actions.setScreen('history')}
        >
          <CalendarIcon />
          <span>履歴/計画</span>
        </button>
      </nav>
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
      {updateServiceWorker && (
        <div className="update-banner" role="status" aria-live="polite">
          <span>新しいバージョンがあります</span>
          <button className="update-button" type="button" disabled={updating} onClick={applyUpdate}>
            {updating ? '更新中' : '更新'}
          </button>
        </div>
      )}
      {goalAchievement && (
        <NextGoalDialog
          achievement={goalAchievement}
          weightUnit={state.weightUnit}
          onClose={actions.clearGoalAchievement}
          onSave={(goal) => {
            actions.updateExerciseGoal(goalAchievement.exerciseId, goal);
            actions.clearGoalAchievement();
          }}
        />
      )}
    </>
  );
}

function NextGoalDialog({
  achievement,
  weightUnit,
  onClose,
  onSave,
}: {
  achievement: NonNullable<ReturnType<typeof useFitLogContext>['goalAchievement']>;
  weightUnit: 'kg' | 'lbs';
  onClose: () => void;
  onSave: (goal: { weight: number; recordValue: number }) => void;
}) {
  const [weight, setWeight] = useState('');
  const [recordValue, setRecordValue] = useState('');

  useEffect(() => {
    const currentWeight = number(formatStoredWeightInput(achievement.goal.weight, weightUnit));
    setWeight(String(currentWeight + (weightUnit === 'lbs' ? 5 : 2.5)));
    setRecordValue(String(achievement.goal.recordValue));
  }, [achievement, weightUnit]);

  const storedWeight = formatWeightForStorageInput(weight, weightUnit);
  const canSave =
    weight.trim() !== '' &&
    recordValue.trim() !== '' &&
    Number(storedWeight) >= 0 &&
    Number(recordValue) > 0;

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="confirm-dialog goal-achievement-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-achievement-title"
      >
        <div className="goal-achievement-mark" aria-hidden="true">
          🎉
        </div>
        <div>
          <div className="goal-achievement-kicker">GOAL ACHIEVED</div>
          <h2 className="confirm-title" id="goal-achievement-title">
            目標達成、おめでとうございます！
          </h2>
        </div>
        <p>
          {achievement.exerciseName}で、目標の
          {formatStoredWeightInput(achievement.goal.weight, weightUnit)}
          {weightUnitLabel(weightUnit)} × {achievement.goal.recordValue}
          {measurementUnit(achievement.measurementType)}を達成しました。
        </p>
        <div className="next-goal-fields">
          <label>
            <span>次の重量</span>
            <div className="goal-input">
              <input
                type="number"
                min="0"
                step={weightUnit === 'lbs' ? '1' : '0.5'}
                inputMode="decimal"
                value={weight}
                autoFocus
                onChange={(event) => setWeight(event.target.value)}
              />
              <span>{weightUnitLabel(weightUnit)}</span>
            </div>
          </label>
          <label>
            <span>次の{achievement.measurementType === 'seconds' ? '秒数' : '回数'}</span>
            <div className="goal-input">
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={recordValue}
                onChange={(event) => setRecordValue(event.target.value)}
              />
              <span>{measurementUnit(achievement.measurementType)}</span>
            </div>
          </label>
        </div>
        <div className="confirm-actions">
          <button className="small-outline" type="button" onClick={onClose}>
            あとで
          </button>
          <button
            className="small-primary"
            type="button"
            disabled={!canSave}
            onClick={() =>
              onSave({
                weight: number(storedWeight),
                recordValue: number(recordValue),
              })
            }
          >
            次の目標にする
          </button>
        </div>
      </div>
    </div>
  );
}
