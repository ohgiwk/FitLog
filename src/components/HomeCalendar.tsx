import { useMemo, useState } from 'react';
import {
  AnalysisIcon,
  ChevronDown,
  ChevronUp,
  MenuIcon,
  SettingsIcon,
  TrophyIcon,
} from '../icons';
import { useHomeCalendar } from '../hooks/useHomeCalendar';
import { localDate, weekdayLabels } from '../utils';
import { appVersion } from '../version';
import { Workout } from '../types';

type HomeCalendarProps = {
  selectedDate: string;
  workouts: Workout[];
  onSelectDate: (date: string) => void;
  onOpenAnalysis: () => void;
  onOpenSettings: () => void;
  onOpenGoalAchievements: () => void;
};

export function HomeCalendar({
  selectedDate,
  workouts,
  onSelectDate,
  onOpenAnalysis,
  onOpenSettings,
  onOpenGoalAchievements,
}: HomeCalendarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const calendar = useHomeCalendar(selectedDate, onSelectDate);
  const trainedDates = useMemo(() => new Set(workouts.map((workout) => workout.date)), [workouts]);
  const today = localDate(new Date());

  function openFromDrawer(action: () => void) {
    setDrawerOpen(false);
    action();
  }

  return (
    <header className={`home-calendar-shell ${calendar.mode}`}>
      <div className="home-calendar-head">
        <button
          className="home-menu-btn"
          type="button"
          aria-label="メニューを開く"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <MenuIcon />
        </button>
        <button className="home-calendar-title" type="button" onClick={calendar.toggleMode}>
          <span>{calendar.monthLabel}</span>
          {calendar.mode === 'week' ? <ChevronDown /> : <ChevronUp />}
        </button>
        <button
          className="home-today-btn"
          type="button"
          onClick={calendar.jumpToToday}
          aria-label="今日の日付へ移動"
        >
          今日
        </button>
      </div>
      {drawerOpen && (
        <div className="drawer-layer" role="presentation" onClick={() => setDrawerOpen(false)}>
          <aside
            className="home-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="メニュー"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-head">
              <strong>メニュー</strong>
              <button className="drawer-close" type="button" onClick={() => setDrawerOpen(false)}>
                閉じる
              </button>
            </div>
            <button
              className="drawer-link"
              type="button"
              onClick={() => openFromDrawer(onOpenGoalAchievements)}
            >
              <TrophyIcon />
              <span>目標達成記録</span>
            </button>
            <button
              className="drawer-link"
              type="button"
              onClick={() => openFromDrawer(onOpenAnalysis)}
            >
              <AnalysisIcon />
              <span>分析</span>
            </button>
            <button
              className="drawer-link"
              type="button"
              onClick={() => openFromDrawer(onOpenSettings)}
            >
              <SettingsIcon />
              <span>設定</span>
            </button>
            <div className="drawer-version" aria-label={`アプリバージョン ${appVersion}`}>
              {appVersion}
            </div>
          </aside>
        </div>
      )}
      <div
        className="home-calendar-viewport"
        onPointerDown={calendar.startSwipe}
        onPointerMove={calendar.moveSwipe}
        onPointerUp={calendar.finishSwipe}
        onPointerCancel={calendar.cancelSwipe}
      >
        <div
          className={`home-calendar-track ${calendar.animating ? 'animating' : ''}`}
          style={{ transform: `translateX(${calendar.dragOffset}px)` }}
          onTransitionEnd={calendar.finishTransition}
        >
          {calendar.pages.map((page) => (
            <div className="home-calendar-page" key={page.key}>
              <div className="home-calendar-grid">
                {weekdayLabels.map((day) => (
                  <div className="weekday" key={day}>
                    {day}
                  </div>
                ))}
                {page.days.map((cell) => {
                  const trained = trainedDates.has(cell.date);
                  const selected = cell.date === selectedDate;
                  const isToday = cell.date === today;
                  return (
                    <div className={`day-cell ${cell.inMonth ? '' : 'other'}`} key={cell.date}>
                      {cell.inMonth ? (
                        <button
                          className={`day-btn ${trained ? 'trained' : ''} ${
                            isToday ? 'today' : ''
                          } ${selected ? 'selected' : ''}`}
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onPointerUp={(event) => event.stopPropagation()}
                          onTouchEnd={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            calendar.selectDate(cell.date);
                          }}
                          onClick={() => calendar.selectDate(cell.date)}
                        >
                          {cell.day}
                        </button>
                      ) : (
                        <span aria-hidden="true" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <button
        className="calendar-drag-handle"
        type="button"
        aria-label="カレンダーの週表示と月表示を切り替え"
        onClick={calendar.toggleMode}
        onPointerDown={calendar.startHandleSwipe}
        onPointerUp={calendar.finishHandleSwipe}
        onPointerCancel={calendar.cancelHandleSwipe}
      />
    </header>
  );
}
