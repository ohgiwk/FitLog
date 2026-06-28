import { useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronUp, PlusIcon, TrashIcon } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';
import { PresetSchedule, TrainingPlanMode } from '../types';
import { parseDate, weekdayLabels } from '../utils';

/**
 * プリセット編集画面が必要とする state・操作を Context から組み立てる view-model フック
 */
function usePresetEditScreenModel() {
  const { presetDraft, presetDraftMode, selectedDate, state, actions } = useFitLogContext();

  return {
    preset: presetDraft,
    isStartFlow: presetDraftMode === 'start',
    selectedDate,
    exercises: state.exercises,
    onBack: actions.cancelPresetDraft,
    onSave: actions.savePresetDraft,
    onUpdate: actions.updatePresetDraft,
    onOpenExerciseSelect: () => actions.setScreen('presetExerciseSelect'),
  };
}

/**
 * プリセット編集画面。名称変更・種目の追加/削除/並び替えを行う
 */
export function PresetEditScreen() {
  const {
    preset,
    isStartFlow,
    selectedDate,
    exercises,
    onBack,
    onSave,
    onUpdate,
    onOpenExerciseSelect,
  } = usePresetEditScreenModel();

  /**
   * 下書き内の種目順を1つ前後へ移動する
   */
  function moveExercise(exerciseId: string, direction: number) {
    if (!preset) return;
    const index = preset.exerciseIds.indexOf(exerciseId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= preset.exerciseIds.length) return;
    const exerciseIds = [...preset.exerciseIds];
    [exerciseIds[index], exerciseIds[nextIndex]] = [exerciseIds[nextIndex], exerciseIds[index]];
    onUpdate({ exerciseIds });
  }

  /**
   * 下書きから指定種目を外す
   */
  function removeExercise(exerciseId: string) {
    if (!preset) return;
    onUpdate({ exerciseIds: preset.exerciseIds.filter((id) => id !== exerciseId) });
  }

  return (
    <section className="screen active">
      <header className="topbar">
        <div className="bar-row">
          <button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>
            <ChevronLeft />
          </button>
          <div className="bar-title">メニュー編集</div>
          <button className="bar-btn right" type="button" onClick={onSave}>
            {isStartFlow ? '開始' : '保存'}
          </button>
        </div>
      </header>
      <div className="preset-wrap">
        {!preset ? (
          <div className="empty">
            <div>
              <strong>編集するメニューを選択してください</strong>
              <span>トレーニングメニュー画面から編集できます。</span>
            </div>
          </div>
        ) : (
          <div className="preset-edit-layout">
            <section className="preset-card">
              <header className="preset-card-head">
                <input
                  className="preset-name-input"
                  maxLength={24}
                  value={preset.name}
                  aria-label="メニュー名"
                  onChange={(event) => onUpdate({ name: event.target.value })}
                />
              </header>
              <PresetScheduleEditor
                fallbackStartDate={selectedDate}
                schedule={preset.schedule}
                onChange={(schedule) => onUpdate({ schedule })}
              />
            </section>
            <section className="preset-card">
              <div className="preset-section-heading">
                <div className="preset-section-title">種目の選択</div>
                <div className="preset-section-actions">
                  <small>{preset.exerciseIds.length}種目選択中</small>
                  <button
                    className="preset-section-add"
                    type="button"
                    aria-label="種目を選択"
                    onClick={onOpenExerciseSelect}
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <div>
                {preset.exerciseIds.length ? (
                  preset.exerciseIds.map((exerciseId, index) => {
                    const exercise = exercises.find((item) => item.id === exerciseId);
                    const name = exercise
                      ? `${exercise.part} - ${exercise.name}`
                      : '削除済みの種目';
                    return (
                      <div className="preset-row" key={exerciseId}>
                        <div className="preset-row-name">{name}</div>
                        <button
                          className="preset-row-btn"
                          type="button"
                          aria-label="上へ移動"
                          disabled={index === 0}
                          onClick={() => moveExercise(exerciseId, -1)}
                        >
                          <ChevronUp />
                        </button>
                        <button
                          className="preset-row-btn"
                          type="button"
                          aria-label="下へ移動"
                          disabled={index === preset.exerciseIds.length - 1}
                          onClick={() => moveExercise(exerciseId, 1)}
                        >
                          <ChevronDown />
                        </button>
                        <button
                          className="preset-row-btn"
                          type="button"
                          aria-label="種目を外す"
                          onClick={() => removeExercise(exerciseId)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty preset-exercise-empty">
                    <div>
                      <strong>種目未登録</strong>
                      <span>右上の＋から種目を選択してください。</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

type PresetScheduleEditorProps = {
  schedule: PresetSchedule | undefined;
  fallbackStartDate: string;
  onChange: (schedule: PresetSchedule | undefined) => void;
};

/**
 * プリセットに紐づく曜日・間隔スケジュールを編集する
 */
function PresetScheduleEditor({
  schedule,
  fallbackStartDate,
  onChange,
}: PresetScheduleEditorProps) {
  const intervalDays = schedule?.intervalDays ?? 3;
  const startDate = schedule?.startDate || fallbackStartDate;
  const weekdays = schedule?.weekdays ?? [];
  const [intervalText, setIntervalText] = useState(String(intervalDays));

  useEffect(() => {
    setIntervalText(String(intervalDays));
  }, [intervalDays]);

  /**
   * スケジュール方式を切り替え、未設定項目には操作日の既定値を入れる
   */
  function selectMode(mode: TrainingPlanMode) {
    onChange({
      mode,
      weekdays:
        mode === 'weekly' && !weekdays.length ? [parseDate(fallbackStartDate).getDay()] : weekdays,
      intervalDays,
      startDate,
    });
  }

  /**
   * 曜日ボタンの選択状態を切り替える
   */
  function toggleWeekday(weekday: number) {
    const next = weekdays.includes(weekday)
      ? weekdays.filter((value) => value !== weekday)
      : [...weekdays, weekday].sort((a, b) => a - b);
    onChange({
      mode: 'weekly',
      weekdays: next,
      intervalDays,
      startDate,
    });
  }

  /**
   * 有効な間隔だけを保存する
   */
  function updateInterval(text: string) {
    setIntervalText(text);
    const value = Number(text);
    if (!Number.isFinite(value) || value < 1) return;
    onChange({
      mode: 'interval',
      weekdays,
      intervalDays: Math.round(value),
      startDate,
    });
  }

  return (
    <section className="preset-schedule">
      <div className="preset-section-title">スケジュール</div>
      <p>設定した日は、ホームでこのメニューが最初から選択されます。</p>
      <div className="preset-schedule-mode" role="group" aria-label="スケジュール方式">
        <button
          className={!schedule ? 'active' : ''}
          type="button"
          onClick={() => onChange(undefined)}
        >
          設定なし
        </button>
        <button
          className={schedule?.mode === 'weekly' ? 'active' : ''}
          type="button"
          onClick={() => selectMode('weekly')}
        >
          曜日
        </button>
        <button
          className={schedule?.mode === 'interval' ? 'active' : ''}
          type="button"
          onClick={() => selectMode('interval')}
        >
          何日ごと
        </button>
      </div>
      {schedule?.mode === 'weekly' && (
        <div className="weekday-picker" aria-label="メニューの曜日">
          {weekdayLabels.map((day, index) => (
            <button
              className={weekdays.includes(index) ? 'active' : ''}
              key={day}
              type="button"
              onClick={() => toggleWeekday(index)}
            >
              {day}
            </button>
          ))}
        </div>
      )}
      {schedule?.mode === 'interval' && (
        <div className="interval-fields">
          <label>
            <span>間隔</span>
            <input
              inputMode="numeric"
              min="1"
              type="number"
              value={intervalText}
              onChange={(event) => updateInterval(event.target.value)}
            />
          </label>
          <label>
            <span>開始日</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                onChange({
                  mode: 'interval',
                  weekdays,
                  intervalDays,
                  startDate: event.target.value,
                })
              }
            />
          </label>
        </div>
      )}
    </section>
  );
}
