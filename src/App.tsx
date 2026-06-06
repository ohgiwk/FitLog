import { FormEvent, PointerEvent, useEffect, useMemo, useState } from "react";

const storeKey = "fit-log-v2";

type Screen = "home" | "select" | "detail" | "exerciseHistory" | "preset" | "presetEdit" | "history";

type Exercise = {
  id: string;
  part: string;
  name: string;
  weight: number;
  reps: number;
};

type WorkoutSet = {
  id: string;
  weight: string | number;
  reps: string | number;
};

type Workout = {
  id: string;
  exerciseId: string;
  date: string;
  name: string;
  part: string;
  sets: WorkoutSet[];
};

type Preset = {
  id: string;
  name: string;
  exerciseIds: string[];
};

type State = {
  exercises: Exercise[];
  workouts: Workout[];
  presets: Preset[];
};

type CalendarCell = {
  date: string;
  day: number;
  inMonth: boolean;
};

const starterExercises: Exercise[] = [
  { id: uid(), part: "胸", name: "ベンチプレス", weight: 60, reps: 5 },
  { id: uid(), part: "胸", name: "スミスマシン・インクラインベンチプレス", weight: 30, reps: 12 },
  { id: uid(), part: "胸", name: "デクラインダンベルプレス", weight: 24, reps: 10 },
  { id: uid(), part: "背中", name: "インバーテッドロー", weight: 0, reps: 10 },
  { id: uid(), part: "背中", name: "ハーフデッドリフト", weight: 80, reps: 8 },
  { id: uid(), part: "背中", name: "Tバーロウ", weight: 35, reps: 10 },
  { id: uid(), part: "脚", name: "シーテッドレッグカール", weight: 35, reps: 12 },
  { id: uid(), part: "脚", name: "ゴブレットスクワット", weight: 20, reps: 10 },
  { id: uid(), part: "肩", name: "ショルダープレス", weight: 20, reps: 10 },
  { id: uid(), part: "腕", name: "ダンベルカール", weight: 10, reps: 12 },
];

export function App() {
  const [selectedDate, setSelectedDate] = useState(() => localDate(new Date()));
  const [state, setState] = useState<State>(() => loadState());
  const [screen, setScreen] = useState<Screen>("home");
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
  const [currentEditingPresetId, setCurrentEditingPresetId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [expandedParts, setExpandedParts] = useState<Set<string>>(() => new Set());
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [partInput, setPartInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [toast, setToast] = useState("");
  const [draggingExerciseId, setDraggingExerciseId] = useState<string | null>(null);

  const selectedWorkouts = useMemo(
    () => state.workouts.filter((workout) => workout.date === selectedDate),
    [selectedDate, state.workouts]
  );
  const groupedExercises = useMemo(() => groupExercises(state.exercises), [state.exercises]);
  const currentWorkout = useMemo(() => {
    const current = state.workouts.find((workout) => workout.id === currentWorkoutId);
    if (current?.date === selectedDate) return current;
    return selectedWorkouts[0] || null;
  }, [currentWorkoutId, selectedDate, selectedWorkouts, state.workouts]);
  const currentPreset = useMemo(
    () => state.presets.find((preset) => preset.id === currentPresetId) || state.presets[0] || null,
    [currentPresetId, state.presets]
  );
  const editingPreset = useMemo(
    () => state.presets.find((preset) => preset.id === currentEditingPresetId) || null,
    [currentEditingPresetId, state.presets]
  );

  useEffect(() => {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!currentPreset && state.presets.length) setCurrentPresetId(state.presets[0].id);
    if (!state.presets.length) setCurrentPresetId(null);
  }, [currentPreset, state.presets]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message: string) {
    setToast(message);
  }

  function showScreen(next: Screen) {
    if (next !== "detail") cleanupBlankDetailSets();
    if (next !== "select") setEditMode(false);
    setScreen(next);
  }

  function saveState(updater: (draft: State) => State) {
    setState((prev) => updater(prev));
  }

  function cleanupBlankDetailSets() {
    if (screen !== "detail" || !currentWorkout) return;
    saveState((prev) => {
      const workout = prev.workouts.find((item) => item.id === currentWorkout.id);
      if (!workout) return prev;
      const nextSets = workout.sets.filter((set) => !isBlank(set.weight) || !isBlank(set.reps));
      if (nextSets.length === workout.sets.length && nextSets.length) return prev;
      const workouts = nextSets.length
        ? prev.workouts.map((item) => (item.id === workout.id ? { ...item, sets: nextSets } : item))
        : prev.workouts.filter((item) => item.id !== workout.id);
      if (!nextSets.length) setCurrentWorkoutId(null);
      return { ...prev, workouts };
    });
  }

  function moveDate(days: number) {
    const next = parseDate(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(localDate(next));
    setCurrentWorkoutId(null);
    showScreen("home");
  }

  function addExerciseToToday(exerciseId: string) {
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    let nextWorkoutId = "";
    saveState((prev) => {
      const existing = prev.workouts.find((item) => item.date === selectedDate && item.exerciseId === exerciseId);
      if (existing) {
        nextWorkoutId = existing.id;
        return prev;
      }
      const workout: Workout = {
        id: uid(),
        exerciseId,
        date: selectedDate,
        name: exercise.name,
        part: exercise.part,
        sets: Array.from({ length: 5 }, () => newSet()),
      };
      nextWorkoutId = workout.id;
      return { ...prev, workouts: [...prev.workouts, workout] };
    });
    setCurrentWorkoutId(nextWorkoutId);
    showScreen("detail");
  }

  function addCustomExercise(event: FormEvent) {
    event.preventDefault();
    const part = partInput.trim() || "その他";
    const name = nameInput.trim();
    if (!name) return showToast("種目名を入力してください");
    const exercise: Exercise = { id: uid(), part, name, weight: 0, reps: 10 };
    saveState((prev) => ({ ...prev, exercises: [exercise, ...prev.exercises] }));
    setNameInput("");
    setAddFormOpen(false);
    addExerciseToToday(exercise.id);
  }

  function addSet(workoutId: string) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) =>
        workout.id === workoutId ? { ...workout, sets: [...workout.sets, newSet()] } : workout
      ),
    }));
    setCurrentWorkoutId(workoutId);
    showScreen("detail");
  }

  function updateSet(setId: string, field: "weight" | "reps", value: string) {
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) => ({
        ...workout,
        sets: workout.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
      })),
    }));
  }

  function deleteSet(setId: string) {
    if (!currentWorkout) return;
    saveState((prev) => ({
      ...prev,
      workouts: prev.workouts.map((workout) =>
        workout.id === currentWorkout.id ? { ...workout, sets: workout.sets.filter((set) => set.id !== setId) } : workout
      ),
    }));
  }

  function moveWorkout(workoutId: string, direction: number) {
    const index = selectedWorkouts.findIndex((workout) => workout.id === workoutId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= selectedWorkouts.length) return;
    saveState((prev) => {
      const currentGlobalIndex = prev.workouts.findIndex((workout) => workout.id === selectedWorkouts[index].id);
      const nextGlobalIndex = prev.workouts.findIndex((workout) => workout.id === selectedWorkouts[nextIndex].id);
      const workouts = [...prev.workouts];
      [workouts[currentGlobalIndex], workouts[nextGlobalIndex]] = [workouts[nextGlobalIndex], workouts[currentGlobalIndex]];
      return { ...prev, workouts };
    });
  }

  function createPreset() {
    const preset: Preset = { id: uid(), name: "新規プリセット", exerciseIds: [] };
    saveState((prev) => ({ ...prev, presets: [preset, ...prev.presets] }));
    setCurrentPresetId(preset.id);
    setCurrentEditingPresetId(preset.id);
    showScreen("presetEdit");
  }

  function renamePreset(presetId: string, name: string) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) =>
        preset.id === presetId ? { ...preset, name: name.trim() || "名称未設定" } : preset
      ),
    }));
  }

  function deletePreset(presetId: string) {
    saveState((prev) => ({ ...prev, presets: prev.presets.filter((preset) => preset.id !== presetId) }));
    if (currentPresetId === presetId) setCurrentPresetId(null);
    if (currentEditingPresetId === presetId) setCurrentEditingPresetId(null);
    showScreen("preset");
  }

  function addExerciseToPreset(presetId: string, exerciseId: string) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) =>
        preset.id === presetId || preset.exerciseIds.includes(exerciseId)
          ? preset.id === presetId && !preset.exerciseIds.includes(exerciseId)
            ? { ...preset, exerciseIds: [...preset.exerciseIds, exerciseId] }
            : preset
          : preset
      ),
    }));
  }

  function removeExerciseFromPreset(presetId: string, exerciseId: string) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) =>
        preset.id === presetId ? { ...preset, exerciseIds: preset.exerciseIds.filter((id) => id !== exerciseId) } : preset
      ),
    }));
  }

  function movePresetExercise(presetId: string, exerciseId: string, direction: number) {
    saveState((prev) => ({
      ...prev,
      presets: prev.presets.map((preset) => {
        if (preset.id !== presetId) return preset;
        const index = preset.exerciseIds.indexOf(exerciseId);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= preset.exerciseIds.length) return preset;
        const exerciseIds = [...preset.exerciseIds];
        [exerciseIds[index], exerciseIds[nextIndex]] = [exerciseIds[nextIndex], exerciseIds[index]];
        return { ...preset, exerciseIds };
      }),
    }));
  }

  function startPreset(presetId: string) {
    const preset = state.presets.find((item) => item.id === presetId);
    if (!preset || !preset.exerciseIds.length) return showToast("プリセットに種目を追加してください");
    let added = 0;
    saveState((prev) => {
      const todayExerciseIds = new Set(prev.workouts.filter((workout) => workout.date === selectedDate).map((workout) => workout.exerciseId));
      const workouts = [...prev.workouts];
      preset.exerciseIds.forEach((exerciseId) => {
        if (todayExerciseIds.has(exerciseId)) return;
        const exercise = prev.exercises.find((item) => item.id === exerciseId);
        if (!exercise) return;
        workouts.push({
          id: uid(),
          exerciseId,
          date: selectedDate,
          name: exercise.name,
          part: exercise.part,
          sets: Array.from({ length: 5 }, () => newSet()),
        });
        todayExerciseIds.add(exerciseId);
        added += 1;
      });
      return { ...prev, workouts };
    });
    showScreen("home");
    showToast(added ? `${added}種目を追加しました` : "すでに追加されています");
  }

  function deleteExercise(exerciseId: string) {
    const exercise = state.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    saveState((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((item) => item.id !== exerciseId),
      presets: prev.presets.map((preset) => ({
        ...preset,
        exerciseIds: preset.exerciseIds.filter((id) => id !== exerciseId),
      })),
    }));
    showToast(`${exercise.name}を削除しました`);
  }

  function commitExerciseOrder(rows: HTMLElement[]) {
    const byId = new Map(state.exercises.map((exercise) => [exercise.id, exercise]));
    const ordered: Exercise[] = [];
    rows.forEach((row) => {
      const exercise = byId.get(row.dataset.exerciseRow || "");
      const part = row.closest<HTMLElement>("[data-part-list]")?.dataset.partList;
      if (!exercise || !part) return;
      ordered.push({ ...exercise, part });
    });
    state.exercises.forEach((exercise) => {
      if (!ordered.some((item) => item.id === exercise.id)) ordered.push(exercise);
    });
    saveState((prev) => ({
      ...prev,
      exercises: ordered,
      workouts: prev.workouts.map((workout) => {
        const exercise = ordered.find((item) => item.id === workout.exerciseId);
        return exercise ? { ...workout, name: exercise.name, part: exercise.part } : workout;
      }),
    }));
  }

  function startPointerExerciseDrag(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-delete-exercise]")) return;
    const row = event.currentTarget;
    let moved = false;
    setDraggingExerciseId(row.dataset.exerciseRow || null);
    row.setPointerCapture(event.pointerId);
    row.classList.add("dragging");

    const move = (moveEvent: globalThis.PointerEvent) => {
      moved = true;
      const list = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLElement>("[data-part-list]");
      if (!list) return;
      document.querySelectorAll(".drop-target").forEach((item) => item.classList.toggle("drop-target", item === list));
      const after = dragAfterElement(list, moveEvent.clientY);
      if (after) list.insertBefore(row, after);
      else list.appendChild(row);
    };

    const end = () => {
      row.classList.remove("dragging");
      document.querySelectorAll(".drop-target").forEach((list) => list.classList.remove("drop-target"));
      row.removeEventListener("pointermove", move);
      row.removeEventListener("pointerup", end);
      row.removeEventListener("pointercancel", end);
      if (moved) commitExerciseOrder(Array.from(document.querySelectorAll<HTMLElement>("[data-exercise-row]")));
      setDraggingExerciseId(null);
    };

    row.addEventListener("pointermove", move);
    row.addEventListener("pointerup", end);
    row.addEventListener("pointercancel", end);
  }

  function togglePartExpanded(part: string) {
    setExpandedParts((prev) => {
      const next = new Set(prev);
      if (next.has(part)) next.delete(part);
      else next.add(part);
      return next;
    });
  }

  const sets = selectedWorkouts.flatMap((workout) => workout.sets);

  return (
    <>
      <main className="app">
        {screen === "home" && (
          <section className="screen active detail-screen">
            <header className="topbar">
              <div className="bar-row">
                <button className="bar-btn" type="button" aria-label="前の日" onClick={() => moveDate(-1)}>
                  &lt;
                </button>
                <div className="bar-title">{selectedDate.replaceAll("-", "/")}</div>
                <button className="bar-btn right" type="button" aria-label="次の日" onClick={() => moveDate(1)}>
                  &gt;
                </button>
              </div>
              <div className="stats">
                <div className="stat"><span>合計種目数</span><strong>{selectedWorkouts.length}</strong></div>
                <div className="stat"><span>合計セット数</span><strong>{sets.length}</strong></div>
                <div className="stat"><span>合計レップ数</span><strong>{sets.reduce((sum, set) => sum + number(set.reps), 0)}</strong></div>
                <div className="stat"><span>合計負荷量</span><strong>{Math.round(sets.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0))}</strong></div>
              </div>
            </header>
            <div className="preset-start">
              <select
                aria-label="プリセットを選択"
                disabled={!state.presets.length}
                value={currentPreset?.id || ""}
                onChange={(event) => setCurrentPresetId(event.target.value)}
              >
                {state.presets.length ? (
                  state.presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)
                ) : (
                  <option value="">プリセットなし</option>
                )}
              </select>
              <button className="small-primary" disabled={!currentPreset} type="button" onClick={() => startPreset(currentPreset?.id || "")}>開始</button>
              <button className="small-outline" type="button" onClick={() => showScreen("preset")}>管理</button>
            </div>
            <div className="content">
              {!selectedWorkouts.length ? (
                <div className="empty"><div><strong>この日の種目はまだありません</strong><span>右下の＋から種目を選択して、詳細画面でセットを入力できます。</span></div></div>
              ) : (
                selectedWorkouts.map((workout, index) => (
                  <article className="exercise-card" key={workout.id}>
                    <header className="exercise-head">
                      <h2><button className="title-open" type="button" onClick={() => { setCurrentWorkoutId(workout.id); showScreen("detail"); }}>{workout.part} - {workout.name}</button></h2>
                      <button className="chev" type="button" aria-label="上へ移動" disabled={index === 0} onClick={() => moveWorkout(workout.id, -1)}><ChevronUp /></button>
                      <button className="chev" type="button" aria-label="下へ移動" disabled={index === selectedWorkouts.length - 1} onClick={() => moveWorkout(workout.id, 1)}><ChevronDown /></button>
                    </header>
                    <table className="set-table">
                      <thead><tr><th>セット</th><th>重さ</th><th></th><th>回数</th><th>RM</th></tr></thead>
                      <tbody>{workout.sets.map((set, setIndex) => <HomeSetRow key={set.id} set={set} index={setIndex} />)}</tbody>
                    </table>
                    <button className="add-set" type="button" aria-label="セットを追加" onClick={() => addSet(workout.id)}><span className="plus-muted">+</span></button>
                  </article>
                ))
              )}
            </div>
            <button className="fab" type="button" aria-label="種目を追加" onClick={() => showScreen("select")}>+</button>
          </section>
        )}

        {screen === "select" && (
          <section className="screen active">
            <header className="topbar">
              <div className="bar-row">
                <button className="bar-btn" type="button" aria-label="戻る" onClick={() => showScreen("home")}>&lt;</button>
                <div className="bar-title">種目を選択</div>
                <button className="bar-btn right" type="button" onClick={() => { setEditMode(!editMode); if (!editMode) setAddFormOpen(false); }}>{editMode ? "Done" : "Edit"}</button>
              </div>
            </header>
            <div className="select-actions">
              <button className="outline-pill" type="button" onClick={() => setAddFormOpen(!addFormOpen)}>部位・種目を追加</button>
            </div>
            {addFormOpen && (
              <form className="add-form" onSubmit={addCustomExercise}>
                <label>部位<input maxLength={12} placeholder="胸" value={partInput} onChange={(event) => setPartInput(event.target.value)} /></label>
                <label>種目名<input maxLength={30} value={nameInput} onChange={(event) => setNameInput(event.target.value)} /></label>
                <button className="primary" type="submit">追加して記録へ</button>
              </form>
            )}
            <div className="content">
              {Array.from(groupedExercises.entries()).map(([part, exercises]) => {
                const expanded = expandedParts.has(part);
                const visibleExercises = editMode || expanded ? exercises : exercises.slice(0, 4);
                return (
                  <section className="part-card" key={part}>
                    <div className="part-title">{part}{editMode ? "" : " - 最近"}</div>
                    <div className="exercise-list" data-part-list={part}>
                      {visibleExercises.map((exercise) =>
                        editMode ? (
                          <div
                            className={`exercise-option edit-row ${draggingExerciseId === exercise.id ? "dragging" : ""}`}
                            data-exercise-row={exercise.id}
                            draggable
                            key={exercise.id}
                            onPointerDown={startPointerExerciseDrag}
                            onDragStart={(event) => {
                              setDraggingExerciseId(exercise.id);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", exercise.id);
                            }}
                            onDragOver={(event) => event.preventDefault()}
                            onDragEnd={() => {
                              commitExerciseOrder(Array.from(document.querySelectorAll<HTMLElement>("[data-exercise-row]")));
                              setDraggingExerciseId(null);
                            }}
                          >
                            <span className="drag-handle" aria-hidden="true"><DragHandle /></span>
                            <span className="exercise-name">{exercise.name}</span>
                            <button className="delete-exercise" type="button" aria-label="種目を削除" onClick={() => deleteExercise(exercise.id)}><TrashIcon /></button>
                          </div>
                        ) : (
                          <button className="exercise-option" key={exercise.id} type="button" onClick={() => addExerciseToToday(exercise.id)}>{exercise.name}</button>
                        )
                      )}
                    </div>
                    {!editMode && (
                      <div className="part-foot">
                        <button type="button" onClick={() => { setPartInput(part); setAddFormOpen(true); }}>種目を追加</button>
                        {exercises.length > 4 ? <button type="button" onClick={() => togglePartExpanded(part)}>{expanded ? "閉じる" : "すべて表示"}</button> : <span />}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </section>
        )}

        {screen === "detail" && currentWorkout && (
          <section className="screen active">
            <header className="topbar">
              <div className="bar-row">
                <button className="bar-btn" type="button" onClick={() => showScreen("home")}>Back</button>
                <div className="bar-title">{currentWorkout.name}</div>
                <button className="history-btn" type="button" aria-label="履歴" onClick={() => showScreen("exerciseHistory")}><HistoryIcon /></button>
              </div>
            </header>
            <div className="content">
              <LastRecord workout={currentWorkout} selectedDate={selectedDate} workouts={state.workouts} />
              <div className="detail-table">
                {currentWorkout.sets.map((set, index) => (
                  <div className="detail-row" key={set.id}>
                    <div className="num">{index + 1}</div>
                    <label className="field"><input type="number" step="0.5" min="0" inputMode="decimal" value={set.weight} onChange={(event) => updateSet(set.id, "weight", event.target.value)} /><span className="unit">kg</span></label>
                    <label className="field"><input type="number" step="1" min="1" inputMode="numeric" value={set.reps} onChange={(event) => updateSet(set.id, "reps", event.target.value)} /><span className="unit">回</span></label>
                    <div className="rm-value">{calcRm(number(set.weight), number(set.reps))} kg</div>
                    <button className="check" type="button" aria-label="セット削除" onClick={() => deleteSet(set.id)}><TrashIcon /></button>
                    <div className="note">メモ</div>
                  </div>
                ))}
              </div>
            </div>
            <button className="fab" type="button" aria-label="セットを追加" onClick={() => addSet(currentWorkout.id)}>+</button>
          </section>
        )}

        {screen === "exerciseHistory" && currentWorkout && (
          <ExerciseHistoryScreen workout={currentWorkout} workouts={state.workouts} onBack={() => showScreen("detail")} />
        )}

        {screen === "preset" && (
          <PresetListScreen
            presets={state.presets}
            exercises={state.exercises}
            onBack={() => showScreen("home")}
            onCreate={createPreset}
            onEdit={(presetId) => { setCurrentEditingPresetId(presetId); showScreen("presetEdit"); }}
            onDelete={deletePreset}
          />
        )}

        {screen === "presetEdit" && (
          <PresetEditScreen
            preset={editingPreset}
            exercises={state.exercises}
            groupedExercises={groupedExercises}
            onBack={() => showScreen("preset")}
            onRename={renamePreset}
            onDelete={deletePreset}
            onAdd={addExerciseToPreset}
            onRemove={removeExerciseFromPreset}
            onMove={movePresetExercise}
          />
        )}

        {screen === "history" && (
          <HistoryScreen
            selectedDate={selectedDate}
            workouts={state.workouts}
            onBack={() => showScreen("home")}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setCurrentWorkoutId(null);
              showScreen("home");
            }}
            onMoveMonth={(delta) => {
              const next = parseDate(selectedDate);
              next.setMonth(next.getMonth() + delta, 1);
              setSelectedDate(localDate(next));
              setCurrentWorkoutId(null);
            }}
          />
        )}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${screen === "home" ? "active" : ""}`} type="button" onClick={() => showScreen("home")}><HomeIcon /><span>ホーム</span></button>
        <button className={`nav-item ${screen === "history" ? "active" : ""}`} type="button" onClick={() => showScreen("history")}><CalendarIcon /><span>履歴/分析</span></button>
      </nav>
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}

function HomeSetRow({ set, index }: { set: WorkoutSet; index: number }) {
  const weight = number(set.weight);
  const reps = number(set.reps);
  return (
    <tr>
      <td className="set-number">{index + 1}</td>
      <td className="weight">{weight ? <>{weight.toFixed(1)} <small>Kg</small></> : "自重"}</td>
      <td className="lbs">{weight ? `${(weight * 2.20462).toFixed(2)}Lbs` : "-"}</td>
      <td className="reps">{reps} <small>回</small></td>
      <td className="rm">{weight ? `${calcRm(weight, reps)}Kg` : "-"}</td>
    </tr>
  );
}

function LastRecord({ workout, selectedDate, workouts }: { workout: Workout; selectedDate: string; workouts: Workout[] }) {
  const lastRecord = workouts
    .filter((item) => item.exerciseId === workout.exerciseId && item.date < selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!lastRecord) return null;
  return (
    <div className="detail-summary">
      <strong>Last Record : {lastRecord.date.replaceAll("-", "/")}</strong>
      {lastRecord.sets.map((set, index) => (
        <div key={set.id}>{index + 1}　{formatWeight(set.weight)} kg ×　{number(set.reps)} reps</div>
      ))}
    </div>
  );
}

function ExerciseHistoryScreen({ workout, workouts, onBack }: { workout: Workout; workouts: Workout[]; onBack: () => void }) {
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

function PresetListScreen({ presets, exercises, onBack, onCreate, onEdit, onDelete }: {
  presets: Preset[];
  exercises: Exercise[];
  onBack: () => void;
  onCreate: () => void;
  onEdit: (presetId: string) => void;
  onDelete: (presetId: string) => void;
}) {
  return (
    <section className="screen active">
      <header className="topbar"><div className="bar-row"><button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>&lt;</button><div className="bar-title">プリセット管理</div><button className="bar-btn right" type="button" onClick={onCreate}>追加</button></div></header>
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

function PresetEditScreen({ preset, exercises, groupedExercises, onBack, onRename, onDelete, onAdd, onRemove, onMove }: {
  preset: Preset | null;
  exercises: Exercise[];
  groupedExercises: Map<string, Exercise[]>;
  onBack: () => void;
  onRename: (presetId: string, name: string) => void;
  onDelete: (presetId: string) => void;
  onAdd: (presetId: string, exerciseId: string) => void;
  onRemove: (presetId: string, exerciseId: string) => void;
  onMove: (presetId: string, exerciseId: string, direction: number) => void;
}) {
  return (
    <section className="screen active">
      <header className="topbar"><div className="bar-row"><button className="bar-btn" type="button" aria-label="戻る" onClick={onBack}>&lt;</button><div className="bar-title">プリセット編集</div><span /></div></header>
      <div className="preset-wrap">
        {!preset ? (
          <div className="empty"><div><strong>編集するプリセットを選択してください</strong><span>プリセット管理画面から編集できます。</span></div></div>
        ) : (
          <article className="preset-card">
            <header className="preset-card-head">
              <input className="preset-name-input" maxLength={24} value={preset.name} aria-label="プリセット名" onChange={(event) => onRename(preset.id, event.target.value)} />
              <button className="preset-delete" type="button" aria-label="プリセット削除" onClick={() => onDelete(preset.id)}><TrashIcon /></button>
            </header>
            <div>
              {preset.exerciseIds.length ? preset.exerciseIds.map((exerciseId, index) => {
                const exercise = exercises.find((item) => item.id === exerciseId);
                const name = exercise ? `${exercise.part} - ${exercise.name}` : "削除済みの種目";
                return (
                  <div className="preset-row" key={exerciseId}>
                    <div className="preset-row-name">{name}</div>
                    <button className="preset-row-btn" type="button" aria-label="上へ移動" disabled={index === 0} onClick={() => onMove(preset.id, exerciseId, -1)}><ChevronUp /></button>
                    <button className="preset-row-btn" type="button" aria-label="下へ移動" disabled={index === preset.exerciseIds.length - 1} onClick={() => onMove(preset.id, exerciseId, 1)}><ChevronDown /></button>
                    <button className="preset-row-btn" type="button" aria-label="種目を外す" onClick={() => onRemove(preset.id, exerciseId)}><TrashIcon /></button>
                  </div>
                );
              }) : (
                <div className="empty" style={{ minHeight: 120 }}><div><strong>種目未登録</strong><span>下の候補から種目を追加してください。</span></div></div>
              )}
            </div>
            <div className="preset-add">
              <div className="preset-add-title">種目を追加</div>
              {Array.from(groupedExercises.entries()).map(([part, partExercises]) => (
                <div className="preset-add-group" key={part}>
                  <div className="preset-add-part">{part}</div>
                  <div className="preset-add-options">
                    {partExercises.map((exercise) => (
                      <button key={exercise.id} type="button" disabled={preset.exerciseIds.includes(exercise.id)} onClick={() => onAdd(preset.id, exercise.id)}>{exercise.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function HistoryScreen({ selectedDate, workouts, onBack, onSelectDate, onMoveMonth }: {
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

function loadState(): State {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey) || "null") as Partial<State> | null;
    if (saved?.exercises && saved?.workouts) {
      return {
        exercises: saved.exercises,
        workouts: saved.workouts,
        presets: normalizePresets(saved.presets),
      };
    }
  } catch {
    localStorage.removeItem(storeKey);
  }
  return { exercises: starterExercises, workouts: [], presets: [] };
}

function normalizePresets(presets: unknown): Preset[] {
  if (!Array.isArray(presets)) return [];
  return presets.map((preset) => ({
    id: typeof preset.id === "string" ? preset.id : uid(),
    name: typeof preset.name === "string" ? preset.name : "名称未設定",
    exerciseIds: Array.isArray(preset.exerciseIds) ? preset.exerciseIds.filter((id: unknown): id is string => typeof id === "string") : [],
  }));
}

function groupExercises(exercises: Exercise[]) {
  return exercises.reduce((groups, exercise) => {
    if (!groups.has(exercise.part)) groups.set(exercise.part, []);
    groups.get(exercise.part)?.push(exercise);
    return groups;
  }, new Map<string, Exercise[]>());
}

function dragAfterElement(list: HTMLElement, y: number) {
  return Array.from(list.querySelectorAll<HTMLElement>("[data-exercise-row]:not(.dragging)")).reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null as HTMLElement | null }
  ).element;
}

function calendarCells(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: localDate(date), day: date.getDate(), inMonth: date.getMonth() === month };
  });
}

function newSet(): WorkoutSet {
  return { id: uid(), weight: "", reps: "" };
}

function calcRm(weight: number, reps: number) {
  if (!weight || !reps) return "0.0";
  return (weight * (1 + reps / 30)).toFixed(reps > 3 ? 1 : 2);
}

function number(value: string | number) {
  return Number(value) || 0;
}

function isBlank(value: string | number) {
  return String(value ?? "").trim() === "";
}

function formatWeight(value: string | number) {
  return number(value).toFixed(1);
}

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function prevMonthLabel(year: number, month: number) {
  const date = new Date(year, month - 1, 1);
  return `${String(date.getMonth() + 1).padStart(2, "0")}月`;
}

function nextMonthLabel(year: number, month: number) {
  const date = new Date(year, month + 1, 1);
  return `${String(date.getMonth() + 1).padStart(2, "0")}月`;
}

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function ChevronUp() {
  return <svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6" /></svg>;
}

function ChevronDown() {
  return <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 16h10l1-16" /></svg>;
}

function DragHandle() {
  return <svg viewBox="0 0 24 24"><path d="M8 6h8" /><path d="M8 12h8" /><path d="M8 18h8" /></svg>;
}

function HistoryIcon() {
  return <svg viewBox="0 0 24 24"><path d="M4 19V5h16v14H4z" /><path d="m7 15 4-4 3 3 3-5" /></svg>;
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /></svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24"><path d="M5 4h14v18H5zM7 2h2v4H7zM15 2h2v4h-2zM8 10h8v2H8z" /></svg>;
}
