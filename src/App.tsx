import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FitLogProvider } from './hooks/FitLogContext';
import { useFitLogContext } from './hooks/useFitLogContext';
import { DetailScreen } from './screens/DetailScreen';
import { ExerciseHistoryScreen } from './screens/ExerciseHistoryScreen';
import { ExerciseEditScreen } from './screens/ExerciseEditScreen';
import { HomeScreen } from './screens/HomeScreen';
import { GoalAchievementScreen } from './screens/GoalAchievementScreen';
import { PartEditScreen } from './screens/PartEditScreen';
import { PresetEditScreen } from './screens/PresetEditScreen';
import { PresetExerciseSelectScreen } from './screens/PresetExerciseSelectScreen';
import { SelectScreen } from './screens/SelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LocalBackupScreen } from './screens/LocalBackupScreen';
import { CloudAuthScreen } from './screens/CloudAuthScreen';
import { CloudBackupsScreen } from './screens/CloudBackupsScreen';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { TrainingMenuScreen } from './screens/TrainingMenuScreen';
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
 * 画面の切り替えとトーストを担当する外枠。
 * 各画面に渡す値は Context から各画面が自分で取得するため props は持たせない
 */
function AppShell() {
  const { screen, currentWorkout, toast, goalAchievement, state, actions } = useFitLogContext();
  const appRef = useRef<HTMLElement>(null);
  const [updateServiceWorker, setUpdateServiceWorker] = useState<UpdateServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);

  useLayoutEffect(() => {
    appRef.current?.scrollTo({ top: 0 });
  }, [screen]);

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
      <main className="app" ref={appRef}>
        {screen === 'home' && <HomeScreen />}
        {screen === 'select' && <SelectScreen />}
        {screen === 'exerciseEdit' && <ExerciseEditScreen />}
        {screen === 'detail' && currentWorkout && <DetailScreen />}
        {screen === 'exerciseHistory' && currentWorkout && <ExerciseHistoryScreen />}
        {screen === 'goalAchievements' && <GoalAchievementScreen />}
        {screen === 'presetEdit' && <PresetEditScreen />}
        {screen === 'presetExerciseSelect' && <PresetExerciseSelectScreen />}
        {screen === 'trainingMenu' && <TrainingMenuScreen />}
        {screen === 'analysis' && <AnalysisScreen />}
        {screen === 'partEdit' && <PartEditScreen />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'localBackup' && <LocalBackupScreen />}
        {screen === 'cloudAuth' && <CloudAuthScreen />}
        {screen === 'cloudBackups' && <CloudBackupsScreen />}
      </main>

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
      {updateServiceWorker && (
        <div className="update-banner" role="status" aria-live="polite">
          <span>新しいバージョンがあります</span>
          <button
            className="update-button"
            type="button"
            disabled={updating}
            onClick={() => void applyUpdate()}
          >
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
