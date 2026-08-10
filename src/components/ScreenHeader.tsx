import type { ReactNode } from 'react';
import { useSmithNoteContext } from '../hooks/useSmithNoteContext';
import { ChevronLeft } from '../icons';

type ScreenHeaderProps = {
  title: ReactNode;
  right?: ReactNode;
  backLabel?: string;
  onBack?: () => void;
};

/**
 * 各画面で共通利用する、戻る操作付きのトップヘッダー
 */
export function ScreenHeader({ title, right, backLabel = '戻る', onBack }: ScreenHeaderProps) {
  const { actions } = useSmithNoteContext();

  return (
    <header className="topbar">
      <div className="bar-row">
        <button
          className="bar-btn"
          type="button"
          aria-label={backLabel}
          onClick={onBack ?? actions.goBack}
        >
          <ChevronLeft />
        </button>
        <div className="bar-title">{title}</div>
        {right ?? <span />}
      </div>
    </header>
  );
}
