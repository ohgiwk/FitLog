import { SetIntensity } from "../types";

export function IntensityIcon({ intensity }: { intensity?: SetIntensity }) {
  if (!intensity) return <span className="intensity-empty">-</span>;

  return (
    <span className="intensity-face" aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        <circle cx="16" cy="16" r="13" />
        {intensity === 1 && (
          <>
            <path d="M9.5 11.5q2 2 4 0" />
            <path d="M18.5 11.5q2 2 4 0" />
            <path d="M9.5 17.5q6.5 6 13 0" />
            <path d="M14 20.5q2 4 4 0" />
          </>
        )}
        {intensity === 2 && (
          <>
            <circle cx="11.5" cy="12" r="1.4" />
            <circle cx="20.5" cy="12" r="1.4" />
            <path d="M10 18q6 5 12 0" />
          </>
        )}
        {intensity === 3 && (
          <>
            <circle cx="11.5" cy="12" r="1.3" />
            <circle cx="20.5" cy="12" r="1.3" />
            <path d="M10.5 20h11" />
          </>
        )}
        {intensity === 4 && (
          <>
            <path d="M9.5 11.5l4 2.5" />
            <path d="M13.5 11.5l-4 2.5" />
            <path d="M18.5 11.5l4 2.5" />
            <path d="M22.5 11.5l-4 2.5" />
            <path d="M10.5 22q5.5-5 11 0" />
            <path d="M8.5 8.5l-2-2" />
            <path d="M23.5 8.5l2-2" />
          </>
        )}
        {intensity === 5 && (
          <>
            <path d="M9.5 10.5l4.5 4.5" />
            <path d="M14 10.5l-4.5 4.5" />
            <path d="M18 10.5l4.5 4.5" />
            <path d="M22.5 10.5l-4.5 4.5" />
            <ellipse cx="16" cy="22" rx="4" ry="3" />
          </>
        )}
      </svg>
    </span>
  );
}
