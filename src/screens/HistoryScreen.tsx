import { Workout } from "../types";
import { calendarCells, nextMonthLabel, parseDate, prevMonthLabel } from "../utils";

export function HistoryScreen({ selectedDate, workouts, onBack, onSelectDate, onMoveMonth }: {
  selectedDate: string;
  workouts: Workout[];
  onBack: () => void;
  onSelectDate: (date: string) => void;
  onMoveMonth: (delta: number) => void;
}) {
  const monthDate = parseDate(selectedDate);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const trainedDates = new Set(workouts.map((workout) => workout.date));
  const cells = calendarCells(year, month);
  return (
    <section className="screen active">
      <header className="topbar"><div className="bar-row"><button className="bar-btn" type="button" onClick={onBack}>Back</button><div className="bar-title">履歴 / 分析</div><span /></div></header>
      <div className="history-wrap">
        <div className="muscle-tabs" aria-label="部位フィルター">{["ALL", "胸", "背中", "脚", "肩", "腕", "HIIT"].map((part, index) => <button className={`muscle-tab ${index === 0 ? "active" : ""}`} key={part} type="button">{part}</button>)}</div>
        <div className="calendar-mode" aria-label="表示切替"><button className="active" type="button">カレンダー</button><button type="button">グラフ</button></div>
        <div className="calendar-head"><button className="month-btn" type="button" onClick={() => onMoveMonth(-1)}>{prevMonthLabel(year, month)}</button><div className="calendar-month">{year}年 {String(month + 1).padStart(2, "0")}月</div><button className="month-btn" type="button" onClick={() => onMoveMonth(1)}>{nextMonthLabel(year, month)}</button></div>
        <div className="calendar-grid">
          {["日", "月", "火", "水", "木", "金", "土"].map((day) => <div className="weekday" key={day}>{day}</div>)}
          {cells.map((cell) => {
            const trained = trainedDates.has(cell.date);
            const selected = trained && cell.date === selectedDate;
            return <div className={`day-cell ${cell.inMonth ? "" : "other"}`} key={cell.date}><button className={`day-btn ${trained ? "trained" : ""} ${selected ? "selected" : ""}`} type="button" onClick={() => onSelectDate(cell.date)}>{cell.day}</button></div>;
          })}
        </div>
      </div>
    </section>
  );
}
