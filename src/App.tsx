import { useEffect, useLayoutEffect, useRef, useState, type AnimationEvent } from 'react';
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
import { ExerciseManageScreen, SelectScreen } from './screens/SelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LocalBackupScreen } from './screens/LocalBackupScreen';
import { CloudAuthScreen } from './screens/CloudAuthScreen';
import { CloudBackupsScreen } from './screens/CloudBackupsScreen';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { TrainingMenuScreen } from './screens/TrainingMenuScreen';
import { PlusIcon } from './icons';
import type { Screen } from './types';
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
  const {
    screen,
    transitionFrom,
    transitionDirection,
    currentWorkout,
    selectedDate,
    selectedWorkouts,
    groupedExercises,
    activePart,
    toast,
    goalAchievement,
    state,
    actions,
  } = useFitLogContext();
  const appRef = useRef<HTMLElement>(null);
  const [updateServiceWorker, setUpdateServiceWorker] = useState<UpdateServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  const [fabFaded, setFabFaded] = useState(false);
  const workoutEndTime = state.workoutEndTimes[selectedDate];
  const currentExerciseManagePart =
    activePart && groupedExercises.has(activePart) ? activePart : [...groupedExercises.keys()][0];
  const showHomeFab = screen === 'home' && !workoutEndTime && selectedWorkouts.length > 0;
  const showExerciseManageFab = screen === 'exerciseManage' && Boolean(currentExerciseManagePart);
  const showFab = showHomeFab || showExerciseManageFab;

  useLayoutEffect(() => {
    appRef.current?.scrollTo({ top: 0 });
  }, [screen]);

  useEffect(() => {
    if (!transitionFrom) return undefined;
    const timeoutId = window.setTimeout(actions.clearScreenTransition, 320);
    return () => window.clearTimeout(timeoutId);
  }, [actions.clearScreenTransition, transitionFrom]);

  useEffect(() => {
    const onPwaUpdate = (event: Event) => {
      const { detail } = event as CustomEvent<{ updateSW: UpdateServiceWorker }>;
      setUpdateServiceWorker(() => detail.updateSW);
    };

    window.addEventListener('fitlog:pwa-update', onPwaUpdate);
    return () => window.removeEventListener('fitlog:pwa-update', onPwaUpdate);
  }, []);

  useLayoutEffect(() => {
    if (!showFab) {
      setFabFaded(false);
      return undefined;
    }

    const app = appRef.current;
    if (!app) return undefined;

    let frameId = 0;

    const checkFabOverlap = () => {
      const fab = document.querySelector<HTMLElement>('.fab');
      const editRows = document.querySelectorAll<HTMLElement>('.exercise-option.edit-row');
      const target =
        screen === 'home'
          ? document.querySelector<HTMLElement>('.workout-action-button.primary')
          : editRows[editRows.length - 1];

      if (!fab || !target) {
        setFabFaded(false);
        return;
      }

      const fabRect = fab.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const margin = 12;
      const overlaps =
        targetRect.bottom > fabRect.top - margin &&
        targetRect.top < fabRect.bottom + margin &&
        targetRect.right > fabRect.left - margin &&
        targetRect.left < fabRect.right + margin;

      setFabFaded(overlaps);
    };

    const scheduleCheck = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(checkFabOverlap);
    };

    scheduleCheck();
    app.addEventListener('scroll', scheduleCheck, { passive: true });
    window.addEventListener('resize', scheduleCheck);

    return () => {
      window.cancelAnimationFrame(frameId);
      app.removeEventListener('scroll', scheduleCheck);
      window.removeEventListener('resize', scheduleCheck);
    };
  }, [
    activePart,
    currentExerciseManagePart,
    screen,
    selectedWorkouts.length,
    showFab,
    workoutEndTime,
  ]);

  async function applyUpdate() {
    if (!updateServiceWorker) return;
    setUpdating(true);
    await updateServiceWorker(true);
  }

  function clearScreenTransition(event: AnimationEvent<HTMLDivElement>) {
    if (event.currentTarget !== event.target) return;
    actions.clearScreenTransition();
  }

  function renderScreen(targetScreen: Screen) {
    if (targetScreen === 'home') return <HomeScreen />;
    if (targetScreen === 'select') return <SelectScreen />;
    if (targetScreen === 'exerciseEdit') return <ExerciseEditScreen />;
    if (targetScreen === 'detail' && currentWorkout) return <DetailScreen />;
    if (targetScreen === 'exerciseHistory' && currentWorkout) return <ExerciseHistoryScreen />;
    if (targetScreen === 'goalAchievements') return <GoalAchievementScreen />;
    if (targetScreen === 'presetEdit') return <PresetEditScreen />;
    if (targetScreen === 'presetExerciseSelect') return <PresetExerciseSelectScreen />;
    if (targetScreen === 'trainingMenu') return <TrainingMenuScreen />;
    if (targetScreen === 'analysis') return <AnalysisScreen />;
    if (targetScreen === 'partEdit') return <PartEditScreen />;
    if (targetScreen === 'exerciseManage') return <ExerciseManageScreen />;
    if (targetScreen === 'settings') return <SettingsScreen />;
    if (targetScreen === 'localBackup') return <LocalBackupScreen />;
    if (targetScreen === 'cloudAuth') return <CloudAuthScreen />;
    if (targetScreen === 'cloudBackups') return <CloudBackupsScreen />;
    return null;
  }

  return (
    <>
      <main className="app" ref={appRef}>
        <div className={`screen-transition-stage ${transitionFrom ? 'covering' : ''}`}>
          {transitionFrom && (
            <div
              className={`screen-layer previous ${
                transitionDirection === 'back' ? 'back-exit' : ''
              }`}
              aria-hidden="true"
              onAnimationEnd={transitionDirection === 'back' ? clearScreenTransition : undefined}
            >
              {renderScreen(transitionFrom)}
            </div>
          )}
          <div
            className={`screen-layer current ${
              transitionDirection === 'forward' ? 'forward' : ''
            }`}
            key={screen}
            onAnimationEnd={transitionDirection === 'forward' ? clearScreenTransition : undefined}
          >
            {renderScreen(screen)}
          </div>
        </div>
      </main>

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
      {showHomeFab && (
        <button
          className={`fab ${fabFaded ? 'faded' : ''}`}
          type="button"
          aria-label="種目を追加"
          onClick={() => actions.setScreen('select')}
        >
          <PlusIcon />
        </button>
      )}
      {showExerciseManageFab && currentExerciseManagePart && (
        <button
          className={`fab ${fabFaded ? 'faded' : ''}`}
          type="button"
          aria-label={`${currentExerciseManagePart}に種目を追加`}
          onClick={() => actions.openExerciseEditor(currentExerciseManagePart, null, 'exerciseManage')}
        >
          <PlusIcon />
        </button>
      )}
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
