import { FormEvent } from 'react';
import {
  ExerciseCategory,
  GripStyleType,
  GripType,
  MeasurementType,
} from '../types';
import { exerciseCategories, gripOptions, gripStyleOptions } from '../utils';

export type ExerciseFormValue = {
  part: string;
  name: string;
  measurementType: MeasurementType;
  category: ExerciseCategory;
  availableGrips: GripType[];
  availableGripStyles: GripStyleType[];
};

type ExerciseFormProps = {
  value: ExerciseFormValue;
  parts: string[];
  submitLabel: string;
  onChange: (value: ExerciseFormValue) => void;
  onCancel: () => void;
  onSubmit: (value: ExerciseFormValue) => void;
};

function MeasurementToggle({
  value,
  onChange,
}: {
  value: MeasurementType;
  onChange: (value: MeasurementType) => void;
}) {
  return (
    <div className="measurement-toggle">
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

function CheckboxOptions<T extends string>({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
}) {
  function toggle(value: T) {
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    );
  }

  return (
    <fieldset className="exercise-option-fieldset">
      <legend>{legend}</legend>
      <div className="exercise-checkbox-list">
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ExerciseForm({
  value,
  parts,
  submitLabel,
  onChange,
  onCancel,
  onSubmit,
}: ExerciseFormProps) {
  const partChoices = parts.includes(value.part) ? parts : [value.part, ...parts];

  function update<K extends keyof ExerciseFormValue>(field: K, next: ExerciseFormValue[K]) {
    onChange({ ...value, [field]: next });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <form className="exercise-editor-form" onSubmit={handleSubmit}>
      <section className="exercise-editor-section">
        <h2>基本設定</h2>
        <div className="exercise-editor-fields">
          <label>
            <span>部位</span>
            <select value={value.part} onChange={(event) => update('part', event.target.value)}>
              {partChoices.map((part) => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>種目名</span>
            <input
              autoFocus
              maxLength={30}
              value={value.name}
              onChange={(event) => update('name', event.target.value)}
            />
          </label>
          <label>
            <span>カテゴリ</span>
            <select
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
          <div className="exercise-editor-field-row">
            <span>記録単位</span>
            <MeasurementToggle
              value={value.measurementType}
              onChange={(measurementType) => update('measurementType', measurementType)}
            />
          </div>
        </div>
      </section>

      <section className="exercise-editor-section">
        <h2>グリップ設定</h2>
        <CheckboxOptions
          legend="握りの向き"
          options={gripOptions}
          selected={value.availableGrips}
          onChange={(availableGrips) => update('availableGrips', availableGrips)}
        />
        <CheckboxOptions
          legend="握り方"
          options={gripStyleOptions}
          selected={value.availableGripStyles}
          onChange={(availableGripStyles) =>
            update('availableGripStyles', availableGripStyles)
          }
        />
      </section>

      <div className="exercise-editor-actions">
        <button className="small-outline" type="button" onClick={onCancel}>
          キャンセル
        </button>
        <button className="small-primary" type="submit" disabled={!value.name.trim()}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
