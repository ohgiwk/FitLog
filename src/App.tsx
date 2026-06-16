import { useEffect, useState } from 'react';
import { CalendarIcon, HomeIcon } from './icons';
import { FitLogProvider, useFitLogContext } from './hooks/FitLogContext';
import { DetailScreen } from './screens/DetailScreen';
import { ExerciseHistoryScreen } from './screens/ExerciseHistoryScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PartEditScreen } from './screens/PartEditScreen';
import { PresetEditScreen } from './screens/PresetEditScreen';
import { PresetListScreen } from './screens/PresetListScreen';
import { SelectScreen } from './screens/SelectScreen';
import { SettingsScreen } from './screens/SettingsScreen';

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
  const { screen, currentWorkout, toast, actions } = useFitLogContext();
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
    </>
  );
}
