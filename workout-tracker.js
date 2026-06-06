    const storeKey = "fit-log-v2";
    let selectedDate = localDate(new Date());
    const starterExercises = [
      { id: uid(), part: "胸", name: "ベンチプレス", weight: 60, reps: 5 },
      { id: uid(), part: "胸", name: "スミスマシン・インクラインベンチプレス", weight: 30, reps: 12 },
      { id: uid(), part: "胸", name: "デクラインダンベルプレス", weight: 24, reps: 10 },
      { id: uid(), part: "背中", name: "インバーテッドロー", weight: 0, reps: 10 },
      { id: uid(), part: "背中", name: "ハーフデッドリフト", weight: 80, reps: 8 },
      { id: uid(), part: "背中", name: "Tバーロウ", weight: 35, reps: 10 },
      { id: uid(), part: "脚", name: "シーテッドレッグカール", weight: 35, reps: 12 },
      { id: uid(), part: "脚", name: "ゴブレットスクワット", weight: 20, reps: 10 },
      { id: uid(), part: "肩", name: "ショルダープレス", weight: 20, reps: 10 },
      { id: uid(), part: "腕", name: "ダンベルカール", weight: 10, reps: 12 }
    ];
    let state = loadState();
    let currentWorkoutId = null;
    let currentPresetId = null;
    let currentEditingPresetId = null;
    let editMode = false;
    let draggingExerciseId = null;
    const expandedParts = new Set();

    const els = {
      homeDate: document.querySelector("#homeDate"),
      statExercises: document.querySelector("#statExercises"),
      statSets: document.querySelector("#statSets"),
      statReps: document.querySelector("#statReps"),
      statVolume: document.querySelector("#statVolume"),
      todayList: document.querySelector("#todayList"),
      presetSelect: document.querySelector("#presetSelect"),
      startPresetBtn: document.querySelector("#startPresetBtn"),
      presetList: document.querySelector("#presetList"),
      presetEditor: document.querySelector("#presetEditor"),
      exerciseGroups: document.querySelector("#exerciseGroups"),
      toggleAdd: document.querySelector("#toggleAdd"),
      addExerciseForm: document.querySelector("#addExerciseForm"),
      partInput: document.querySelector("#partInput"),
      nameInput: document.querySelector("#nameInput"),
      detailTitle: document.querySelector("#detailTitle"),
      detailSets: document.querySelector("#detailSets"),
      lastRecord: document.querySelector("#lastRecord"),
      exerciseHistoryTitle: document.querySelector("#exerciseHistoryTitle"),
      exerciseHistoryList: document.querySelector("#exerciseHistoryList"),
      historyList: document.querySelector("#historyList"),
      toast: document.querySelector("#toast")
    };

    document.querySelector("#prevDate").addEventListener("click", () => moveDate(-1));
    document.querySelector("#nextDate").addEventListener("click", () => moveDate(1));
    document.querySelector("#openSelectFab").addEventListener("click", () => showScreen("select"));
    document.querySelector("#openExerciseHistory").addEventListener("click", () => showScreen("exerciseHistory"));
    document.querySelector("#createPresetBtn").addEventListener("click", createPreset);
    els.startPresetBtn.addEventListener("click", () => startPreset(els.presetSelect.value));
    els.presetSelect.addEventListener("change", () => {
      currentPresetId = els.presetSelect.value;
    });
    document.querySelector("#showAddForm").addEventListener("click", toggleAddForm);
    els.toggleAdd.addEventListener("click", toggleEditMode);
    document.querySelector("#detailAddSet").addEventListener("click", () => {
      const workout = getCurrentWorkout();
      if (!workout) return;
      workout.sets.push(newSet(workout));
      saveAndRender();
    });
    document.querySelectorAll("[data-go]").forEach((button) => {
      button.addEventListener("click", () => showScreen(button.dataset.go));
    });
    document.querySelectorAll("[data-nav]").forEach((button) => {
      button.addEventListener("click", () => showScreen(button.dataset.nav));
    });
    els.addExerciseForm.addEventListener("submit", addCustomExercise);

    function loadState() {
      try {
        const saved = JSON.parse(localStorage.getItem(storeKey));
        if (saved?.exercises && saved?.workouts) {
          return {
            exercises: saved.exercises,
            workouts: saved.workouts,
            presets: normalizePresets(saved.presets)
          };
        }
      } catch {
        localStorage.removeItem(storeKey);
      }
      return { exercises: starterExercises, workouts: [], presets: [] };
    }

    function normalizePresets(presets) {
      if (!Array.isArray(presets)) return [];
      return presets.map((preset) => ({
        id: preset.id || uid(),
        name: preset.name || "名称未設定",
        exerciseIds: Array.isArray(preset.exerciseIds) ? preset.exerciseIds : []
      }));
    }

    function saveAndRender() {
      localStorage.setItem(storeKey, JSON.stringify(state));
      render();
    }

    function render() {
      els.homeDate.textContent = selectedDate.replaceAll("-", "/");
      renderPresetControls();
      renderHome();
      renderSelect();
      renderDetail();
      renderExerciseHistory();
      renderPresetEditor();
      renderPresetEdit();
      renderHistory();
    }

    function renderPresetControls() {
      if (!state.presets.length) {
        currentPresetId = null;
        els.presetSelect.innerHTML = `<option value="">プリセットなし</option>`;
        els.presetSelect.disabled = true;
        els.startPresetBtn.disabled = true;
        return;
      }
      if (!state.presets.some((preset) => preset.id === currentPresetId)) {
        currentPresetId = state.presets[0].id;
      }
      els.presetSelect.disabled = false;
      els.startPresetBtn.disabled = false;
      els.presetSelect.innerHTML = state.presets.map((preset) => `
        <option value="${preset.id}" ${preset.id === currentPresetId ? "selected" : ""}>${escapeHtml(preset.name)}</option>
      `).join("");
    }

    function renderHome() {
      const workouts = selectedWorkouts();
      const sets = workouts.flatMap((workout) => workout.sets);
      els.statExercises.textContent = workouts.length;
      els.statSets.textContent = sets.length;
      els.statReps.textContent = sets.reduce((sum, set) => sum + number(set.reps), 0);
      els.statVolume.textContent = Math.round(sets.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0));

      if (!workouts.length) {
        els.todayList.innerHTML = `
          <div class="empty">
            <div>
              <strong>この日の種目はまだありません</strong>
              <span>右下の＋から種目を選択して、詳細画面でセットを入力できます。</span>
            </div>
          </div>`;
        return;
      }

      els.todayList.innerHTML = workouts.map((workout, index) => `
        <article class="exercise-card">
          <header class="exercise-head">
            <h2><button class="title-open" data-open-detail="${workout.id}" type="button">${escapeHtml(workout.part)} - ${escapeHtml(workout.name)}</button></h2>
            <button class="chev" data-move-workout="${workout.id}" data-direction="-1" type="button" aria-label="上へ移動" ${index === 0 ? "disabled" : ""}>
              <svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"></path></svg>
            </button>
            <button class="chev" data-move-workout="${workout.id}" data-direction="1" type="button" aria-label="下へ移動" ${index === workouts.length - 1 ? "disabled" : ""}>
              <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"></path></svg>
            </button>
          </header>
          <table class="set-table">
            <thead>
              <tr><th>セット</th><th>重さ</th><th></th><th>回数</th><th>RM</th></tr>
            </thead>
            <tbody>
              ${workout.sets.map((set, index) => homeSetRow(set, index)).join("")}
            </tbody>
          </table>
          <button class="add-set" data-add-set="${workout.id}" type="button" aria-label="セットを追加">
            <span class="plus-muted">+</span>
          </button>
        </article>`).join("");

      bindHomeActions();
    }

    function homeSetRow(set, index) {
      const weight = number(set.weight);
      const reps = number(set.reps);
      return `
        <tr>
          <td class="set-number">${index + 1}</td>
          <td class="weight">${weight ? `${weight.toFixed(1)} <small>Kg</small>` : "自重"}</td>
          <td class="lbs">${weight ? `${(weight * 2.20462).toFixed(2)}Lbs` : "-"}</td>
          <td class="reps">${reps} <small>回</small></td>
          <td class="rm">${weight ? `${calcRm(weight, reps)}Kg` : "-"}</td>
        </tr>`;
    }

    function bindHomeActions() {
      document.querySelectorAll("[data-open-detail]").forEach((button) => {
        button.addEventListener("click", () => {
          currentWorkoutId = button.dataset.openDetail;
          showScreen("detail");
        });
      });
      document.querySelectorAll("[data-add-set]").forEach((button) => {
        button.addEventListener("click", () => {
          const workout = state.workouts.find((item) => item.id === button.dataset.addSet);
          workout.sets.push(newSet(workout));
          currentWorkoutId = workout.id;
          saveAndRender();
          showScreen("detail");
        });
      });
      document.querySelectorAll("[data-move-workout]").forEach((button) => {
        button.addEventListener("click", () => moveWorkout(button.dataset.moveWorkout, Number(button.dataset.direction)));
      });
    }

    function moveWorkout(workoutId, direction) {
      const workouts = selectedWorkouts();
      const index = workouts.findIndex((workout) => workout.id === workoutId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= workouts.length) return;

      const currentGlobalIndex = state.workouts.findIndex((workout) => workout.id === workouts[index].id);
      const nextGlobalIndex = state.workouts.findIndex((workout) => workout.id === workouts[nextIndex].id);
      [state.workouts[currentGlobalIndex], state.workouts[nextGlobalIndex]] = [state.workouts[nextGlobalIndex], state.workouts[currentGlobalIndex]];
      localStorage.setItem(storeKey, JSON.stringify(state));
      render();
    }

    function renderPresetEditor() {
      if (!els.presetList) return;
      if (!state.presets.length) {
        els.presetList.innerHTML = `
          <div class="empty">
            <div>
              <strong>プリセットはまだありません</strong>
              <span>右上の追加から分割法メニューを作成できます。</span>
            </div>
          </div>`;
        return;
      }

      els.presetList.innerHTML = `
        <article class="preset-card">
          ${state.presets.map((preset) => presetListRow(preset)).join("")}
        </article>
      `;

      bindPresetEditorActions();
    }

    function presetListRow(preset) {
      const validCount = preset.exerciseIds.filter((exerciseId) => state.exercises.some((exercise) => exercise.id === exerciseId)).length;
      return `
        <div class="preset-list-row">
          <button class="preset-list-main" data-edit-preset="${preset.id}" type="button">
            <div class="preset-list-name">${escapeHtml(preset.name)}</div>
            <div class="preset-list-count">${validCount}種目</div>
          </button>
          <button class="small-outline" data-edit-preset="${preset.id}" type="button">編集</button>
          <button class="preset-row-btn" data-delete-preset="${preset.id}" type="button" aria-label="プリセット削除">
            <svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 16h10l1-16"></path></svg>
          </button>
        </div>`;
    }

    function renderPresetEdit() {
      if (!els.presetEditor) return;
      const preset = findPreset(currentEditingPresetId);
      if (!preset) {
        els.presetEditor.innerHTML = `
          <div class="empty">
            <div>
              <strong>編集するプリセットを選択してください</strong>
              <span>プリセット管理画面から編集できます。</span>
            </div>
          </div>`;
        return;
      }

      const grouped = groupExercises();
      els.presetEditor.innerHTML = `
        <article class="preset-card">
          <header class="preset-card-head">
            <input class="preset-name-input" data-preset-name="${preset.id}" maxlength="24" value="${escapeHtml(preset.name)}" aria-label="プリセット名">
            <button class="preset-delete" data-delete-preset="${preset.id}" type="button" aria-label="プリセット削除">
              <svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 16h10l1-16"></path></svg>
            </button>
          </header>
          <div>
            ${preset.exerciseIds.length ? preset.exerciseIds.map((exerciseId, index) => presetExerciseRow(preset, exerciseId, index)).join("") : `
              <div class="empty" style="min-height: 120px;">
                <div><strong>種目未登録</strong><span>下の候補から種目を追加してください。</span></div>
              </div>`}
          </div>
          <div class="preset-add">
            <div class="preset-add-title">種目を追加</div>
            ${Array.from(grouped.entries()).map(([part, exercises]) => `
              <div class="preset-add-group">
                <div class="preset-add-part">${escapeHtml(part)}</div>
                <div class="preset-add-options">
                  ${exercises.map((exercise) => `
                    <button data-add-to-preset="${preset.id}" data-exercise-id="${exercise.id}" type="button" ${preset.exerciseIds.includes(exercise.id) ? "disabled" : ""}>
                      ${escapeHtml(exercise.name)}
                    </button>
                  `).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        </article>`;

      bindPresetEditActions();
    }

    function presetExerciseRow(preset, exerciseId, index) {
      const exercise = state.exercises.find((item) => item.id === exerciseId);
      const name = exercise ? `${exercise.part} - ${exercise.name}` : "削除済みの種目";
      return `
        <div class="preset-row">
          <div class="preset-row-name">${escapeHtml(name)}</div>
          <button class="preset-row-btn" data-move-preset-exercise="${preset.id}" data-exercise-id="${exerciseId}" data-direction="-1" type="button" aria-label="上へ移動" ${index === 0 ? "disabled" : ""}>
            <svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"></path></svg>
          </button>
          <button class="preset-row-btn" data-move-preset-exercise="${preset.id}" data-exercise-id="${exerciseId}" data-direction="1" type="button" aria-label="下へ移動" ${index === preset.exerciseIds.length - 1 ? "disabled" : ""}>
            <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"></path></svg>
          </button>
          <button class="preset-row-btn" data-remove-from-preset="${preset.id}" data-exercise-id="${exerciseId}" type="button" aria-label="種目を外す">
            <svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 16h10l1-16"></path></svg>
          </button>
        </div>`;
    }

    function bindPresetEditorActions() {
      els.presetList.querySelectorAll("[data-edit-preset]").forEach((button) => {
        button.addEventListener("click", () => openPresetEdit(button.dataset.editPreset));
      });
      els.presetList.querySelectorAll("[data-delete-preset]").forEach((button) => {
        button.addEventListener("click", () => deletePreset(button.dataset.deletePreset));
      });
    }

    function bindPresetEditActions() {
      els.presetEditor.querySelectorAll("[data-preset-name]").forEach((input) => {
        input.addEventListener("input", () => renamePreset(input.dataset.presetName, input.value));
      });
      els.presetEditor.querySelectorAll("[data-delete-preset]").forEach((button) => {
        button.addEventListener("click", () => deletePreset(button.dataset.deletePreset));
      });
      els.presetEditor.querySelectorAll("[data-add-to-preset]").forEach((button) => {
        button.addEventListener("click", () => addExerciseToPreset(button.dataset.addToPreset, button.dataset.exerciseId));
      });
      els.presetEditor.querySelectorAll("[data-remove-from-preset]").forEach((button) => {
        button.addEventListener("click", () => removeExerciseFromPreset(button.dataset.removeFromPreset, button.dataset.exerciseId));
      });
      els.presetEditor.querySelectorAll("[data-move-preset-exercise]").forEach((button) => {
        button.addEventListener("click", () => movePresetExercise(button.dataset.movePresetExercise, button.dataset.exerciseId, Number(button.dataset.direction)));
      });
    }

    function openPresetEdit(presetId) {
      currentEditingPresetId = presetId;
      showScreen("presetEdit");
    }

    function createPreset() {
      const preset = { id: uid(), name: "新規プリセット", exerciseIds: [] };
      state.presets.unshift(preset);
      currentPresetId = preset.id;
      currentEditingPresetId = preset.id;
      saveAndRender();
      showScreen("presetEdit");
    }

    function renamePreset(presetId, name) {
      const preset = findPreset(presetId);
      if (!preset) return;
      preset.name = name.trim() || "名称未設定";
      localStorage.setItem(storeKey, JSON.stringify(state));
      renderPresetControls();
    }

    function deletePreset(presetId) {
      state.presets = state.presets.filter((preset) => preset.id !== presetId);
      if (currentPresetId === presetId) currentPresetId = state.presets[0]?.id || null;
      if (currentEditingPresetId === presetId) currentEditingPresetId = null;
      saveAndRender();
      showScreen("preset");
    }

    function addExerciseToPreset(presetId, exerciseId) {
      const preset = findPreset(presetId);
      if (!preset || preset.exerciseIds.includes(exerciseId)) return;
      preset.exerciseIds.push(exerciseId);
      saveAndRender();
    }

    function removeExerciseFromPreset(presetId, exerciseId) {
      const preset = findPreset(presetId);
      if (!preset) return;
      preset.exerciseIds = preset.exerciseIds.filter((id) => id !== exerciseId);
      saveAndRender();
    }

    function movePresetExercise(presetId, exerciseId, direction) {
      const preset = findPreset(presetId);
      if (!preset) return;
      const index = preset.exerciseIds.indexOf(exerciseId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= preset.exerciseIds.length) return;
      [preset.exerciseIds[index], preset.exerciseIds[nextIndex]] = [preset.exerciseIds[nextIndex], preset.exerciseIds[index]];
      saveAndRender();
    }

    function startPreset(presetId) {
      const preset = findPreset(presetId);
      if (!preset || !preset.exerciseIds.length) return showToast("プリセットに種目を追加してください");
      const todayExerciseIds = new Set(selectedWorkouts().map((workout) => workout.exerciseId));
      let added = 0;
      preset.exerciseIds.forEach((exerciseId) => {
        if (todayExerciseIds.has(exerciseId)) return;
        const exercise = state.exercises.find((item) => item.id === exerciseId);
        if (!exercise) return;
        state.workouts.push({
          id: uid(),
          exerciseId,
          date: selectedDate,
          name: exercise.name,
          part: exercise.part,
          sets: Array.from({ length: 5 }, () => newSet())
        });
        todayExerciseIds.add(exerciseId);
        added += 1;
      });
      if (!added) return showToast("すでに追加されています");
      localStorage.setItem(storeKey, JSON.stringify(state));
      render();
      showScreen("home");
      showToast(`${added}種目を追加しました`);
    }

    function findPreset(presetId) {
      return state.presets.find((preset) => preset.id === presetId);
    }

    function renderSelect() {
      els.toggleAdd.textContent = editMode ? "Done" : "Edit";
      const grouped = groupExercises();
      els.exerciseGroups.innerHTML = Array.from(grouped.entries()).map(([part, exercises]) => {
        const expanded = expandedParts.has(part);
        const visibleExercises = editMode || expanded ? exercises : exercises.slice(0, 4);
        return `
          <section class="part-card" data-part-card="${escapeHtml(part)}">
            <div class="part-title">${escapeHtml(part)}${editMode ? "" : " - 最近"}</div>
            <div class="exercise-list" data-part-list="${escapeHtml(part)}">
              ${visibleExercises.map((exercise) => exerciseOption(exercise)).join("")}
            </div>
            ${editMode ? "" : `
              <div class="part-foot">
                <button data-part-add="${escapeHtml(part)}" type="button">種目を追加</button>
                ${exercises.length > 4 ? `<button data-toggle-part="${escapeHtml(part)}" type="button">${expanded ? "閉じる" : "すべて表示"}</button>` : "<span></span>"}
              </div>`}
          </section>`;
      }).join("");

      if (editMode) {
        bindSelectEditActions();
        return;
      }
      document.querySelectorAll("[data-select-exercise]").forEach((button) => {
        button.addEventListener("click", () => addExerciseToToday(button.dataset.selectExercise));
      });
      document.querySelectorAll("[data-part-add]").forEach((button) => {
        button.addEventListener("click", () => {
          els.partInput.value = button.dataset.partAdd;
          toggleAddForm(true);
          els.nameInput.focus();
        });
      });
      document.querySelectorAll("[data-toggle-part]").forEach((button) => {
        button.addEventListener("click", () => togglePartExpanded(button.dataset.togglePart));
      });
    }

    function togglePartExpanded(part) {
      if (expandedParts.has(part)) {
        expandedParts.delete(part);
      } else {
        expandedParts.add(part);
      }
      renderSelect();
    }

    function exerciseOption(exercise) {
      if (editMode) {
        return `
          <div class="exercise-option edit-row" data-exercise-row="${exercise.id}" draggable="true">
            <span class="drag-handle" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 6h8"></path><path d="M8 12h8"></path><path d="M8 18h8"></path></svg>
            </span>
            <span class="exercise-name">${escapeHtml(exercise.name)}</span>
            <button class="delete-exercise" data-delete-exercise="${exercise.id}" type="button" aria-label="種目を削除">
              <svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 16h10l1-16"></path></svg>
            </button>
          </div>`;
      }
      return `
            <button class="exercise-option" data-select-exercise="${exercise.id}" type="button">
              ${escapeHtml(exercise.name)}
            </button>`;
    }

    function bindSelectEditActions() {
      els.exerciseGroups.querySelectorAll("[data-exercise-row]").forEach((row) => {
        row.addEventListener("pointerdown", startPointerExerciseDrag);
        row.addEventListener("dragstart", (event) => {
          draggingExerciseId = row.dataset.exerciseRow;
          row.classList.add("dragging");
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", draggingExerciseId);
        });
        row.addEventListener("dragend", () => {
          row.classList.remove("dragging");
          draggingExerciseId = null;
          els.exerciseGroups.querySelectorAll(".drop-target").forEach((list) => list.classList.remove("drop-target"));
        });
      });
      els.exerciseGroups.querySelectorAll("[data-part-list]").forEach((list) => {
        list.addEventListener("dragover", (event) => {
          event.preventDefault();
          list.classList.add("drop-target");
          const dragging = els.exerciseGroups.querySelector(".dragging");
          if (!dragging) return;
          const after = dragAfterElement(list, event.clientY);
          if (after) {
            list.insertBefore(dragging, after);
          } else {
            list.appendChild(dragging);
          }
        });
        list.addEventListener("dragleave", () => list.classList.remove("drop-target"));
        list.addEventListener("drop", (event) => {
          event.preventDefault();
          list.classList.remove("drop-target");
          commitExerciseOrder();
        });
      });
      els.exerciseGroups.querySelectorAll("[data-delete-exercise]").forEach((button) => {
        button.addEventListener("click", () => deleteExercise(button.dataset.deleteExercise));
      });
    }

    function startPointerExerciseDrag(event) {
      if (event.target.closest("[data-delete-exercise]")) return;
      const row = event.currentTarget;
      let moved = false;
      draggingExerciseId = row.dataset.exerciseRow;
      row.setPointerCapture(event.pointerId);

      const move = (moveEvent) => {
        moved = true;
        row.classList.add("dragging");
        const list = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest("[data-part-list]");
        if (!list) return;
        els.exerciseGroups.querySelectorAll(".drop-target").forEach((item) => {
          item.classList.toggle("drop-target", item === list);
        });
        const after = dragAfterElement(list, moveEvent.clientY);
        if (after) {
          list.insertBefore(row, after);
        } else {
          list.appendChild(row);
        }
      };

      const end = () => {
        row.classList.remove("dragging");
        els.exerciseGroups.querySelectorAll(".drop-target").forEach((list) => list.classList.remove("drop-target"));
        row.removeEventListener("pointermove", move);
        row.removeEventListener("pointerup", end);
        row.removeEventListener("pointercancel", end);
        if (moved) commitExerciseOrder();
        draggingExerciseId = null;
      };

      row.addEventListener("pointermove", move);
      row.addEventListener("pointerup", end);
      row.addEventListener("pointercancel", end);
    }

    function dragAfterElement(list, y) {
      return Array.from(list.querySelectorAll("[data-exercise-row]:not(.dragging)")).reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
      }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }

    function commitExerciseOrder() {
      const byId = new Map(state.exercises.map((exercise) => [exercise.id, exercise]));
      const ordered = [];
      els.exerciseGroups.querySelectorAll("[data-exercise-row]").forEach((row) => {
        const exercise = byId.get(row.dataset.exerciseRow);
        if (!exercise) return;
        exercise.part = row.closest("[data-part-list]").dataset.partList;
        syncWorkoutExercise(exercise);
        ordered.push(exercise);
      });
      state.exercises.forEach((exercise) => {
        if (!ordered.includes(exercise)) ordered.push(exercise);
      });
      state.exercises = ordered;
      localStorage.setItem(storeKey, JSON.stringify(state));
      renderSelect();
      renderHome();
    }

    function deleteExercise(exerciseId) {
      const exercise = state.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return;
      state.exercises = state.exercises.filter((item) => item.id !== exerciseId);
      state.presets.forEach((preset) => {
        preset.exerciseIds = preset.exerciseIds.filter((id) => id !== exerciseId);
      });
      saveAndRender();
      showToast(`${exercise.name}を削除しました`);
    }

    function groupExercises() {
      return state.exercises.reduce((groups, exercise) => {
        if (!groups.has(exercise.part)) groups.set(exercise.part, []);
        groups.get(exercise.part).push(exercise);
        return groups;
      }, new Map());
    }

    function renderDetail() {
      const workout = getCurrentWorkout();
      if (!workout) {
        els.detailTitle.textContent = "";
        els.detailSets.innerHTML = "";
        els.lastRecord.hidden = true;
        return;
      }
      els.detailTitle.textContent = workout.name;
      const lastRecord = lastExerciseRecord(workout);
      els.lastRecord.hidden = !lastRecord;
      if (lastRecord) {
        els.lastRecord.innerHTML = `
          <strong>Last Record : ${lastRecord.date.replaceAll("-", "/")}</strong>
          ${lastRecord.sets.map((set, index) => `${index + 1}　${formatWeight(set.weight)} kg ×　${number(set.reps)} reps`).join("<br>")}`;
      }
      els.detailSets.innerHTML = workout.sets.map((set, index) => `
        <div class="detail-row" data-row="${set.id}">
          <div class="num">${index + 1}</div>
          <label class="field">
            <input data-field="weight" data-set="${set.id}" type="number" step="0.5" min="0" inputmode="decimal" value="${escapeHtml(set.weight)}">
            <span class="unit">kg</span>
          </label>
          <label class="field">
            <input data-field="reps" data-set="${set.id}" type="number" step="1" min="1" inputmode="numeric" value="${escapeHtml(set.reps)}">
            <span class="unit">回</span>
          </label>
          <div class="rm-value">${calcRm(number(set.weight), number(set.reps))} kg</div>
          <button class="check" data-delete-set="${set.id}" type="button" aria-label="セット削除">
            <svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 16h10l1-16"></path></svg>
          </button>
          <div class="note">メモ</div>
        </div>`).join("");
      bindDetailActions();
    }

    function bindDetailActions() {
      els.detailSets.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
          const set = findSet(input.dataset.set);
          if (!set) return;
          set[input.dataset.field] = input.value;
          localStorage.setItem(storeKey, JSON.stringify(state));
          renderHome();
          updateDetailRm(input.closest(".detail-row"), set);
        });
      });
      els.detailSets.querySelectorAll("[data-delete-set]").forEach((button) => {
        button.addEventListener("click", () => {
          const workout = getCurrentWorkout();
          workout.sets = workout.sets.filter((set) => set.id !== button.dataset.deleteSet);
          saveAndRender();
        });
      });
    }

    function renderExerciseHistory() {
      const workout = getCurrentWorkout();
      if (!workout) {
        els.exerciseHistoryTitle.textContent = "";
        els.exerciseHistoryList.innerHTML = emptyExerciseHistoryHtml();
        return;
      }
      els.exerciseHistoryTitle.textContent = workout.name;
      const histories = state.workouts
        .filter((item) => item.exerciseId === workout.exerciseId)
        .sort((a, b) => b.date.localeCompare(a.date));

      if (!histories.length) {
        els.exerciseHistoryList.innerHTML = emptyExerciseHistoryHtml();
        return;
      }

      els.exerciseHistoryList.innerHTML = histories.map((item) => {
        const total = item.sets.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0);
        const maxRm = item.sets.reduce((max, set) => Math.max(max, Number(calcRm(number(set.weight), number(set.reps)))), 0);
        return `
          <article class="history-card">
            <header class="history-card-head">
              <div class="history-card-date">${item.date.replaceAll("-", "/")}</div>
              <div class="history-card-total">TOTAL : ${total.toFixed(1)}Kg MAX 1RM : ${maxRm.toFixed(1)}Kg</div>
            </header>
            <table class="history-set-table">
              <thead>
                <tr><th>セット</th><th>重さ</th><th>回数</th><th>RM</th><th>補助</th></tr>
              </thead>
              <tbody>
                ${item.sets.map((set, index) => exerciseHistorySetRow(set, index)).join("")}
              </tbody>
            </table>
          </article>`;
      }).join("");
    }

    function exerciseHistorySetRow(set, index) {
      const weight = number(set.weight);
      const reps = number(set.reps);
      return `
        <tr>
          <td class="history-num">${index + 1}</td>
          <td class="history-weight">${weight ? `${weight.toFixed(1)}<small> kg</small>` : "自重"}</td>
          <td class="history-reps">${reps}<small> 回</small></td>
          <td class="history-rm">${weight ? `${calcRm(weight, reps)}kg` : "-"}</td>
          <td class="history-assist">-</td>
        </tr>`;
    }

    function emptyExerciseHistoryHtml() {
      return `
        <div class="empty">
          <div>
            <strong>この種目の履歴はまだありません</strong>
            <span>記録するとここに日別のセット履歴が表示されます。</span>
          </div>
        </div>`;
    }

    function renderHistory() {
      const monthDate = parseDate(selectedDate);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const trainedDates = new Set(state.workouts.map((workout) => workout.date));
      const cells = calendarCells(year, month);
      els.historyList.innerHTML = `
        <div class="muscle-tabs" aria-label="部位フィルター">
          ${["ALL", "胸", "背中", "脚", "肩", "腕", "HIIT"].map((part, index) => `
            <button class="muscle-tab ${index === 0 ? "active" : ""}" type="button">${part}</button>
          `).join("")}
        </div>
        <div class="calendar-mode" aria-label="表示切替">
          <button class="active" type="button">カレンダー</button>
          <button type="button">グラフ</button>
        </div>
        <div class="calendar-head">
          <button class="month-btn" data-month="-1" type="button">${prevMonthLabel(year, month)}</button>
          <div class="calendar-month">${year}年 ${String(month + 1).padStart(2, "0")}月</div>
          <button class="month-btn" data-month="1" type="button">${nextMonthLabel(year, month)}</button>
        </div>
        <div class="calendar-grid">
          ${["日", "月", "火", "水", "木", "金", "土"].map((day) => `<div class="weekday">${day}</div>`).join("")}
          ${cells.map((cell) => {
            const trained = trainedDates.has(cell.date);
            const selected = trained && cell.date === selectedDate;
            return `
              <div class="day-cell ${cell.inMonth ? "" : "other"}">
                <button class="day-btn ${trained ? "trained" : ""} ${selected ? "selected" : ""}" data-date="${cell.date}" type="button">
                  ${cell.day}
                </button>
              </div>`;
          }).join("")}
        </div>`;

      els.historyList.querySelectorAll("[data-date]").forEach((button) => {
        button.addEventListener("click", () => {
          selectedDate = button.dataset.date;
          currentWorkoutId = selectedWorkouts()[0]?.id || null;
          showScreen("home");
        });
      });
      els.historyList.querySelectorAll("[data-month]").forEach((button) => {
        button.addEventListener("click", () => {
          const next = parseDate(selectedDate);
          next.setMonth(next.getMonth() + Number(button.dataset.month), 1);
          selectedDate = localDate(next);
          currentWorkoutId = selectedWorkouts()[0]?.id || null;
          render();
        });
      });
    }

    function addExerciseToToday(exerciseId) {
      const exercise = state.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return;
      let workout = selectedWorkouts().find((item) => item.exerciseId === exerciseId);
      if (!workout) {
        workout = {
          id: uid(),
          exerciseId,
          date: selectedDate,
          name: exercise.name,
          part: exercise.part,
          sets: Array.from({ length: 5 }, () => newSet())
        };
        state.workouts.push(workout);
      }
      currentWorkoutId = workout.id;
      saveAndRender();
      showScreen("detail");
    }

    function addCustomExercise(event) {
      event.preventDefault();
      const part = els.partInput.value.trim() || "その他";
      const name = els.nameInput.value.trim();
      if (!name) return showToast("種目名を入力してください");
      const exercise = {
        id: uid(),
        part,
        name,
        weight: 0,
        reps: 10
      };
      state.exercises.unshift(exercise);
      els.nameInput.value = "";
      saveAndRender();
      addExerciseToToday(exercise.id);
    }

    function toggleEditMode() {
      editMode = !editMode;
      if (editMode) els.addExerciseForm.hidden = true;
      renderSelect();
    }

    function showScreen(name) {
      if (name !== "detail") cleanupBlankDetailSets();
      if (name !== "select") editMode = false;
      document.querySelectorAll(".screen").forEach((screen) => {
        screen.classList.toggle("active", screen.id === `${name}Screen`);
      });
      document.querySelectorAll("[data-nav]").forEach((item) => {
        item.classList.toggle("active", item.dataset.nav === name);
      });
      render();
    }

    function toggleAddForm(force) {
      els.addExerciseForm.hidden = typeof force === "boolean" ? !force : !els.addExerciseForm.hidden;
      if (!els.addExerciseForm.hidden) els.nameInput.focus();
    }

    function moveDate(days) {
      const next = parseDate(selectedDate);
      next.setDate(next.getDate() + days);
      selectedDate = localDate(next);
      currentWorkoutId = selectedWorkouts()[0]?.id || null;
      showScreen("home");
    }

    function calendarCells(year, month) {
      const first = new Date(year, month, 1);
      const start = new Date(year, month, 1 - first.getDay());
      return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return {
          date: localDate(date),
          day: date.getDate(),
          inMonth: date.getMonth() === month
        };
      });
    }

    function prevMonthLabel(year, month) {
      const date = new Date(year, month - 1, 1);
      return `${String(date.getMonth() + 1).padStart(2, "0")}月`;
    }

    function nextMonthLabel(year, month) {
      const date = new Date(year, month + 1, 1);
      return `${String(date.getMonth() + 1).padStart(2, "0")}月`;
    }

    function selectedWorkouts() {
      return state.workouts.filter((workout) => workout.date === selectedDate);
    }

    function getCurrentWorkout() {
      const current = state.workouts.find((workout) => workout.id === currentWorkoutId);
      if (current?.date === selectedDate) return current;
      return selectedWorkouts()[0];
    }

    function cleanupBlankDetailSets() {
      if (!document.querySelector("#detailScreen").classList.contains("active")) return;
      const workout = getCurrentWorkout();
      if (!workout) return;
      const nextSets = workout.sets.filter((set) => !isBlank(set.weight) || !isBlank(set.reps));
      if (nextSets.length === workout.sets.length && nextSets.length) return;
      workout.sets = nextSets;
      if (!workout.sets.length) {
        state.workouts = state.workouts.filter((item) => item.id !== workout.id);
        currentWorkoutId = selectedWorkouts()[0]?.id || null;
      }
      localStorage.setItem(storeKey, JSON.stringify(state));
    }

    function isBlank(value) {
      return String(value ?? "").trim() === "";
    }

    function lastExerciseRecord(workout) {
      return state.workouts
        .filter((item) => item.exerciseId === workout.exerciseId && item.date < selectedDate)
        .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
    }

    function newSet() {
      return { id: uid(), weight: "", reps: "" };
    }

    function findSet(setId) {
      for (const workout of state.workouts) {
        const set = workout.sets.find((item) => item.id === setId);
        if (set) return set;
      }
      return null;
    }

    function syncWorkoutExercise(exercise) {
      state.workouts.forEach((workout) => {
        if (workout.exerciseId !== exercise.id) return;
        workout.name = exercise.name;
        workout.part = exercise.part;
      });
    }

    function updateDetailRm(row, set) {
      const rm = row?.querySelector(".rm-value");
      if (rm) rm.textContent = `${calcRm(number(set.weight), number(set.reps))} kg`;
    }

    function calcRm(weight, reps) {
      if (!weight || !reps) return "0.0";
      return (weight * (1 + reps / 30)).toFixed(reps > 3 ? 1 : 2);
    }

    function formatWeight(value) {
      return number(value).toFixed(1);
    }

    function number(value) {
      return Number(value) || 0;
    }

    function localDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function parseDate(value) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    function uid() {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function showToast(message) {
      els.toast.textContent = message;
      els.toast.classList.add("show");
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 1800);
    }

    render();
