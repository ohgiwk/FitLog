import { useEffect, useMemo, useState } from 'react';
import { AnalysisIcon, ChevronLeft } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';
import {
  ExerciseGrowthMetric,
  ExerciseGrowthSeries,
  buildExerciseCounts,
  buildExerciseBestRecords,
  buildExerciseGrowthSeries,
  buildPartCounts,
  buildWeeklyVolumeSeries,
} from '../selectors/fitLogSelectors';
import { formatWeight, weightUnitLabel } from '../utils';

type AnalysisPage = 'menu' | 'growth' | 'volume' | 'bests' | 'counts';

/**
 * 保存済みの記録を成長グラフと実施回数で表示する分析画面
 */
export function AnalysisScreen() {
  const { state, partColors, actions } = useFitLogContext();
  const [activePage, setActivePage] = useState<AnalysisPage>('menu');
  const [activeView, setActiveView] = useState<'exercise' | 'part'>('exercise');
  const [selectedPart, setSelectedPart] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const exerciseCounts = useMemo(() => buildExerciseCounts(state.workouts), [state.workouts]);
  const partCounts = useMemo(() => buildPartCounts(state.workouts), [state.workouts]);
  const growthSeries = useMemo(() => buildExerciseGrowthSeries(state.workouts), [state.workouts]);
  const weeklyVolumeSeries = useMemo(
    () => buildWeeklyVolumeSeries(state.workouts),
    [state.workouts],
  );
  const bestRecords = useMemo(() => buildExerciseBestRecords(state.workouts), [state.workouts]);
  const growthParts = useMemo(
    () => [...new Set(growthSeries.map((series) => series.part))],
    [growthSeries],
  );
  const selectedPartSeries = useMemo(
    () => growthSeries.filter((series) => series.part === selectedPart),
    [growthSeries, selectedPart],
  );
  const selectedSeries = selectedPartSeries.find(
    (series) => series.exerciseId === selectedExerciseId,
  );
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

  useEffect(() => {
    if (!growthParts.length) {
      setSelectedPart('');
      return;
    }
    if (!selectedPart || !growthParts.includes(selectedPart)) {
      setSelectedPart(growthParts[0]);
    }
  }, [growthParts, selectedPart]);

  useEffect(() => {
    if (!selectedPartSeries.length) {
      setSelectedExerciseId('');
      return;
    }
    if (
      !selectedExerciseId ||
      !selectedPartSeries.some((series) => series.exerciseId === selectedExerciseId)
    ) {
      setSelectedExerciseId(selectedPartSeries[0].exerciseId);
    }
  }, [selectedExerciseId, selectedPartSeries]);

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
        {activePage === 'menu' ? (
          <div className="analysis-page-list" aria-label="分析メニュー">
            <button type="button" onClick={() => setActivePage('growth')}>
              <span>成長グラフ</span>
            </button>
            <button type="button" onClick={() => setActivePage('volume')}>
              <span>総ボリューム</span>
            </button>
            <button type="button" onClick={() => setActivePage('bests')}>
              <span>自己ベスト</span>
            </button>
            <button type="button" onClick={() => setActivePage('counts')}>
              <span>実施回数</span>
            </button>
          </div>
        ) : (
          <>
            <button
              className="analysis-back-link"
              type="button"
              onClick={() => setActivePage('menu')}
            >
              分析メニューへ
            </button>

            {activePage === 'growth' ? (
              <GrowthGraphView
                partColors={partColors}
                parts={growthParts}
                selectedExerciseId={selectedExerciseId}
                selectedPart={selectedPart}
                selectedSeries={selectedSeries}
                seriesList={selectedPartSeries}
                weightUnit={state.weightUnit}
                onSelectExercise={setSelectedExerciseId}
                onSelectPart={setSelectedPart}
              />
            ) : activePage === 'volume' ? (
              <VolumeView series={weeklyVolumeSeries} weightUnit={state.weightUnit} />
            ) : activePage === 'bests' ? (
              <BestRecordsView records={bestRecords} weightUnit={state.weightUnit} />
            ) : (
              <CountView
                activeView={activeView}
                exerciseCounts={exerciseCounts}
                hasData={hasData}
                maxCount={maxCount}
                partColors={partColors}
                partCounts={partCounts}
                pieGradient={pieGradient}
                totalCount={totalCount}
                onChangeView={setActiveView}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function VolumeView({
  series,
  weightUnit,
}: {
  series: ReturnType<typeof buildWeeklyVolumeSeries>;
  weightUnit: 'kg' | 'lbs';
}) {
  const latest = series[series.length - 1];
  const totalVolume = series.reduce((sum, point) => sum + point.value, 0);

  return (
    <>
      <header className="analysis-heading">
        <div>
          <span>週ごと</span>
          <h1>総ボリューム</h1>
        </div>
        {latest ? (
          <strong>
            {formatWeight(latest.value, weightUnit)}
            {weightUnitLabel(weightUnit)}
          </strong>
        ) : null}
      </header>

      {!series.length ? (
        <div className="empty analysis-empty">
          <div>
            <AnalysisIcon />
            <strong>表示できる総ボリュームはまだありません</strong>
            <span>重量と回数を記録すると、週ごとの負荷量が表示されます。</span>
          </div>
        </div>
      ) : (
        <>
          <div className="growth-chart-card">
            <div className="growth-chart-title">
              <strong>週次ボリューム</strong>
              <span>
                合計 {formatWeight(totalVolume, weightUnit)}
                {weightUnitLabel(weightUnit)}
              </span>
            </div>
            <VolumeChart series={series} weightUnit={weightUnit} />
          </div>
          <div className="volume-list" aria-label="週ごとの総ボリューム">
            {series.map((point) => (
              <div className="volume-row" key={point.weekStart}>
                <span>{formatWeekRange(point.weekStart, point.weekEnd)}</span>
                <strong>
                  {formatWeight(point.value, weightUnit)}
                  <small>{weightUnitLabel(weightUnit)}</small>
                </strong>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function BestRecordsView({
  records,
  weightUnit,
}: {
  records: ReturnType<typeof buildExerciseBestRecords>;
  weightUnit: 'kg' | 'lbs';
}) {
  return (
    <>
      <header className="analysis-heading">
        <div>
          <span>全種目</span>
          <h1>自己ベスト</h1>
        </div>
        {records.length ? <strong>{records.length}種目</strong> : null}
      </header>

      {!records.length ? (
        <div className="empty analysis-empty">
          <div>
            <AnalysisIcon />
            <strong>表示できる自己ベストはまだありません</strong>
            <span>トレーニングを記録すると、種目ごとの最高記録が表示されます。</span>
          </div>
        </div>
      ) : (
        <div className="best-record-list" aria-label="自己ベスト一覧">
          {records.map((record) => (
            <article className="best-record-card" key={record.exerciseId}>
              <header>
                <div>
                  <span>{record.part}</span>
                  <strong>{record.name}</strong>
                </div>
                <small>{formatShortDate(record.date)}</small>
              </header>
              <div className="best-record-main">
                <span>{record.mainLabel}</span>
                <strong>
                  {formatBestValue(record.mainValue, record.measurementType, weightUnit)}
                </strong>
              </div>
              <div className="best-record-subgrid">
                {record.subRecords.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{formatSubRecordValue(item.value, item.unit, weightUnit)}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function CountView({
  activeView,
  exerciseCounts,
  hasData,
  maxCount,
  partColors,
  partCounts,
  pieGradient,
  totalCount,
  onChangeView,
}: {
  activeView: 'exercise' | 'part';
  exerciseCounts: ReturnType<typeof buildExerciseCounts>;
  hasData: boolean;
  maxCount: number;
  partColors: Map<string, string>;
  partCounts: ReturnType<typeof buildPartCounts>;
  pieGradient: string;
  totalCount: number;
  onChangeView: (view: 'exercise' | 'part') => void;
}) {
  return (
    <>
      <div className="analysis-view-switch" role="tablist" aria-label="分析の表示単位">
        <button
          className={activeView === 'part' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={activeView === 'part'}
          onClick={() => onChangeView('part')}
        >
          部位別
        </button>
        <button
          className={activeView === 'exercise' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={activeView === 'exercise'}
          onClick={() => onChangeView('exercise')}
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
    </>
  );
}

function GrowthGraphView({
  partColors,
  parts,
  selectedExerciseId,
  selectedPart,
  selectedSeries,
  seriesList,
  weightUnit,
  onSelectExercise,
  onSelectPart,
}: {
  partColors: Map<string, string>;
  parts: string[];
  selectedExerciseId: string;
  selectedPart: string;
  selectedSeries?: ExerciseGrowthSeries;
  seriesList: ExerciseGrowthSeries[];
  weightUnit: 'kg' | 'lbs';
  onSelectExercise: (exerciseId: string) => void;
  onSelectPart: (part: string) => void;
}) {
  const color = selectedSeries
    ? (partColors.get(selectedSeries.part) ?? 'var(--red)')
    : 'var(--red)';
  const unit = selectedSeries ? growthMetricUnit(selectedSeries.metric, weightUnit) : '';
  const latestPoint = selectedSeries
    ? selectedSeries.points[selectedSeries.points.length - 1]
    : undefined;

  return (
    <>
      <header className="analysis-heading">
        <div>
          <span>{selectedSeries ? selectedSeries.part : '記録なし'}</span>
          <h1>成長グラフ</h1>
        </div>
        {latestPoint && selectedSeries ? (
          <strong>{formatGrowthValue(latestPoint.value, selectedSeries.metric, weightUnit)}</strong>
        ) : null}
      </header>

      {!selectedSeries ? (
        <div className="empty analysis-empty">
          <div>
            <AnalysisIcon />
            <strong>表示できる成長記録はまだありません</strong>
            <span>トレーニングを記録すると、種目ごとの推移が表示されます。</span>
          </div>
        </div>
      ) : (
        <div className="growth-chart-card">
          <div className="growth-chart-title">
            <strong>{selectedSeries.name}</strong>
            <span>{growthMetricLabel(selectedSeries.metric)}</span>
          </div>
          <GrowthChart series={selectedSeries} color={color} unit={unit} weightUnit={weightUnit} />
        </div>
      )}

      <div className="growth-switch-area">
        <div className="growth-switch" role="tablist" aria-label="部位">
          {parts.map((part) => (
            <button
              className={part === selectedPart ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={part === selectedPart}
              key={part}
              onClick={() => onSelectPart(part)}
            >
              {part}
            </button>
          ))}
        </div>
        <div className="growth-switch" role="tablist" aria-label="種目">
          {seriesList.map((series) => (
            <button
              className={series.exerciseId === selectedExerciseId ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={series.exerciseId === selectedExerciseId}
              key={series.exerciseId}
              onClick={() => onSelectExercise(series.exerciseId)}
            >
              {series.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function GrowthChart({
  color,
  series,
  unit,
  weightUnit,
}: {
  color: string;
  series: ExerciseGrowthSeries;
  unit: string;
  weightUnit: 'kg' | 'lbs';
}) {
  const width = 320;
  const height = 190;
  const padding = { top: 20, right: 18, bottom: 38, left: 42 };
  const values = series.points.map((point) => point.value);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const valueRange = Math.max(maxValue - minValue, 1);
  const points = series.points.map((point, index) => {
    const x =
      padding.left +
      (series.points.length === 1
        ? chartWidth / 2
        : (chartWidth * index) / (series.points.length - 1));
    const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
    return { ...point, x, y };
  });
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const ariaLabel = `${series.name} ${series.points
    .map((point) => `${point.date} ${formatGrowthValue(point.value, series.metric, weightUnit)}`)
    .join('、')}`;

  return (
    <svg
      className="growth-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
    >
      <line
        className="growth-chart-axis"
        x1={padding.left}
        x2={padding.left}
        y1={padding.top}
        y2={padding.top + chartHeight}
      />
      <line
        className="growth-chart-axis"
        x1={padding.left}
        x2={padding.left + chartWidth}
        y1={padding.top + chartHeight}
        y2={padding.top + chartHeight}
      />
      <text
        className="growth-chart-scale"
        x={padding.left - 8}
        y={padding.top + 4}
        textAnchor="end"
      >
        {formatGrowthValue(maxValue, series.metric, weightUnit)}
      </text>
      <text
        className="growth-chart-scale"
        x={padding.left - 8}
        y={padding.top + chartHeight}
        textAnchor="end"
      >
        {unit ? `0${unit}` : '0'}
      </text>
      {path ? <path className="growth-chart-line" d={path} style={{ stroke: color }} /> : null}
      {points.map((point) => (
        <g key={`${point.date}-${point.value}`}>
          <circle
            className="growth-chart-dot"
            cx={point.x}
            cy={point.y}
            r="4.5"
            style={{ fill: color }}
          />
          <text className="growth-chart-date" x={point.x} y={height - 12} textAnchor="middle">
            {formatShortDate(point.date)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function VolumeChart({
  series,
  weightUnit,
}: {
  series: ReturnType<typeof buildWeeklyVolumeSeries>;
  weightUnit: 'kg' | 'lbs';
}) {
  const width = 320;
  const height = 190;
  const padding = { top: 20, right: 18, bottom: 38, left: 52 };
  const values = series.map((point) => point.value);
  const maxValue = Math.max(...values, 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = series.map((point, index) => {
    const x =
      padding.left +
      (series.length === 1 ? chartWidth / 2 : (chartWidth * index) / (series.length - 1));
    const y = padding.top + chartHeight - (point.value / maxValue) * chartHeight;
    return { ...point, x, y };
  });
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const ariaLabel = series
    .map(
      (point) =>
        `${formatWeekRange(point.weekStart, point.weekEnd)} ${formatWeight(point.value, weightUnit)}${weightUnitLabel(weightUnit)}`,
    )
    .join('、');

  return (
    <svg
      className="growth-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
    >
      <line
        className="growth-chart-axis"
        x1={padding.left}
        x2={padding.left}
        y1={padding.top}
        y2={padding.top + chartHeight}
      />
      <line
        className="growth-chart-axis"
        x1={padding.left}
        x2={padding.left + chartWidth}
        y1={padding.top + chartHeight}
        y2={padding.top + chartHeight}
      />
      <text
        className="growth-chart-scale"
        x={padding.left - 8}
        y={padding.top + 4}
        textAnchor="end"
      >
        {formatWeight(maxValue, weightUnit)}
      </text>
      <text
        className="growth-chart-scale"
        x={padding.left - 8}
        y={padding.top + chartHeight}
        textAnchor="end"
      >
        0
      </text>
      {path ? <path className="growth-chart-line volume-chart-line" d={path} /> : null}
      {points.map((point) => (
        <g key={point.weekStart}>
          <circle className="growth-chart-dot volume-chart-dot" cx={point.x} cy={point.y} r="4.5" />
          <text className="growth-chart-date" x={point.x} y={height - 12} textAnchor="middle">
            {formatShortDate(point.weekStart)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function growthMetricLabel(metric: ExerciseGrowthMetric) {
  if (metric === 'rm') return 'MAX 1RM';
  if (metric === 'seconds') return '最長秒数';
  return '最大回数';
}

function growthMetricUnit(metric: ExerciseGrowthMetric, weightUnit: 'kg' | 'lbs') {
  if (metric === 'rm') return weightUnitLabel(weightUnit);
  if (metric === 'seconds') return '秒';
  return '回';
}

function formatGrowthValue(value: number, metric: ExerciseGrowthMetric, weightUnit: 'kg' | 'lbs') {
  if (metric === 'rm') return `${formatWeight(value, weightUnit)}${weightUnitLabel(weightUnit)}`;
  return `${Math.round(value)}${growthMetricUnit(metric, weightUnit)}`;
}

function formatBestValue(
  value: number,
  measurementType: ExerciseGrowthSeries['measurementType'],
  weightUnit: 'kg' | 'lbs',
) {
  if (measurementType === 'seconds') return `${Math.round(value)}秒`;
  return `${formatWeight(value, weightUnit)}${weightUnitLabel(weightUnit)}`;
}

function formatSubRecordValue(
  value: number,
  unit: 'weight' | 'count' | 'seconds',
  weightUnit: 'kg' | 'lbs',
) {
  if (unit === 'weight') {
    if (value <= 0) return '自重';
    return `${formatWeight(value, weightUnit)}${weightUnitLabel(weightUnit)}`;
  }
  if (unit === 'seconds') return `${Math.round(value)}秒`;
  return `${Math.round(value)}回`;
}

function formatWeekRange(start: string, end: string) {
  return `${formatShortDate(start)}-${formatShortDate(end)}`;
}

function formatShortDate(date: string) {
  const [, month = '', day = ''] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}
