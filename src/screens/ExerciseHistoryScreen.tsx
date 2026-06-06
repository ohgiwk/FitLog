import { Workout, WorkoutSet } from "../types";
import { calcRm, number } from "../utils";

export function ExerciseHistoryScreen({ workout, workouts, onBack }: { workout: Workout; workouts: Workout[]; onBack: () => void }) {
  const histories = workouts.filter((item) => item.exerciseId === workout.exerciseId).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="screen active">
      <header className="topbar"><div className="bar-row"><button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>&lt;</button><div className="bar-title">{workout.name}</div><span /></div></header>
      <div className="exercise-history-wrap">
        {!histories.length ? (
          <div className="empty"><div><strong>この種目の履歴はまだありません</strong><span>記録するとここに日別のセット履歴が表示されます。</span></div></div>
        ) : (
          histories.map((item) => {
            const total = item.sets.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0);
            const maxRm = item.sets.reduce((max, set) => Math.max(max, Number(calcRm(number(set.weight), number(set.reps)))), 0);
            return (
              <article className="history-card" key={item.id}>
                <header className="history-card-head"><div className="history-card-date">{item.date.replaceAll("-", "/")}</div><div className="history-card-total">TOTAL : {total.toFixed(1)}Kg MAX 1RM : {maxRm.toFixed(1)}Kg</div></header>
                <table className="history-set-table">
                  <thead><tr><th>セット</th><th>重さ</th><th>回数</th><th>RM</th><th>補助</th></tr></thead>
                  <tbody>{item.sets.map((set, index) => <ExerciseHistorySetRow key={set.id} set={set} index={index} />)}</tbody>
                </table>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function ExerciseHistorySetRow({ set, index }: { set: WorkoutSet; index: number }) {
  const weight = number(set.weight);
  const reps = number(set.reps);
  return (
    <tr>
      <td className="history-num">{index + 1}</td>
      <td className="history-weight">{weight ? <>{weight.toFixed(1)}<small> kg</small></> : "自重"}</td>
      <td className="history-reps">{reps}<small> 回</small></td>
      <td className="history-rm">{weight ? `${calcRm(weight, reps)}kg` : "-"}</td>
      <td className="history-assist">-</td>
    </tr>
  );
}
