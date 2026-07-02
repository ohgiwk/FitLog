import { WeightUnit, Workout, WorkoutSet } from '../types';
import { IntensityIcon } from '../components/IntensityIcon';
import { AnalysisIcon, ChevronLeft } from '../icons';
import {
  calcRm,
  formatWeight,
  gripLabel,
  gripStyleLabel,
  isBlank,
  isRepsMeasurement,
  measurementLabel,
  measurementUnit,
  number,
  weightUnitLabel,
} from '../utils';
import { useFitLogContext } from '../hooks/useFitLogContext';

/**
 * 種目別の履歴画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function useExerciseHistoryScreenModel() {
  const { currentWorkout, state, actions } = useFitLogContext();

  return {
    workout: currentWorkout,
    workouts: state.workouts,
    weightUnit: state.weightUnit,
    onBack: () => actions.setScreen('detail'),
    onOpenGrowthGraph: (exerciseId: string) => actions.openExerciseGrowthAnalysis(exerciseId),
  };
}

/**
 * 種目別の履歴画面。ベスト記録と日別のセット履歴を一覧表示する
 */
export function ExerciseHistoryScreen() {
  const { workout, workouts, weightUnit, onBack, onOpenGrowthGraph } =
    useExerciseHistoryScreenModel();
  if (!workout) return null;
  const histories = workouts
    .filter((item) => item.exerciseId === workout.exerciseId && item.sets.some(hasRecordedValue))
    .sort((a, b) => b.date.localeCompare(a.date));
  const bestRecord = buildBestRecord(histories, workout.measurementType, weightUnit);
  return (
    <section className="screen active">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>
            <ChevronLeft />
          </button>
          <div className="bar-title">{workout.name}</div>
          <button
            className="bar-btn right history-analysis-link"
            type="button"
            aria-label="成長グラフを開く"
            onClick={() => onOpenGrowthGraph(workout.exerciseId)}
          >
            <AnalysisIcon />
          </button>
        </div>
      </header>
      <div className="exercise-history-wrap">
        {!histories.length ? (
          <div className="empty">
            <div>
              <strong>この種目の履歴はまだありません</strong>
              <span>記録するとここに日別のセット履歴が表示されます。</span>
            </div>
          </div>
        ) : (
          <>
            {bestRecord && <BestRecordSummary bestRecord={bestRecord} />}
            {histories.map((item) => {
              const recordedSets = item.sets.filter(hasRecordedValue);
              return (
                <article className="history-card" key={item.id}>
                  <header className="history-card-head">
                    <div className="history-card-date">{item.date.replaceAll('-', '/')}</div>
                  </header>
                  {(item.grip || item.gripStyle) && (
                    <div className="history-workout-grip">
                      {item.grip && (
                        <span>
                          握りの向き <strong>{gripLabel(item.grip)}</strong>
                        </span>
                      )}
                      {item.gripStyle && (
                        <span>
                          握り方 <strong>{gripStyleLabel(item.gripStyle)}</strong>
                        </span>
                      )}
                    </div>
                  )}
                  <table className="history-set-table">
                    <thead>
                      <tr>
                        <th>セット</th>
                        <th>重さ</th>
                        <th>{measurementLabel(item.measurementType)}</th>
                        <th>RM</th>
                        <th>強度</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recordedSets.map((set, index) => (
                        <ExerciseHistorySetRow
                          key={set.id}
                          set={set}
                          index={index}
                          measurementType={item.measurementType}
                          weightUnit={weightUnit}
                        />
                      ))}
                    </tbody>
                  </table>
                </article>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}

/**
 * 重量または記録値が実際に入力されているセットかどうかを判定する
 */
function hasRecordedValue(set: WorkoutSet) {
  return !isBlank(set.weight) || !isBlank(set.recordValue)
    ? number(set.weight) > 0 || number(set.recordValue) > 0
    : false;
}

type BestRecord = {
  date: string;
  mainLabel: string;
  mainValue: string;
  subRecords: { label: string; value: string }[];
};

/**
 * ベスト記録(主要記録と関連記録)をまとめて表示するコンポーネント
 */
function BestRecordSummary({ bestRecord }: { bestRecord: BestRecord }) {
  return (
    <section className="best-record" aria-label="ベスト記録">
      <div className="best-record-label">BEST</div>
      <div className="best-record-main">
        <span>{bestRecord.mainLabel}</span>
        <strong>{bestRecord.mainValue}</strong>
        <small>{bestRecord.date.replaceAll('-', '/')}</small>
      </div>
      <div className="best-record-grid">
        {bestRecord.subRecords.map((record) => (
          <div className="best-record-chip" key={record.label}>
            <span>{record.label}</span>
            <strong>{record.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * 履歴から計測方法に応じたベスト記録(最大1RMや最長記録など)を算出する
 */
function buildBestRecord(
  histories: Workout[],
  measurementType: Workout['measurementType'],
  weightUnit: WeightUnit,
): BestRecord | null {
  const sets = histories.flatMap((item) =>
    item.sets.filter(hasRecordedValue).map((set) => ({ date: item.date, set })),
  );
  if (!sets.length) return null;

  if (isRepsMeasurement(measurementType)) {
    const bestRm = sets.reduce(
      (best, item) => {
        const rm = Number(calcRm(number(item.set.weight), number(item.set.recordValue)));
        return rm > best.value ? { date: item.date, value: rm } : best;
      },
      { date: histories[0].date, value: 0 },
    );
    const maxWeight = sets.reduce((max, item) => Math.max(max, number(item.set.weight)), 0);
    const maxReps = sets.reduce((max, item) => Math.max(max, number(item.set.recordValue)), 0);
    const maxVolume = histories.reduce((max, item) => {
      const total = item.sets
        .filter(hasRecordedValue)
        .reduce((sum, set) => sum + number(set.weight) * number(set.recordValue), 0);
      return Math.max(max, total);
    }, 0);
    return {
      date: bestRm.date,
      mainLabel: 'MAX 1RM',
      mainValue: `${formatWeight(bestRm.value, weightUnit)}${weightUnitLabel(weightUnit)}`,
      subRecords: [
        {
          label: '最大重量',
          value: `${formatWeight(maxWeight, weightUnit)}${weightUnitLabel(weightUnit)}`,
        },
        { label: '最大回数', value: `${maxReps}回` },
        {
          label: '最大負荷量',
          value: `${formatWeight(maxVolume, weightUnit)}${weightUnitLabel(weightUnit)}`,
        },
      ],
    };
  }

  const bestSeconds = sets.reduce(
    (best, item) => {
      const seconds = number(item.set.recordValue);
      return seconds > best.value ? { date: item.date, value: seconds } : best;
    },
    { date: histories[0].date, value: 0 },
  );
  const maxWeight = sets.reduce((max, item) => Math.max(max, number(item.set.weight)), 0);
  const maxTotalSeconds = histories.reduce((max, item) => {
    const total = item.sets
      .filter(hasRecordedValue)
      .reduce((sum, set) => sum + number(set.recordValue), 0);
    return Math.max(max, total);
  }, 0);
  return {
    date: bestSeconds.date,
    mainLabel: '最長記録',
    mainValue: `${bestSeconds.value}秒`,
    subRecords: [
      {
        label: '最大重量',
        value: maxWeight
          ? `${formatWeight(maxWeight, weightUnit)}${weightUnitLabel(weightUnit)}`
          : '自重',
      },
      { label: '最大合計秒数', value: `${maxTotalSeconds}秒` },
    ],
  };
}

/**
 * 履歴テーブルの1セット分の行を表示するコンポーネント
 */
function ExerciseHistorySetRow({
  set,
  index,
  measurementType,
  weightUnit,
}: {
  set: WorkoutSet;
  index: number;
  measurementType: Workout['measurementType'];
  weightUnit: WeightUnit;
}) {
  const weight = number(set.weight);
  const recordValue = number(set.recordValue);
  const isReps = isRepsMeasurement(measurementType);
  return (
    <tr>
      <td className="history-num">{index + 1}</td>
      <td className="history-weight">
        {weight ? (
          <>
            {formatWeight(weight, weightUnit)}
            <small> {weightUnitLabel(weightUnit)}</small>
          </>
        ) : (
          '自重'
        )}
      </td>
      <td className="history-reps">
        {recordValue}
        <small> {measurementUnit(measurementType)}</small>
      </td>
      <td className="history-rm">
        {isReps && weight
          ? `${formatWeight(calcRm(weight, recordValue), weightUnit)}${weightUnitLabel(weightUnit)}`
          : '-'}
      </td>
      <td className={`history-assist${set.intensity ? ` intensity-${set.intensity}` : ''}`}>
        <IntensityIcon intensity={set.intensity} />
      </td>
    </tr>
  );
}
