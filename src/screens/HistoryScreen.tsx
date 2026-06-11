import { ChangeEvent, useEffect, useRef, useState } from "react";
import { TrainingDay, TrainingPlan, TrainingPlanMode, Workout } from "../types";
import { calendarCells, localDate, nextMonthLabel, parseDate, prevMonthLabel } from "../utils";
import { ExportIcon, ImportIcon, SettingsIcon } from "../icons";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 履歴/計画画面。カレンダー・部位別履歴・分割計画の管理とデータ入出力を行う
 */
export function HistoryScreen({ selectedDate, workouts, trainingDays, trainingPlans, splitPartOptions, partFilter, onPartFilter, onSelectDate, onExport, onImport, onMoveMonth, onAddTrainingPlan, onDeleteTrainingPlan }: {
  selectedDate: string;
  workouts: Workout[];
  trainingDays: TrainingDay[];
  trainingPlans: TrainingPlan[];
  splitPartOptions: string[];
  partFilter: string;
  onPartFilter: (part: string) => void;
  onSelectDate: (date: string) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onMoveMonth: (delta: number) => void;
  onAddTrainingPlan: (part: string, mode: TrainingPlanMode, weekdays: number[], intervalDays: number, startDate: string) => void;
  onDeleteTrainingPlan: (planId: string) => void;
}) {
  const [activeView, setActiveView] = useState<"history" | "plan">("history");
  const [menuOpen, setMenuOpen] = useState(false);
  const [planPart, setPlanPart] = useState(splitPartOptions[0] || "");
  const [planMode, setPlanMode] = useState<TrainingPlanMode>("weekly");
  const [planWeekdays, setPlanWeekdays] = useState<number[]>([]);
  const [planIntervalDays, setPlanIntervalDays] = useState("3");
  const [planStartDate, setPlanStartDate] = useState(selectedDate);
  const monthDate = parseDate(selectedDate);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const partTabs = ["ALL", ...splitPartOptions.filter((part) => part !== "レスト")];
  const planParts = [...new Set(splitPartOptions.filter((part) => part !== "レスト"))];
  const trainingDayByDate = new Map(trainingDays.map((day) => [day.date, day.parts]));
  const visibleHistory = buildVisibleHistory(workouts, trainingDays, partFilter);
  const trainedDates = new Set(visibleHistory.map((day) => day.date));
  const cells = calendarCells(year, month);
  const currentPartLabel = partFilter === "ALL" ? "すべて" : partFilter;
  const selectedPlan = trainingPlans.find((plan) => plan.part === planPart);
  const today = localDate(new Date());
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    applyPlanToForm(planPart);
  }, [planPart, selectedDate, trainingPlans]);

  /**
   * 部位を選択し、その計画内容をフォームへ読み込む
   */
  function loadPlan(part: string) {
    setPlanPart(part);
    applyPlanToForm(part);
  }

  /**
   * 指定部位の既存計画をフォームへ反映する。なければ既定値に戻す
   */
  function applyPlanToForm(part: string) {
    const plan = trainingPlans.find((item) => item.part === part);
    if (!plan) {
      setPlanMode("weekly");
      setPlanWeekdays([]);
      setPlanIntervalDays("3");
      setPlanStartDate(selectedDate);
      return;
    }
    setPlanMode(plan.mode);
    setPlanWeekdays(plan.weekdays);
    setPlanIntervalDays(String(plan.intervalDays));
    setPlanStartDate(plan.startDate || selectedDate);
  }

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
    event.target.value = "";
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
            <button className="bar-btn right" type="button" aria-label="設定" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              <SettingsIcon />
            </button>
            {menuOpen && (
              <div className="history-menu" role="menu" aria-label="データ設定">
                <button type="button" role="menuitem" onClick={() => {
                  setMenuOpen(false);
                  onExport();
                }}><ExportIcon /><span>記録を書き出す</span></button>
                <button type="button" role="menuitem" onClick={openImport}><ImportIcon /><span>記録を読み込む</span></button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="history-wrap">
        <input ref={importInputRef} hidden accept="application/json,.json" type="file" onChange={handleImport} />
        <div className="history-mode" aria-label="履歴と計画を切り替え">
          <button className={activeView === "history" ? "active" : ""} type="button" onClick={() => setActiveView("history")}>履歴</button>
          <button className={activeView === "plan" ? "active" : ""} type="button" onClick={() => setActiveView("plan")}>計画</button>
        </div>
        {activeView === "history" ? (
          <>
            <div className="muscle-tabs" aria-label="部位フィルター">{partTabs.map((part) => <button className={`muscle-tab ${partFilter === part ? "active" : ""}`} key={part} type="button" onClick={() => onPartFilter(part)}>{part}</button>)}</div>
            <div className="calendar-head"><button className="month-btn" type="button" onClick={() => onMoveMonth(-1)}>{prevMonthLabel(year, month)}</button><div className="calendar-month">{year}年 {String(month + 1).padStart(2, "0")}月</div><button className="month-btn" type="button" onClick={() => onMoveMonth(1)}>{nextMonthLabel(year, month)}</button></div>
            <div className="calendar-grid">
              {["日", "月", "火", "水", "木", "金", "土"].map((day) => <div className="weekday" key={day}>{day}</div>)}
              {cells.map((cell) => {
                const trained = trainedDates.has(cell.date);
                const isToday = cell.date === today;
                const trainingParts = trainingDayByDate.get(cell.date);
                return <div className={`day-cell ${cell.inMonth ? "" : "other"}`} key={cell.date}><button className={`day-btn ${trained ? "trained" : ""} ${isToday ? "today" : ""}`} type="button" title={trainingParts?.join(" / ") || undefined} onClick={() => onSelectDate(cell.date)}>{cell.day}</button></div>;
              })}
            </div>
            <section className="part-history">
              <h2>{currentPartLabel}の履歴</h2>
              {!visibleHistory.length ? (
                <div className="part-history-empty">履歴はありません</div>
              ) : (
                <div className="part-history-list">
                  {visibleHistory.map((day) => (
                    <button className="part-history-row" key={day.date} type="button" onClick={() => onSelectDate(day.date)}>
                      <span className="part-history-date">{day.date.replaceAll("-", "/")}</span>
                      <span className="part-history-part">{day.parts.length ? day.parts.join(" / ") : "部位未設定"}</span>
                      <span className="part-history-detail">{day.workoutNames.length ? day.workoutNames.join("、") : "トレーニングなし"}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="schedule-panel">
            <h2>分割計画</h2>
            <form className="schedule-form" onSubmit={(event) => {
              event.preventDefault();
              onAddTrainingPlan(planPart, planMode, planWeekdays, Number(planIntervalDays), planStartDate);
            }}>
              <select aria-label="計画する部位" value={planPart} onChange={(event) => loadPlan(event.target.value)}>
                <option value="">未選択</option>
                {planParts.map((part) => <option key={part} value={part}>{part}</option>)}
              </select>
              <select aria-label="計画タイプ" value={planMode} onChange={(event) => setPlanMode(event.target.value as TrainingPlanMode)}>
                <option value="weekly">曜日</option>
                <option value="interval">何日ごと</option>
              </select>
              {planMode === "weekly" ? (
                <div className="weekday-picker" aria-label="曜日を選択">
                  {weekdays.map((day, index) => (
                    <button
                      className={planWeekdays.includes(index) ? "active" : ""}
                      key={day}
                      type="button"
                      onClick={() => setPlanWeekdays((prev) => prev.includes(index) ? prev.filter((value) => value !== index) : [...prev, index].sort())}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="interval-fields">
                  <label><span>間隔</span><input inputMode="numeric" min="1" type="number" value={planIntervalDays} onChange={(event) => setPlanIntervalDays(event.target.value)} /></label>
                  <label><span>開始日</span><input type="date" value={planStartDate} onChange={(event) => setPlanStartDate(event.target.value)} /></label>
                </div>
              )}
              <button className="small-primary" type="submit">{selectedPlan ? "更新" : "追加"}</button>
            </form>
            {!trainingPlans.length ? (
              <div className="schedule-empty">計画はありません</div>
            ) : (
              <div className="schedule-list">
                {trainingPlans.map((plan) => (
                  <div className="schedule-row" key={plan.id}>
                    <div>
                      <button className="schedule-row-main" type="button" onClick={() => loadPlan(plan.part)}>
                        <strong>{plan.part}</strong>
                        <span>{formatPlan(plan)}</span>
                      </button>
                    </div>
                    <button type="button" onClick={() => onDeleteTrainingPlan(plan.id)}>削除</button>
                  </div>
                ))}
              </div>
            )}
            <div className="schedule-preview">
              <strong>今後7日</strong>
              {buildUpcomingPlans(selectedDate, trainingPlans).map((item) => (
                <span key={item.date}>{item.date.slice(5).replace("-", "/")} {item.parts.length ? item.parts.join(" / ") : "-"}</span>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
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
    const item = byDate.get(workout.date) || { date: workout.date, parts: new Set<string>(), workoutNames: [] };
    item.workoutNames.push(workout.name);
    item.parts.add(workout.part);
    byDate.set(workout.date, item);
  });
  return [...byDate.values()]
    .filter((day) => partFilter === "ALL" || day.parts.has(partFilter))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((day) => ({ ...day, parts: [...day.parts] }));
}

/**
 * 計画の内容を表示用の文字列(曜日や間隔)に整形する
 */
function formatPlan(plan: TrainingPlan) {
  if (plan.mode === "weekly") return `${plan.weekdays.map((day) => weekdays[day]).join("・")}曜日`;
  return `${plan.startDate.replaceAll("-", "/")}から${plan.intervalDays}日ごと`;
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
 * 指定日に計画で予定されている部位を求める(曜日指定・間隔指定の両方に対応)
 */
function plannedPartsForDate(date: string, trainingPlans: TrainingPlan[]) {
  const target = parseDate(date);
  const weekday = target.getDay();
  return [...new Set(trainingPlans.flatMap((plan) => {
    if (plan.mode === "weekly") return plan.weekdays.includes(weekday) ? [plan.part] : [];
    const start = plan.startDate ? parseDate(plan.startDate) : target;
    const days = Math.floor((target.getTime() - start.getTime()) / 86400000);
    return days >= 0 && days % plan.intervalDays === 0 ? [plan.part] : [];
  }))];
}
