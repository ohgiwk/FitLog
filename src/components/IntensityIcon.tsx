import {
  IconMoodEmpty,
  IconMoodSadDizzy,
  IconMoodSmile,
  IconMoodSurprised,
  IconMoodWrrr,
} from '@tabler/icons-react';
import { SetIntensity } from '../types';

export function IntensityIcon({ intensity }: { intensity?: SetIntensity }) {
  if (!intensity) return <span className="intensity-empty">-</span>;

  const Icon = iconByIntensity[intensity];
  return (
    <span className="intensity-face" aria-hidden="true">
      <Icon />
    </span>
  );
}

const iconByIntensity = {
  1: IconMoodSmile,
  2: IconMoodEmpty,
  3: IconMoodSurprised,
  4: IconMoodWrrr,
  5: IconMoodSadDizzy,
} satisfies Record<SetIntensity, typeof IconMoodSmile>;
