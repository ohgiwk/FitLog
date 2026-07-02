import { ChevronLeft } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';

const policySections = [
  {
    title: '取得する情報',
    body: [
      'FitLogは、ユーザーが入力したトレーニング記録、種目、セット、重量、回数または秒数、メモ、目標、設定、バックアップに必要なデータをアプリ内で扱います。',
      'クラウドバックアップを利用する場合は、ログイン用のメールアドレスと、バックアップ対象のトレーニングデータをクラウド上に保存します。',
    ],
  },
  {
    title: '利用目的',
    body: [
      '取得した情報は、トレーニング記録の保存、表示、集計、履歴確認、目標管理、バックアップ、復元のために利用します。',
      'ユーザーの同意なく、広告配信、外部マーケティング、第三者への販売のために利用することはありません。',
    ],
  },
  {
    title: '保存場所',
    body: [
      '通常の記録データは、利用中の端末内に保存されます。',
      'クラウドバックアップは任意機能です。ユーザーがログインし、バックアップ操作を行った場合だけクラウド上に保存されます。',
    ],
  },
  {
    title: '第三者提供',
    body: [
      '法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者へ提供しません。',
      'クラウドバックアップでは、認証とデータ保存のために外部のクラウドサービスを利用します。',
    ],
  },
  {
    title: 'データの管理',
    body: [
      'ユーザーは設定画面からローカルバックアップを書き出したり、保存済みデータを読み込んだりできます。',
      'クラウドバックアップを利用している場合は、バックアップ一覧画面からバックアップの作成、復元、削除を行えます。',
    ],
  },
  {
    title: 'お問い合わせ',
    body: [
      '本ポリシーに関する問い合わせ先は、アプリの公開時に配布ページまたはリポジトリで案内します。',
    ],
  },
  {
    title: '改定',
    body: [
      '本ポリシーは、機能追加、利用サービスの変更、法令への対応に応じて改定することがあります。',
    ],
  },
];

/**
 * FitLogのデータ取り扱い方針を表示する画面
 */
export function PrivacyPolicyScreen() {
  const { actions } = useFitLogContext();

  return (
    <section className="screen active settings-screen">
      <header className="topbar">
        <div className="bar-row">
          <button
            className="bar-btn"
            type="button"
            aria-label="戻る"
            onClick={() => actions.setScreen('settings')}
          >
            <ChevronLeft />
          </button>
          <div className="bar-title">プライバシーポリシー</div>
          <span />
        </div>
      </header>
      <div className="settings-content">
        <article className="settings-section privacy-policy" aria-labelledby="privacy-policy-title">
          <div className="privacy-policy-head">
            <h1 className="privacy-policy-title" id="privacy-policy-title">
              プライバシーポリシー
            </h1>
            <p>制定日: 2026年7月3日</p>
          </div>
          <p className="privacy-policy-lead">
            FitLogは、トレーニング記録を端末内に保存して利用できるローカルファーストのアプリです。本ポリシーでは、FitLogで扱う情報とその利用方法を説明します。
          </p>
          {policySections.map((section) => (
            <section className="privacy-policy-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </section>
  );
}
