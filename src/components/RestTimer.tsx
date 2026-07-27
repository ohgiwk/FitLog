import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { defaultRestTimerSeconds, restTimerPresetSeconds } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

const exitAnimationMilliseconds = 420;
const alarmSoundPath = `${import.meta.env.BASE_URL}Clock-Alarm.mp3`;
export const restTimerStartEvent = 'fitlog:start-rest-timer';

type RestTimerProps = {
  defaultSeconds: number;
  autoStartOnIntensity: boolean;
  onChangeDefaultSeconds: (seconds: number) => void;
  onChangeAutoStart: (enabled: boolean) => void;
};

export function RestTimer({
  defaultSeconds,
  autoStartOnIntensity,
  onChangeDefaultSeconds,
  onChangeAutoStart,
}: RestTimerProps) {
  const initialSeconds = clampSeconds(defaultSeconds);
  const [selectedSeconds, setSelectedSeconds] = useState(initialSeconds);
  const [remaining, setRemaining] = useState(initialSeconds);
  const [remainingMilliseconds, setRemainingMilliseconds] = useState(initialSeconds * 1000);
  const [durationMilliseconds, setDurationMilliseconds] = useState(initialSeconds * 1000);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [showRunningTimer, setShowRunningTimer] = useState(false);
  const [timerExiting, setTimerExiting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSeconds, setSettingsSeconds] = useState(String(initialSeconds));
  const [settingsAutoStart, setSettingsAutoStart] = useState(autoStartOnIntensity);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmBufferRef = useRef<AudioBuffer | null>(null);
  const alarmBufferPromiseRef = useRef<Promise<AudioBuffer | null> | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);

  const running = endTime !== null;
  const exiting = timerExiting;
  const progressOffset = showRunningTimer
    ? Math.min(100, Math.max(0, 100 - (remainingMilliseconds / durationMilliseconds) * 100))
    : 0;

  useEffect(() => {
    return () => clearExitTimeout();
  }, []);

  useEffect(() => {
    if (running) return;
    const nextSeconds = clampSeconds(defaultSeconds);
    setSelectedSeconds(nextSeconds);
    setRemaining(nextSeconds);
  }, [defaultSeconds]);

  useEffect(() => {
    window.addEventListener(restTimerStartEvent, startTimer);
    return () => window.removeEventListener(restTimerStartEvent, startTimer);
  });

  useEffect(() => {
    if (!endTime) return;

    const timer = window.setInterval(() => {
      const nextRemainingMilliseconds = Math.max(0, endTime - Date.now());
      const nextRemaining = Math.ceil(nextRemainingMilliseconds / 1000);
      setRemainingMilliseconds(nextRemainingMilliseconds);
      setRemaining(nextRemaining);
      if (nextRemaining === 0) {
        window.clearInterval(timer);
        hideRunningTimer();
        setEndTime(null);
        void playAlert(
          audioContextRef.current,
          alarmBufferRef.current,
          alarmBufferPromiseRef.current,
        );
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [endTime]);

  function openSettings() {
    setSettingsSeconds(String(defaultSeconds));
    setSettingsAutoStart(autoStartOnIntensity);
    setSettingsOpen(true);
  }

  function updateSettingsSeconds(value: string) {
    setSettingsSeconds(value.replace(/[^\d]/g, '').slice(0, 3));
  }

  function saveSettings() {
    const seconds = clampSeconds(settingsSeconds);
    setSelectedSeconds(seconds);
    setRemaining(seconds);
    onChangeDefaultSeconds(seconds);
    onChangeAutoStart(settingsAutoStart);
    setSettingsOpen(false);
  }

  function toggleTimer() {
    if (running) {
      stopTimer();
      return;
    }

    startTimer();
  }

  function startTimer() {
    const seconds = clampSeconds(selectedSeconds);
    const context = getAudioContext(audioContextRef.current);
    audioContextRef.current = context;
    void context?.resume();
    if (context) {
      alarmBufferPromiseRef.current = prepareAlertSound(context, alarmBufferRef.current).then(
        (buffer) => {
          alarmBufferRef.current = buffer;
          return buffer;
        },
      );
    }
    const duration = seconds * 1000;
    setSelectedSeconds(seconds);
    setRemaining(seconds);
    setRemainingMilliseconds(duration);
    setDurationMilliseconds(duration);
    showActiveTimer();
    setEndTime(Date.now() + duration);
  }

  function stopTimer() {
    hideRunningTimer();
    setEndTime(null);
  }

  function showActiveTimer() {
    clearExitTimeout();
    setShowRunningTimer(true);
    setTimerExiting(false);
  }

  function hideRunningTimer() {
    setTimerExiting(true);
    clearExitTimeout();
    exitTimeoutRef.current = window.setTimeout(() => {
      setShowRunningTimer(false);
      setTimerExiting(false);
      exitTimeoutRef.current = null;
    }, exitAnimationMilliseconds);
  }

  function clearExitTimeout() {
    if (exitTimeoutRef.current === null) return;
    window.clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = null;
  }

  const timer = (
    <>
      {showRunningTimer && (
        <button
          className={`rest-timer-overlay ${exiting ? 'exiting' : ''}`}
          type="button"
          aria-label="レストタイマーを停止"
          onClick={stopTimer}
        />
      )}
      <div
        className={`rest-timer ${showRunningTimer ? 'running' : ''} ${exiting ? 'exiting' : ''}`}
        aria-label="レストタイマー"
      >
        {showRunningTimer ? (
          <>
            <svg className="rest-timer-label-arc" viewBox="0 0 196 58" aria-hidden="true">
              <defs>
                <path id="rest-timer-label-path" d="M 36 71 A 68 68 0 0 1 160 71" />
              </defs>
              <text className="rest-timer-label-outline">
                <textPath href="#rest-timer-label-path" startOffset="50%" textAnchor="middle">
                  REST
                </textPath>
              </text>
              <text className="rest-timer-label-fill">
                <textPath href="#rest-timer-label-path" startOffset="50%" textAnchor="middle">
                  REST
                </textPath>
              </text>
            </svg>
            <div className="rest-timer-dial">
              <svg className="rest-timer-progress" viewBox="0 0 100 100" aria-hidden="true">
                <circle className="rest-timer-progress-track" cx="50" cy="50" r="46" />
                <circle
                  className="rest-timer-progress-value"
                  cx="50"
                  cy="50"
                  r="46"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={progressOffset}
                />
              </svg>
              <div className="rest-timer-countdown">
                <strong aria-live="polite">{remaining}</strong>
                <button type="button" onClick={toggleTimer}>
                  STOP
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <TimerIcon />
            <button
              className="rest-timer-seconds-button"
              type="button"
              aria-label={`レストタイマー設定、現在${selectedSeconds}秒`}
              onClick={openSettings}
            >
              {selectedSeconds}
            </button>
            <span>秒</span>
            <button type="button" onClick={toggleTimer}>
              START
            </button>
          </>
        )}
      </div>
      {settingsOpen && (
        <ConfirmDialog
          className="rest-timer-settings-dialog"
          title="レストタイマー設定"
          labelledBy="rest-timer-settings-title"
          onClose={() => setSettingsOpen(false)}
        >
          <div className="rest-timer-settings-field">
            <span>デフォルト秒数</span>
            <div className="rest-timer-preset-buttons" aria-label="デフォルト秒数">
              {restTimerPresetSeconds.map((seconds) => (
                <button
                  className={settingsSeconds === String(seconds) ? 'active' : ''}
                  type="button"
                  key={seconds}
                  aria-pressed={settingsSeconds === String(seconds)}
                  onClick={() => setSettingsSeconds(String(seconds))}
                >
                  {seconds}秒
                </button>
              ))}
            </div>
            <label className="rest-timer-custom-seconds">
              <span>自由入力</span>
              <span className="rest-timer-custom-seconds-input">
                <input
                  aria-label="レストタイマーのデフォルト秒数を入力"
                  type="number"
                  min="1"
                  max="999"
                  inputMode="numeric"
                  value={settingsSeconds}
                  onChange={(event) => updateSettingsSeconds(event.target.value)}
                />
                <span>秒</span>
              </span>
            </label>
          </div>
          <div className="rest-timer-settings-field">
            <span>強度入力時に開始</span>
            <div className="unit-switch" role="group" aria-label="強度入力時の自動開始">
              <button
                className={`unit-switch-button ${settingsAutoStart ? 'active' : ''}`}
                type="button"
                aria-pressed={settingsAutoStart}
                onClick={() => setSettingsAutoStart(true)}
              >
                ON
              </button>
              <button
                className={`unit-switch-button ${settingsAutoStart ? '' : 'active'}`}
                type="button"
                aria-pressed={!settingsAutoStart}
                onClick={() => setSettingsAutoStart(false)}
              >
                OFF
              </button>
            </div>
          </div>
          <div className="confirm-actions">
            <button className="small-outline" type="button" onClick={() => setSettingsOpen(false)}>
              キャンセル
            </button>
            <button className="small-primary" type="button" onClick={saveSettings}>
              保存
            </button>
          </div>
        </ConfirmDialog>
      )}
    </>
  );

  return createPortal(timer, document.body);
}

function TimerIcon() {
  return (
    <svg className="rest-timer-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="13" r="8" />
      <path d="M9 3h6" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

function clampSeconds(value: string | number) {
  return Math.max(1, Math.min(999, Number(value) || defaultRestTimerSeconds));
}

function getAudioContext(context: AudioContext | null) {
  if (context) return context;
  if (!window.AudioContext) return null;
  return new window.AudioContext();
}

async function prepareAlertSound(context: AudioContext, currentBuffer: AudioBuffer | null) {
  if (currentBuffer) return currentBuffer;

  try {
    const response = await fetch(alarmSoundPath);
    const arrayBuffer = await response.arrayBuffer();
    return context.decodeAudioData(arrayBuffer);
  } catch {
    return null;
  }
}

async function playAlert(
  context: AudioContext | null,
  currentBuffer: AudioBuffer | null,
  bufferPromise: Promise<AudioBuffer | null> | null,
) {
  if (!context) return;
  await context.resume();
  const buffer = currentBuffer ?? (await bufferPromise);
  if (!buffer) return;

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
}
