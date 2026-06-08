import { useEffect, useRef, useState } from "react";

const defaultSeconds = 60;

export function RestTimer() {
  const [secondsInput, setSecondsInput] = useState(String(defaultSeconds));
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [endTime, setEndTime] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const running = endTime !== null;

  useEffect(() => {
    if (!endTime) return;

    const timer = window.setInterval(() => {
      const nextRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemaining(nextRemaining);
      if (nextRemaining === 0) {
        window.clearInterval(timer);
        setEndTime(null);
        playAlert(audioContextRef.current);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [endTime]);

  function updateSeconds(value: string) {
    const nextInput = value.replace(/[^\d]/g, "").slice(0, 3);
    setSecondsInput(nextInput);
    if (!running && nextInput) setRemaining(clampSeconds(nextInput));
  }

  function toggleTimer() {
    if (running) {
      setEndTime(null);
      return;
    }

    const seconds = clampSeconds(secondsInput);
    const context = getAudioContext(audioContextRef.current);
    audioContextRef.current = context;
    void context?.resume();
    setSecondsInput(String(seconds));
    setRemaining(seconds);
    setEndTime(Date.now() + seconds * 1000);
  }

  return (
    <div className={`rest-timer ${running ? "running" : ""}`} aria-label="レストタイマー">
      <TimerIcon />
      {running ? (
        <strong>{remaining}</strong>
      ) : (
        <input
          aria-label="タイマー秒数"
          type="number"
          min="1"
          max="999"
          inputMode="numeric"
          value={secondsInput}
          onChange={(event) => updateSeconds(event.target.value)}
        />
      )}
      <span>秒</span>
      <button type="button" onClick={toggleTimer}>{running ? "STOP" : "START"}</button>
    </div>
  );
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

function playAlert(context: AudioContext | null) {
  if (!context) return;
  const start = context.currentTime;
  for (let index = 0; index < 25; index += 1) {
    const time = start + index * 0.2;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(index % 2 ? 2093 : 1760, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.13, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.09);
  }
}
