import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { TrainingDay, TrainingPlan, TrainingPlanMode, Workout } from '../types';
import { calendarCells, localDate, nextMonthLabel, parseDate, prevMonthLabel } from '../utils';
import { ExportIcon, ImportIcon, PartsIcon, SettingsIcon } from '../icons';
import { useFitLogContext } from '../hooks/FitLogContext';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 履歴/計画画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function useHistoryScreenModel() {
  const { selectedDate, state, orderedParts, partColors, historyPartFilter, actions } =
    useFitLogContext();

  return {
    selectedDate,
    workouts: state.workouts,
    trainingDays: state.trainingDays,
    trainingPlans: state.trainingPlans,
    orderedParts,
    partColors,
    partFilter: historyPartFilter,
    onPartFilter: actions.setHistoryPartFilter,
    onEditParts: () => actions.setScreen('partEdit'),
    /**
     * 日付を選択し、ワークアウト選択を解除してホーム画面へ戻る
     */
    onSelectDate: (date: string) => {
      actions.selectDate(date);
      actions.setCurrentWorkoutId(null);
      actions.setScreen('home');
    },
    onExport: actions.exportState,
    onImport: actions.importState,
    onMoveMonth: actions.moveMonth,
    onUpsertTrainingPlan: actions.upsertTrainingPlan,
  };
}

/**
 * 履歴/計画画面。カレンダー・部位別履歴・分割計画の管理とデータ入出力を行う
 */
export function HistoryScreen() {
  const {
    selectedDate,
    workouts,
    trainingDays,
    trainingPlans,
    orderedParts,
    partColors,
    partFilter,
    onPartFilter,
    onSelectDate,
    onExport,
    onImport,
    onMoveMonth,
    onUpsertTrainingPlan,
    onEditParts,
  } = useHistoryScreenModel();
  const [activeView, setActiveView] = useState<'history' | 'plan'>('history');
  const [menuOpen, setMenuOpen] = useState(false);
  const monthDate = parseDate(selectedDate);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const partTabs = ['ALL', ...orderedParts.map((part) => part.name)];
  const planParts = orderedParts.map((part) => part.name).filter((part) => part !== 'レスト');
  const trainingDayByDate = new Map(trainingDays.map((day) => [day.date, day.parts]));
  const visibleHistory = buildVisibleHistory(workouts, trainingDays, partFilter);
  const trainedDates = new Set(visibleHistory.map((day) => day.date));
  const cells = calendarCells(year, month);
  const currentPartLabel = partFilter === 'ALL' ? 'すべて' : partFilter;
  const today = localDate(new Date());
  const importInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * 隠しファイル入力をクリックしてインポート用のファイル選択を開く
   */
  function openImport() {
    setMenuOpen(false);
    importInputRef.current?.click();
  }

  /**
   * 選択されたファイルを読み込み、インポート処理へ渡す
   */
  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMenuOpen(false);
    await onImport(file);
  }

  return (
    <section className="screen active history-screen">
      <header className="topbar">
        <div className="bar-row">
          <span />
          <div className="bar-title">履歴 / 計画</div>
          <div className="history-menu-wrap">
            <button
              className="bar-btn right"
              type="button"
              aria-label="設定"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <SettingsIcon />
            </button>
            {menuOpen && (
              <div className="history-menu" role="menu" aria-label="データ設定">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onExport();
                  }}
                >
                  <ExportIcon />
                  <span>記録を書き出す</span>
                </button>
                <button type="button" role="menuitem" onClick={openImport}>
                  <ImportIcon />
                  <span>記録を読み込む</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onEditParts();
                  }}
                >
                  <PartsIcon />
                  <span>部位を編集</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="history-wrap">
        <input
          ref={importInputRef}
          hidden
          accept="application/json,.json"
          type="file"
          onChange={(event) => void handleImport(event)}
        />
        <div className="history-mode" aria-label="履歴と計画を切り替え">
          <button
            className={activeView === 'history' ? 'active' : ''}
            type="button"
            onClick={() => setActiveView('history')}
          >
            履歴
          </button>
          <button
            className={activeView === 'plan' ? 'active' : ''}
            type="button"
            onClick={() => setActiveView('plan')}
          >
            計画
          </button>
        </div>
        {activeView === 'history' ? (
          <>
            <div className="muscle-tabs" aria-label="部位フィルター">
              {partTabs.map((part) => {
                const color = partColors.get(part);
                const isActive = partFilter === part;
                /**
                 * 文字色は常に白。選択中はその部位の色を背景にする
                 */
                const style = isActive && color ? { background: color } : undefined;
                return (
                  <button
                    className={`muscle-tab ${isActive ? 'active' : ''}`}
                    key={part}
                    type="button"
                    style={style}
                    onClick={() => onPartFilter(part)}
                  >
                    {part}
                  </button>
                );
              })}
            </div>
            <div className="calendar-head">
              <button className="month-btn" type="button" onClick={() => onMoveMonth(-1)}>
                {prevMonthLabel(year, month)}
              </button>
              <div className="calendar-month">
                {year}年 {String(month + 1).padStart(2, '0')}月
              </div>
              <button className="month-btn" type="button" onClick={() => onMoveMonth(1)}>
                {nextMonthLabel(year, month)}
              </button>
            </div>
            <div className="calendar-grid">
              {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                <div className="weekday" key={day}>
                  {day}
                </div>
              ))}
              {cells.map((cell) => {
                const trained = trainedDates.has(cell.date);
                const isToday = cell.date === today;
                const trainingParts = trainingDayByDate.get(cell.date);
                const plannedParts = plannedPartsForDate(cell.date, trainingPlans);
                const plannedColor = plannedParts
                  .map((part) => partColors.get(part))
                  .find((color): color is string => Boolean(color));
                /**
                 * 計画で予定された日は、未実施・本日でなければ部位色の薄い円で示す
                 */
                const plannedStyle =
                  !trained && !isToday && plannedColor
                    ? { background: hexToRgba(plannedColor, 0.2) }
                    : undefined;
                return (
                  <div className={`day-cell ${cell.inMonth ? '' : 'other'}`} key={cell.date}>
                    <button
                      className={`day-btn ${trained ? 'trained' : ''} ${isToday ? 'today' : ''} ${
                        plannedStyle ? 'planned' : ''
                      }`}
                      type="button"
                      style={plannedStyle}
                      title={trainingParts?.join(' / ') || plannedParts.join(' / ') || undefined}
                      onClick={() => onSelectDate(cell.date)}
                    >
                      {cell.day}
                    </button>
                  </div>
                );
              })}
            </div>
            <section className="part-history">
              <h2>{currentPartLabel}の履歴</h2>
              {!visibleHistory.length ? (
                <div className="part-history-empty">履歴はありません</div>
              ) : (
                <div className="part-history-list">
                  {visibleHistory.map((day) => (
                    <button
                      className="part-history-row"
                      key={day.date}
                      type="button"
                      onClick={() => onSelectDate(day.date)}
                    >
                      <span className="part-history-date">{day.date.replaceAll('-', '/')}</span>
                      <span className="part-history-part">
                        {day.parts.length ? day.parts.join(' / ') : '部位未設定'}
                      </span>
                      <span className="part-history-detail">
                        {day.workoutNames.length ? day.workoutNames.join('、') : 'トレーニングなし'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="schedule-panel">
            <h2>分割計画</h2>
            <p className="schedule-desc">
              部位ごとにトレーニングする曜日や間隔を決めると、予定としてカレンダーやホームに表示されます。
            </p>
            {!planParts.length ? (
              <div className="schedule-empty">部位がありません</div>
            ) : (
              <div className="schedule-list">
                {planParts.map((part) => (
                  <PlanRow
                    key={part}
                    part={part}
                    color={partColors.get(part)}
                    plan={trainingPlans.find((plan) => plan.part === part)}
                    fallbackStartDate={selectedDate}
                    onChange={onUpsertTrainingPlan}
                  />
                ))}
              </div>
            )}
            <div className="schedule-preview">
              <strong className="schedule-preview-title">今後7日の予定</strong>
              <div className="schedule-preview-list">
                {buildUpcomingPlans(selectedDate, trainingPlans).map((item) => (
                  <span className="schedule-preview-item" key={item.date}>
                    <span className="schedule-preview-date">
                      {item.date.slice(5).replace('-', '/')}（{weekdays[parseDate(item.date).getDay()]}）
                    </span>
                    <span className="schedule-preview-parts">
                      {item.parts.length ? item.parts.join(' / ') : '-'}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

type PlanRowProps = {
  part: string;
  color: string | undefined;
  plan: TrainingPlan | undefined;
  fallbackStartDate: string;
  onChange: (
    part: string,
    mode: TrainingPlanMode,
    weekdays: number[],
    intervalDays: number,
    startDate: string,
  ) => void;
};

/**
 * 部位ごとの分割計画をその場で編集する行。
 * モード切替・曜日トグル・間隔/開始日の変更があるたびに onChange で保存する
 */
function PlanRow({ part, color, plan, fallbackStartDate, onChange }: PlanRowProps) {
  const mode: TrainingPlanMode = plan?.mode ?? 'weekly';
  const planWeekdays = plan?.weekdays ?? [];
  const intervalDays = plan?.intervalDays ?? 3;
  const startDate = plan?.startDate || fallbackStartDate;
  const [intervalText, setIntervalText] = useState(String(intervalDays));

  useEffect(() => {
    setIntervalText(String(intervalDays));
  }, [intervalDays]);

  /**
   * 曜日ボタンの選択状態をトグルして保存する
   */
  function toggleWeekday(index: number) {
    const next = planWeekdays.includes(index)
      ? planWeekdays.filter((value) => value !== index)
      : [...planWeekdays, index].sort((a, b) => a - b);
    onChange(part, 'weekly', next, intervalDays, startDate);
  }

  /**
   * 間隔の入力を反映する。数値として有効なときだけ保存する
   */
  function commitInterval(text: string) {
    setIntervalText(text);
    const value = Number(text);
    if (Number.isFinite(value) && value >= 1) {
      onChange(part, 'interval', planWeekdays, Math.round(value), startDate);
    }
  }

  return (
    <div className="plan-row" style={color ? { borderLeftColor: color } : undefined}>
      <div className="plan-row-head">
        <strong>{part}</strong>
        <div className="plan-mode-toggle" role="group" aria-label={`${part}の計画タイプ`}>
          <button
            className={mode === 'weekly' ? 'active' : ''}
            type="button"
            onClick={() => onChange(part, 'weekly', planWeekdays, intervalDays, startDate)}
          >
            曜日
          </button>
          <button
            className={mode === 'interval' ? 'active' : ''}
            type="button"
            onClick={() => onChange(part, 'interval', planWeekdays, intervalDays, startDate)}
          >
            何日ごと
          </button>
        </div>
      </div>
      {mode === 'weekly' ? (
        <div className="weekday-picker" aria-label={`${part}の曜日`}>
          {weekdays.map((day, index) => (
            <button
              className={planWeekdays.includes(index) ? 'active' : ''}
              key={day}
              type="button"
              onClick={() => toggleWeekday(index)}
            >
              {day}
            </button>
          ))}
        </div>
      ) : (
        <div className="interval-fields">
          <label>
            <span>間隔</span>
            <input
              inputMode="numeric"
              min="1"
              type="number"
              value={intervalText}
              onChange={(event) => commitInterval(event.target.value)}
            />
          </label>
          <label>
            <span>開始日</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                onChange(part, 'interval', planWeekdays, intervalDays, event.target.value)
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * ワークアウトとトレーニング日を日付ごとにまとめ、部位フィルターを適用した履歴を作る
 */
function buildVisibleHistory(workouts: Workout[], trainingDays: TrainingDay[], partFilter: string) {
  const byDate = new Map<string, { date: string; parts: Set<string>; workoutNames: string[] }>();
  trainingDays.forEach((day) => {
    byDate.set(day.date, { date: day.date, parts: new Set(day.parts), workoutNames: [] });
  });
  workouts.forEach((workout) => {
    const item = byDate.get(workout.date) || {
      date: workout.date,
      parts: new Set<string>(),
      workoutNames: [],
    };
    item.workoutNames.push(workout.name);
    item.parts.add(workout.part);
    byDate.set(workout.date, item);
  });
  return [...byDate.values()]
    .filter((day) => partFilter === 'ALL' || day.parts.has(partFilter))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((day) => ({ ...day, parts: [...day.parts] }));
}

/**
 * 選択日から7日分の予定部位を組み立てる
 */
function buildUpcomingPlans(selectedDate: string, trainingPlans: TrainingPlan[]) {
  const start = parseDate(selectedDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const value = localDate(date);
    return { date: value, parts: plannedPartsForDate(value, trainingPlans) };
  });
}

/**
 * 部位色の HEX(#rrggbb) を指定した不透明度の rgba 文字列へ変換する。
 * 解釈できない値はそのまま返す
 */
function hexToRgba(hex: string, alpha: number) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 指定日に計画で予定されている部位を求める(曜日指定・間隔指定の両方に対応)
 */
function plannedPartsForDate(date: string, trainingPlans: TrainingPlan[]) {
  const target = parseDate(date);
  const weekday = target.getDay();
  return [
    ...new Set(
      trainingPlans.flatMap((plan) => {
        if (plan.mode === 'weekly') return plan.weekdays.includes(weekday) ? [plan.part] : [];
        const start = plan.startDate ? parseDate(plan.startDate) : target;
        const days = Math.floor((target.getTime() - start.getTime()) / 86400000);
        return days >= 0 && days % plan.intervalDays === 0 ? [plan.part] : [];
      }),
    ),
  ];
}
