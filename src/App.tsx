import { CalendarIcon, HomeIcon } from './icons';
import { FitLogProvider, useFitLogContext } from './hooks/FitLogContext';
import { DetailScreen } from './screens/DetailScreen';
import { ExerciseHistoryScreen } from './screens/ExerciseHistoryScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PresetEditScreen } from './screens/PresetEditScreen';
import { PresetListScreen } from './screens/PresetListScreen';
import { SelectScreen } from './screens/SelectScreen';

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
    </>
  );
}
