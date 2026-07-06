import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('背景クリックと Escape で閉じ、ダイアログ内クリックでは閉じない', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ConfirmDialog title="削除しますか？" labelledBy="confirm-title" onClose={onClose}>
        <button type="button">キャンセル</button>
      </ConfirmDialog>,
    );

    const dialog = screen.getByRole('dialog', { name: '削除しますか？' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-title');

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onClose).not.toHaveBeenCalled();

    dialog.focus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = document.querySelector('.dialog-backdrop');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
