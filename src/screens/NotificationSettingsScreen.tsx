import { ScreenHeader } from '../components/ScreenHeader';
import { useFitLogContext } from '../hooks/useFitLogContext';

/**
 * トレーニング未記録時のリマインダー通知を設定する画面
 */
export function NotificationSettingsScreen() {
  const { state, actions } = useFitLogContext();
  const enabled = state.notificationSettings.enabled;

  return (
    <section className="screen active settings-screen">
      <ScreenHeader title="通知設定" backLabel="設定に戻る" />
      <div className="settings-content">
        <section className="settings-section" aria-labelledby="workout-reminder-title">
          <h2 className="settings-section-title" id="workout-reminder-title">
            トレーニング通知
          </h2>
          <div className="settings-row notification-settings-row">
            <div className="settings-label">
              <span>3日目リマインダー</span>
              <strong>
                {enabled ? '最後の記録から3日目に通知します' : '通知は送信されません'}
              </strong>
            </div>
            <button
              className={`settings-toggle ${enabled ? 'active' : ''}`}
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => void actions.setWorkoutReminderEnabled(!enabled)}
            >
              <span>{enabled ? 'オン' : 'オフ'}</span>
            </button>
          </div>
          <div className="settings-section-body notification-settings-help">
            <p className="settings-help">
              トレーニング記録が3日間ない場合、3日目に「疲れは取れましたか？」「トレーニングを始めましょう」と通知します。
            </p>
            <button
              className="settings-primary-button notification-test-button"
              type="button"
              onClick={() => void actions.sendWorkoutReminderTestNotification()}
            >
              テスト通知を送信
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
