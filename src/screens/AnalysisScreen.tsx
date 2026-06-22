import { useMemo, useState } from 'react';
import { AnalysisIcon, ChevronLeft } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { buildExerciseCounts, buildPartCounts } from '../selectors/fitLogSelectors';

/**
 * 保存済みの記録を種目別に集計して表示する分析画面
 */
export function AnalysisScreen() {
  const { state, partColors, actions } = useFitLogContext();
  const [activeView, setActiveView] = useState<'exercise' | 'part'>('exercise');
  const exerciseCounts = useMemo(() => buildExerciseCounts(state.workouts), [state.workouts]);
  const partCounts = useMemo(() => buildPartCounts(state.workouts), [state.workouts]);
  const maxCount = exerciseCounts[0]?.count ?? 0;
  const totalCount = exerciseCounts.reduce((sum, exercise) => sum + exercise.count, 0);
  const pieGradient = useMemo(() => {
    let current = 0;
    return partCounts
      .map((item) => {
        const start = current;
        current += (item.count / totalCount) * 100;
        return `${partColors.get(item.part) ?? 'var(--red)'} ${start}% ${current}%`;
      })
      .join(', ');
  }, [partColors, partCounts, totalCount]);
  const hasData = activeView === 'exercise' ? exerciseCounts.length > 0 : partCounts.length > 0;

  return (
    <section className="screen active analysis-screen">
      <header className="topbar">
        <div className="bar-row">
          <button
            className="bar-btn"
            type="button"
            aria-label="戻る"
            onClick={() => actions.setScreen('home')}
          >
            <ChevronLeft />
          </button>
          <div className="bar-title">分析</div>
          <span />
        </div>
      </header>
      <div className="analysis-content">
        <div className="analysis-view-switch" role="tablist" aria-label="分析の表示単位">
          <button
            className={activeView === 'part' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeView === 'part'}
            onClick={() => setActiveView('part')}
          >
            部位別
          </button>
          <button
            className={activeView === 'exercise' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeView === 'exercise'}
            onClick={() => setActiveView('exercise')}
          >
            種目別
          </button>
        </div>

        <header className="analysis-heading">
          <div>
            <span>{activeView === 'exercise' ? '種目別' : '部位別'}</span>
            <h1>実施回数</h1>
          </div>
          <strong>{totalCount}回</strong>
        </header>

        {!hasData ? (
          <div className="empty analysis-empty">
            <div>
              <AnalysisIcon />
              <strong>分析できる記録はまだありません</strong>
              <span>トレーニングを記録すると、実施回数が表示されます。</span>
            </div>
          </div>
        ) : activeView === 'exercise' ? (
          <div className="exercise-chart" aria-label="種目別の実施回数">
            {exerciseCounts.map((exercise) => (
              <div className="exercise-chart-row" key={exercise.exerciseId}>
                <div className="exercise-chart-label">
                  <span>
                    <small>{exercise.part}</small>
                    {exercise.name}
                  </span>
                  <strong>{exercise.count}回</strong>
                </div>
                <div
                  className="exercise-chart-track"
                  role="img"
                  aria-label={`${exercise.part} ${exercise.name} ${exercise.count}回`}
                >
                  <span
                    style={{
                      width: `${(exercise.count / maxCount) * 100}%`,
                      backgroundColor: partColors.get(exercise.part) ?? 'var(--red)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="part-chart-card">
            <div
              className="part-pie-chart"
              role="img"
              aria-label={partCounts.map((item) => `${item.part} ${item.count}回`).join('、')}
              style={{ background: `conic-gradient(${pieGradient})` }}
            >
              <div className="part-pie-center">
                <strong>{totalCount}</strong>
                <span>合計回数</span>
              </div>
            </div>
            <div className="part-chart-legend">
              {partCounts.map((item) => (
                <div className="part-chart-legend-row" key={item.part}>
                  <span
                    className="part-chart-color"
                    style={{ backgroundColor: partColors.get(item.part) ?? 'var(--red)' }}
                  />
                  <span className="part-chart-name">{item.part}</span>
                  <strong>{item.count}回</strong>
                  <small>{Math.round((item.count / totalCount) * 100)}%</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
