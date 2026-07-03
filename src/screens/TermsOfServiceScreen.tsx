import { ChevronLeft } from '../icons';
import { useFitLogContext } from '../hooks/useFitLogContext';

const termsSections = [
  {
    title: '適用',
    body: [
      '本規約は、SmithNote（スミスノート）の利用条件を定めるものです。ユーザーは、本アプリを利用することで本規約に同意したものとみなされます。',
    ],
  },
  {
    title: 'サービス内容',
    body: [
      'SmithNote（スミスノート）は、トレーニング記録、種目、セット、重量、回数または秒数、目標、履歴、バックアップを管理するためのアプリです。',
      '本アプリの機能や表示内容は、改善や保守のため予告なく変更されることがあります。',
    ],
  },
  {
    title: '利用上の注意',
    body: [
      '本アプリは、トレーニング記録の管理を補助するものであり、医療、健康、運動指導に関する専門的な助言を提供するものではありません。',
      '体調、怪我、持病などに不安がある場合は、医師や専門家に相談したうえで運動してください。',
    ],
  },
  {
    title: 'データ管理',
    body: [
      '通常の記録データは端末内に保存されます。端末の故障、紛失、アプリの削除、OSやブラウザの設定変更などにより、データが失われる場合があります。',
      '必要に応じて、設定画面のバックアップ機能を利用し、ユーザー自身の責任で記録を保管してください。',
    ],
  },
  {
    title: '禁止事項',
    body: [
      'ユーザーは、不正アクセス、リバースエンジニアリング、他者への迷惑行為、法令または公序良俗に反する行為を行ってはなりません。',
      '本アプリの運営、保守、他のユーザーの利用を妨げる行為を禁止します。',
    ],
  },
  {
    title: '免責事項',
    body: [
      '本アプリの利用により生じたトレーニング上の怪我、体調不良、記録データの消失、端末や通信環境に起因する問題について、開発者は法令上認められる範囲で責任を負いません。',
      '本アプリが常に正確、完全、安全、継続的に利用できることを保証するものではありません。',
    ],
  },
  {
    title: '規約の変更',
    body: [
      '本規約は、機能追加、運用上の必要、法令への対応に応じて改定することがあります。',
      '改定後の規約は、アプリ内または配布ページに表示された時点から適用されます。',
    ],
  },
  {
    title: 'お問い合わせ',
    body: [
      '本規約に関する問い合わせ先は、アプリの公開時に配布ページまたはリポジトリで案内します。',
    ],
  },
];

/**
 * SmithNote（スミスノート）の利用条件を表示する画面
 */
export function TermsOfServiceScreen() {
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
          <div className="bar-title">利用規約</div>
          <span />
        </div>
      </header>
      <div className="settings-content">
        <article className="settings-section privacy-policy" aria-labelledby="terms-title">
          <div className="privacy-policy-head">
            <h1 className="privacy-policy-title" id="terms-title">
              利用規約
            </h1>
            <p>制定日: 2026年7月3日</p>
          </div>
          <p className="privacy-policy-lead">
            この利用規約は、SmithNote（スミスノート）を安心して利用するための基本的な条件を定めるものです。
          </p>
          {termsSections.map((section) => (
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
