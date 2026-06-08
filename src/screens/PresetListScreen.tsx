import { ChevronLeft, TrashIcon } from "../icons";
import { Exercise, Preset } from "../types";

export function PresetListScreen({ presets, exercises, onBack, onCreate, onEdit, onDelete }: {
  presets: Preset[];
  exercises: Exercise[];
  onBack: () => void;
  onCreate: () => void;
  onEdit: (presetId: string) => void;
  onDelete: (presetId: string) => void;
}) {
  return (
    <section className="screen active">
      <header className="topbar"><div className="bar-row"><button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}><ChevronLeft /></button><div className="bar-title">プリセット管理</div><button className="bar-btn right" type="button" onClick={onCreate}>追加</button></div></header>
      <div className="preset-wrap">
        {!presets.length ? (
          <div className="empty"><div><strong>プリセットはまだありません</strong><span>右上の追加から分割法メニューを作成できます。</span></div></div>
        ) : (
          <article className="preset-card">
            {presets.map((preset) => {
              const validCount = preset.exerciseIds.filter((exerciseId) => exercises.some((exercise) => exercise.id === exerciseId)).length;
              return (
                <div className="preset-list-row" key={preset.id}>
                  <button className="preset-list-main" type="button" onClick={() => onEdit(preset.id)}><div className="preset-list-name">{preset.name}</div><div className="preset-list-count">{validCount}種目</div></button>
                  <button className="small-outline" type="button" onClick={() => onEdit(preset.id)}>編集</button>
                  <button className="preset-row-btn" type="button" aria-label="プリセット削除" onClick={() => onDelete(preset.id)}><TrashIcon /></button>
                </div>
              );
            })}
          </article>
        )}
      </div>
    </section>
  );
}
