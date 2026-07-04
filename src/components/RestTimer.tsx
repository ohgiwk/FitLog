import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const defaultSeconds = 60;
const exitAnimationMilliseconds = 420;
const alarmSoundPath = `${import.meta.env.BASE_URL}Clock-Alarm.mp3`;

export function RestTimer() {
  const [secondsInput, setSecondsInput] = useState(String(defaultSeconds));
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [remainingMilliseconds, setRemainingMilliseconds] = useState(defaultSeconds * 1000);
  const [durationMilliseconds, setDurationMilliseconds] = useState(defaultSeconds * 1000);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [showRunningTimer, setShowRunningTimer] = useState(false);
  const [timerExiting, setTimerExiting] = useState(false);
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
        void playAlert(audioContextRef.current, alarmBufferRef.current, alarmBufferPromiseRef.current);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [endTime]);

  function updateSeconds(value: string) {
    const nextInput = value.replace(/[^\d]/g, '').slice(0, 3);
    setSecondsInput(nextInput);
    if (!running && nextInput) setRemaining(clampSeconds(nextInput));
  }

  function toggleTimer() {
    if (running) {
      hideRunningTimer();
      setEndTime(null);
      return;
    }

    const seconds = clampSeconds(secondsInput);
    const context = getAudioContext(audioContextRef.current);
    audioContextRef.current = context;
    void context?.resume();
    if (context) {
      alarmBufferPromiseRef.current = prepareAlertSound(context, alarmBufferRef.current).then((buffer) => {
        alarmBufferRef.current = buffer;
        return buffer;
      });
    }
    const duration = seconds * 1000;
    setSecondsInput(String(seconds));
    setRemaining(seconds);
    setRemainingMilliseconds(duration);
    setDurationMilliseconds(duration);
    showActiveTimer();
    setEndTime(Date.now() + duration);
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
      {showRunningTimer && <div className={`rest-timer-overlay ${exiting ? 'exiting' : ''}`} aria-hidden="true" />}
      <div className={`rest-timer ${showRunningTimer ? 'running' : ''} ${exiting ? 'exiting' : ''}`} aria-label="レストタイマー">
        {showRunningTimer ? (
          <>
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
          </>
        ) : (
          <>
            <TimerIcon />
            <input
              aria-label="タイマー秒数"
              type="number"
              min="1"
              max="999"
              inputMode="numeric"
              value={secondsInput}
              onChange={(event) => updateSeconds(event.target.value)}
            />
            <span>秒</span>
            <button type="button" onClick={toggleTimer}>
              START
            </button>
          </>
        )}
      </div>
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

function clampSeconds(value: string) {
  return Math.max(1, Math.min(999, Number(value) || defaultSeconds));
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
