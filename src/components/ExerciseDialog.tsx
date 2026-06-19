import { FormEvent, useState } from 'react';
import { ChevronDown, ChevronUp } from '../icons';
import { ExerciseCategory, MeasurementType } from '../types';
import { exerciseCategories } from '../utils';

export type ExerciseFormValue = {
  part: string;
  name: string;
  measurementType: MeasurementType;
  category: ExerciseCategory;
};

type ExerciseDialogProps = {
  title: string;
  submitLabel: string;
  initialValue: ExerciseFormValue;
  parts: string[];
  onClose: () => void;
  onSubmit: (value: ExerciseFormValue) => boolean;
};

function MeasurementToggle({
  value,
  onChange,
}: {
  value: MeasurementType;
  onChange: (value: MeasurementType) => void;
}) {
  return (
    <div className="measurement-toggle" data-row-action>
      {(['reps', 'seconds'] as const).map((type) => (
        <button
          className={value === type ? 'active' : ''}
          key={type}
          type="button"
          onClick={() => onChange(type)}
        >
          {type === 'reps' ? '回数' : '秒数'}
        </button>
      ))}
    </div>
  );
}

export function ExerciseDialog({
  title,
  submitLabel,
  initialValue,
  parts,
  onClose,
  onSubmit,
}: ExerciseDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [detailOpen, setDetailOpen] = useState(false);
  const partChoices = parts.includes(value.part) ? parts : [value.part, ...parts];
  const titleId = `${submitLabel === '追加' ? 'add' : 'edit'}-exercise-title`;

  function update<K extends keyof ExerciseFormValue>(field: K, next: ExerciseFormValue[K]) {
    setValue((current) => ({ ...current, [field]: next }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (onSubmit(value)) onClose();
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="confirm-dialog add-exercise-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-title" id={titleId}>
          {title}
        </div>
        <form className="add-form" onSubmit={handleSubmit}>
          <label>
            部位
            <select
              className="add-form-select"
              value={value.part}
              onChange={(event) => update('part', event.target.value)}
            >
              {partChoices.map((part) => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
            </select>
          </label>
          <label>
            種目名
            <input
              autoFocus
              maxLength={30}
              value={value.name}
              onChange={(event) => update('name', event.target.value)}
            />
          </label>
          <label>
            カテゴリ
            <select
              className="add-form-select"
              value={value.category}
              onChange={(event) => update('category', event.target.value as ExerciseCategory)}
            >
              {exerciseCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="add-form-detail-toggle"
            type="button"
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((open) => !open)}
          >
            <span>詳細設定</span>
            {detailOpen ? <ChevronUp /> : <ChevronDown />}
          </button>
          {detailOpen && (
            <div className="form-field form-field-row">
              <div className="form-label">記録単位</div>
              <MeasurementToggle
                value={value.measurementType}
                onChange={(type) => update('measurementType', type)}
              />
            </div>
          )}
          <div className="confirm-actions">
            <button className="small-outline" type="button" onClick={onClose}>
              キャンセル
            </button>
            <button className="small-primary" type="submit" disabled={!value.name.trim()}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
