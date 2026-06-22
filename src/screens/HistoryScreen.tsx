import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { Preset } from '../types';
import {
  calendarCells,
  localDate,
  nextMonthLabel,
  parseDate,
  prevMonthLabel,
  weekdayLabels,
} from '../utils';
import { EditIcon, ExportIcon, ImportIcon, PlusIcon, SettingsIcon, TrashIcon } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { buildVisibleHistory, scheduledPresetsForDate } from '../selectors/fitLogSelectors';

/**
 * 履歴/計画画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function useHistoryScreenModel() {
  const { selectedDate, state, orderedParts, partColors, historyPartFilter, historyView, actions } =
    useFitLogContext();

  return {
    selectedDate,
    workouts: state.workouts,
    trainingDays: state.trainingDays,
    presets: state.presets,
    orderedParts,
    partColors,
    partFilter: historyPartFilter,
    activeView: historyView,
    onPartFilter: actions.setHistoryPartFilter,
    onChangeView: actions.setHistoryView,
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
    onCreatePreset: actions.createPresetDraft,
    onEditPreset: actions.editPreset,
    onDeletePreset: actions.deletePreset,
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
    presets,
    orderedParts,
    partColors,
    partFilter,
    activeView,
    onPartFilter,
    onChangeView,
    onSelectDate,
    onExport,
    onImport,
    onMoveMonth,
    onCreatePreset,
    onEditPreset,
    onDeletePreset,
  } = useHistoryScreenModel();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Preset | null>(null);
  const monthDate = parseDate(selectedDate);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const partTabs = useMemo(() => ['ALL', ...orderedParts.map((part) => part.name)], [orderedParts]);
  const trainingDayByDate = useMemo(
    () => new Map(trainingDays.map((day) => [day.date, day.parts])),
    [trainingDays],
  );
  const visibleHistory = useMemo(
    () => buildVisibleHistory(workouts, trainingDays, partFilter),
    [partFilter, trainingDays, workouts],
  );
  const trainedDates = useMemo(
    () => new Set(visibleHistory.map((day) => day.date)),
    [visibleHistory],
  );
  const cells = useMemo(() => calendarCells(year, month), [month, year]);
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

  /**
   * 確認ダイアログで選んだプリセットを削除する
   */
  function confirmDeletePreset() {
    if (!deleteTarget) return;
    onDeletePreset(deleteTarget.id);
    setDeleteTarget(null);
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
            onClick={() => onChangeView('history')}
          >
            履歴
          </button>
          <button
            className={activeView === 'plan' ? 'active' : ''}
            type="button"
            onClick={() => onChangeView('plan')}
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
              {weekdayLabels.map((day) => (
                <div className="weekday" key={day}>
                  {day}
                </div>
              ))}
              {cells.map((cell) => {
                const trained = trainedDates.has(cell.date);
                const isToday = cell.date === today;
                const trainingParts = trainingDayByDate.get(cell.date);
                const plannedPresets = scheduledPresetsForDate(cell.date, presets);
                const isPlanned = !trained && !isToday && plannedPresets.length > 0;
                return (
                  <div className={`day-cell ${cell.inMonth ? '' : 'other'}`} key={cell.date}>
                    <button
                      className={`day-btn ${trained ? 'trained' : ''} ${isToday ? 'today' : ''} ${isPlanned ? 'planned' : ''}`}
                      type="button"
                      title={
                        trainingParts?.join(' / ') ||
                        plannedPresets.map((preset) => preset.name).join(' / ') ||
                        undefined
                      }
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
            <div className="schedule-panel-head">
              <h2>トレーニングメニュー</h2>
              <button
                className="small-primary schedule-add-button"
                type="button"
                onClick={onCreatePreset}
              >
                <PlusIcon />
                <span>追加</span>
              </button>
            </div>
            <p className="schedule-desc">曜日や間隔は各プリセットの編集画面で設定できます。</p>
            {!presets.length ? (
              <div className="schedule-empty">プリセットがありません</div>
            ) : (
              <div className="schedule-list">
                {presets.map((preset) => (
                  <div className="preset-plan-row" key={preset.id}>
                    <button
                      className="preset-plan-main"
                      type="button"
                      onClick={() => onEditPreset(preset.id)}
                    >
                      <span>{preset.name}</span>
                      <span className="preset-plan-meta">
                        <small>{preset.exerciseIds.length}種目</small>
                        <small>{formatPresetSchedule(preset)}</small>
                      </span>
                    </button>
                    <button
                      className="preset-plan-edit"
                      type="button"
                      aria-label={`${preset.name}を編集`}
                      onClick={() => onEditPreset(preset.id)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="preset-plan-delete"
                      type="button"
                      aria-label={`${preset.name}を削除`}
                      onClick={() => setDeleteTarget(preset)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      {deleteTarget && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-preset-delete-title"
          >
            <div id="history-preset-delete-title" className="confirm-title">
              プリセットを削除しますか？
            </div>
            <p>「{deleteTarget.name}」を削除します。この操作は元に戻せません。</p>
            <div className="confirm-actions">
              <button className="small-outline" type="button" onClick={() => setDeleteTarget(null)}>
                キャンセル
              </button>
              <button className="danger-button" type="button" onClick={confirmDeletePreset}>
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * プリセットのスケジュールを一覧向けの短い文言にする
 */
function formatPresetSchedule(preset: Preset) {
  const schedule = preset.schedule;
  if (!schedule) return '設定なし';
  if (schedule.mode === 'weekly') {
    return schedule.weekdays.length
      ? schedule.weekdays.map((weekday) => weekdayLabels[weekday]).join('・')
      : '曜日未選択';
  }
  if (!schedule.startDate) return '開始日未設定';
  return `${schedule.startDate.replaceAll('-', '/')}から${schedule.intervalDays}日ごと`;
}
