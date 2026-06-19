import { ChevronLeft, TrophyIcon } from '../icons';
import { ExerciseGoalAchievement } from '../types';
import { formatWeight, measurementUnit, weightUnitLabel } from '../utils';
import { useFitLogContext } from '../hooks/FitLogContext';

/**
 * 目標達成記録画面が必要とするデータと操作を Context から組み立てる
 */
function useGoalAchievementScreenModel() {
  const { state, actions } = useFitLogContext();
  return {
    achievements: state.goalAchievements,
    weightUnit: state.weightUnit,
    onBack: () => actions.setScreen('home'),
  };
}

/**
 * 種目ごとに目標達成日と実際の達成セットを一覧表示する画面
 */
export function GoalAchievementScreen() {
  const { achievements, weightUnit, onBack } = useGoalAchievementScreenModel();
  const groups = groupAchievements(achievements);

  return (
    <section className="screen active goal-achievement-screen">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>
            <ChevronLeft />
          </button>
          <div className="bar-title">目標達成記録</div>
          <span />
        </div>
      </header>
      <div className="goal-history-content">
        {!groups.length ? (
          <div className="empty">
            <div>
              <TrophyIcon />
              <strong>目標達成記録はまだありません</strong>
              <span>種目の目標を達成すると、ここに記録されます。</span>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <section className="goal-history-group" key={group.key}>
              <header className="goal-history-heading">
                <TrophyIcon />
                <div>
                  <h2>{group.exerciseName}</h2>
                  <span>{group.records.length}回達成</span>
                </div>
              </header>
              <div className="goal-history-list">
                {group.records.map((record) => (
                  <article className="goal-history-row" key={record.id}>
                    <time dateTime={record.date}>{record.date.replaceAll('-', '/')}</time>
                    <div className="goal-history-result">
                      <strong>
                        {formatWeight(record.weight, weightUnit)}
                        <small>{weightUnitLabel(weightUnit)}</small>
                      </strong>
                      <span>×</span>
                      <strong>
                        {record.recordValue}
                        <small>{measurementUnit(record.measurementType)}</small>
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

/**
 * 達成記録を種目単位でまとめ、各種目内は新しい日付順にする
 */
function groupAchievements(achievements: ExerciseGoalAchievement[]) {
  const groups = new Map<
    string,
    {
      key: string;
      exerciseName: string;
      records: ExerciseGoalAchievement[];
    }
  >();
  [...achievements]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((achievement) => {
      const key = achievement.exerciseId || achievement.exerciseName;
      const group = groups.get(key);
      if (group) {
        group.records.push(achievement);
        return;
      }
      groups.set(key, {
        key,
        exerciseName: achievement.exerciseName,
        records: [achievement],
      });
    });
  return [...groups.values()];
}
