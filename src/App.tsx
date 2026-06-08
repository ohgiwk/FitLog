import { CalendarIcon, HomeIcon } from "./icons";
import { useFitLog } from "./hooks/useFitLog";
import { DetailScreen } from "./screens/DetailScreen";
import { ExerciseHistoryScreen } from "./screens/ExerciseHistoryScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { PresetEditScreen } from "./screens/PresetEditScreen";
import { PresetListScreen } from "./screens/PresetListScreen";
import { SelectScreen } from "./screens/SelectScreen";

export function App() {
  const fitLog = useFitLog();
  const { actions } = fitLog;

  return (
    <>
      <main className="app">
        {fitLog.screen === "home" && (
          <HomeScreen
            selectedDate={fitLog.selectedDate}
            selectedWorkouts={fitLog.selectedWorkouts}
            selectedPlannedParts={fitLog.selectedPlannedParts}
            presets={fitLog.state.presets}
            currentPreset={fitLog.currentPreset}
            onMoveDate={actions.moveDate}
            onSelectPreset={actions.selectPreset}
            onStartPreset={actions.startPreset}
            onOpenPresets={() => actions.setScreen("preset")}
            onOpenSelect={() => actions.setScreen("select")}
            onOpenDetail={(workoutId) => {
              actions.setCurrentWorkoutId(workoutId);
              actions.setScreen("detail");
            }}
            onDeleteWorkout={actions.deleteWorkout}
          />
        )}

        {fitLog.screen === "select" && (
          <SelectScreen
            groupedExercises={fitLog.groupedExercises}
            partRecentLabels={fitLog.partRecentLabels}
            editMode={fitLog.editMode}
            addFormOpen={fitLog.addFormOpen}
            partInput={fitLog.partInput}
            nameInput={fitLog.nameInput}
            measurementTypeInput={fitLog.measurementTypeInput}
            expandedParts={fitLog.expandedParts}
            draggingExerciseId={fitLog.draggingExerciseId}
            onBack={() => actions.setScreen("home")}
            onToggleEditMode={() => {
              actions.setEditMode(!fitLog.editMode);
              if (!fitLog.editMode) actions.setAddFormOpen(false);
            }}
            onToggleAddForm={() => actions.setAddFormOpen(!fitLog.addFormOpen)}
            onPartInput={actions.setPartInput}
            onNameInput={actions.setNameInput}
            onMeasurementTypeInput={actions.setMeasurementTypeInput}
            onAddCustomExercise={actions.addCustomExercise}
            onAddExercise={actions.addExerciseToToday}
            onStartDrag={actions.startPointerExerciseDrag}
            onCommitOrder={(rows) => {
              actions.commitExerciseOrder(rows);
              actions.setDraggingExerciseId(null);
            }}
            onDeleteExercise={actions.deleteExercise}
            onUpdateExerciseMeasurementType={actions.updateExerciseMeasurementType}
            onTogglePartExpanded={actions.togglePartExpanded}
            onSetPartAndOpenForm={(part) => {
              actions.setPartInput(part);
              actions.setAddFormOpen(true);
            }}
          />
        )}

        {fitLog.screen === "detail" && fitLog.currentWorkout && (
          <DetailScreen
            workout={fitLog.currentWorkout}
            selectedDate={fitLog.selectedDate}
            workouts={fitLog.state.workouts}
            onBack={() => actions.setScreen("home")}
            onOpenHistory={() => actions.setScreen("exerciseHistory")}
            onUpdateSet={actions.updateSet}
            onUpdateSetIntensity={actions.updateSetIntensity}
            onDeleteSet={actions.deleteSet}
            onAddSet={actions.addSet}
          />
        )}

        {fitLog.screen === "exerciseHistory" && fitLog.currentWorkout && (
          <ExerciseHistoryScreen workout={fitLog.currentWorkout} workouts={fitLog.state.workouts} onBack={() => actions.setScreen("detail")} />
        )}

        {fitLog.screen === "preset" && (
          <PresetListScreen
            presets={fitLog.state.presets}
            exercises={fitLog.state.exercises}
            onBack={() => actions.setScreen("home")}
            onCreate={actions.createPreset}
            onEdit={(presetId) => {
              actions.setCurrentEditingPresetId(presetId);
              actions.setScreen("presetEdit");
            }}
            onDelete={actions.deletePreset}
          />
        )}

        {fitLog.screen === "presetEdit" && (
          <PresetEditScreen
            preset={fitLog.editingPreset}
            exercises={fitLog.state.exercises}
            groupedExercises={fitLog.groupedExercises}
            onBack={() => actions.setScreen("preset")}
            onRename={actions.renamePreset}
            onDelete={actions.deletePreset}
            onAdd={actions.addExerciseToPreset}
            onRemove={actions.removeExerciseFromPreset}
            onMove={actions.movePresetExercise}
          />
        )}

        {fitLog.screen === "history" && (
          <HistoryScreen
            selectedDate={fitLog.selectedDate}
            workouts={fitLog.state.workouts}
            trainingDays={fitLog.state.trainingDays}
            trainingPlans={fitLog.state.trainingPlans}
            splitPartOptions={fitLog.splitPartOptions}
            partFilter={fitLog.historyPartFilter}
            onPartFilter={actions.setHistoryPartFilter}
            onSelectDate={(date) => {
              actions.selectDate(date);
              actions.setCurrentWorkoutId(null);
              actions.setScreen("home");
            }}
            onMoveMonth={actions.moveMonth}
            onAddTrainingPlan={actions.addTrainingPlan}
            onDeleteTrainingPlan={actions.deleteTrainingPlan}
          />
        )}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${fitLog.screen === "home" ? "active" : ""}`} type="button" onClick={() => actions.setScreen("home")}><HomeIcon /><span>ホーム</span></button>
        <button className={`nav-item ${fitLog.screen === "history" ? "active" : ""}`} type="button" onClick={() => actions.setScreen("history")}><CalendarIcon /><span>履歴/計画</span></button>
      </nav>
      <div className={`toast ${fitLog.toast ? "show" : ""}`} role="status" aria-live="polite">{fitLog.toast}</div>
    </>
  );
}
