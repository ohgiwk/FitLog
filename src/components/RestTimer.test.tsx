import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RestTimer } from './RestTimer';

describe('RestTimer settings', () => {
  it('秒数ボタンから設定を開き、プリセットまたは自由入力と自動開始を保存できる', async () => {
    const user = userEvent.setup();
    const onChangeDefaultSeconds = vi.fn();
    const onChangeAutoStart = vi.fn();

    render(
      <RestTimer
        defaultSeconds={60}
        autoStartOnIntensity
        onChangeDefaultSeconds={onChangeDefaultSeconds}
        onChangeAutoStart={onChangeAutoStart}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'レストタイマー設定、現在60秒' }));

    const secondsInput = screen.getByRole('spinbutton', {
      name: 'レストタイマーのデフォルト秒数を入力',
    });
    await user.click(screen.getByRole('button', { name: '90秒' }));
    expect((secondsInput as HTMLInputElement).value).toBe('90');

    await user.clear(secondsInput);
    await user.type(secondsInput, '75');
    await user.click(screen.getByRole('button', { name: 'OFF' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onChangeDefaultSeconds).toHaveBeenCalledWith(75);
    expect(onChangeAutoStart).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog', { name: 'レストタイマー設定' })).toBeNull();
  });
});
