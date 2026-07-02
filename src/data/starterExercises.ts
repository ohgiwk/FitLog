import { Exercise, ExerciseCategory, gripStyleTypes, gripTypes } from '../types';
import { uid } from '../utils';

export const starterCatalogVersion = 6;

/**
 * 部位ごと・カテゴリごとの種目名定義。
 * ここから starterExercises を生成する（重複定義を避けて見通しよく管理するため）
 */
const starterCatalog: {
  part: string;
  categories: { category: ExerciseCategory; names: string[] }[];
}[] = [
  {
    part: '胸',
    categories: [
      {
        category: 'free',
        names: ['ベンチプレス', 'インクラインベンチプレス', 'デクラインベンチプレス', 'ナローベンチプレス'],
      },
      {
        category: 'machine',
        names: [
          'チェストプレス',
          'スミスマシン・インクラインベンチプレス',
          'ペックフライ',
          'インクラインチェストプレス',
        ],
      },
      {
        category: 'dumbbell',
        names: ['ダンベルベンチプレス', 'インクラインダンベルプレス', 'デクラインダンベルプレス', 'ダンベルフライ'],
      },
      {
        category: 'cable',
        names: ['ケーブルクロスオーバー', 'ローケーブルフライ', 'ハイケーブルフライ', 'ケーブルチェストプレス'],
      },
      {
        category: 'bodyweight',
        names: ['プッシュアップ', 'ワイドプッシュアップ', 'デクラインプッシュアップ', 'インクラインプッシュアップ'],
      },
    ],
  },
  {
    part: '背中',
    categories: [
      {
        category: 'free',
        names: ['デッドリフト', 'ハーフデッドリフト', 'ベントオーバーロー', 'Tバーロウ'],
      },
      {
        category: 'machine',
        names: ['ラットプルダウン', 'シーテッドロー', 'アシステッドチンニング', 'マシンローイング'],
      },
      {
        category: 'dumbbell',
        names: ['ワンハンドダンベルロー', 'ダンベルデッドリフト', 'ダンベルプルオーバー', 'ダンベルベントオーバーロー'],
      },
      {
        category: 'cable',
        names: ['ケーブルローイング', 'ストレートアームプルダウン', 'ワンハンドケーブルロー', 'ケーブルプルオーバー'],
      },
      {
        category: 'bodyweight',
        names: ['チンニング', 'プルアップ', 'インバーテッドロー', 'バックエクステンション'],
      },
    ],
  },
  {
    part: '脚',
    categories: [
      {
        category: 'free',
        names: ['スクワット', 'フロントスクワット', 'ルーマニアンデッドリフト', 'バーベルランジ'],
      },
      {
        category: 'machine',
        names: ['レッグプレス', 'レッグエクステンション', 'シーテッドレッグカール', 'カーフレイズ'],
      },
      {
        category: 'dumbbell',
        names: ['ゴブレットスクワット', 'ブルガリアンスクワット', 'ダンベルランジ', 'ダンベルルーマニアンデッドリフト'],
      },
      {
        category: 'cable',
        names: ['ケーブルプルスルー', 'ケーブルキックバック', 'ケーブルアダクション', 'ケーブルアブダクション'],
      },
      {
        category: 'bodyweight',
        names: ['自重スクワット', 'ジャンプスクワット', 'ウォーキングランジ', 'シシースクワット'],
      },
    ],
  },
  {
    part: '肩',
    categories: [
      {
        category: 'free',
        names: ['バーベルショルダープレス', 'ミリタリープレス', 'アップライトロー', 'バーベルフロントレイズ'],
      },
      {
        category: 'machine',
        names: ['マシンショルダープレス', 'マシンサイドレイズ', 'リバースペックフライ', 'スミスマシン・ショルダープレス'],
      },
      {
        category: 'dumbbell',
        names: ['ショルダープレス', 'サイドレイズ', 'フロントレイズ', 'リアレイズ', 'アーノルドプレス', 'シュラッグ'],
      },
      {
        category: 'cable',
        names: ['フェイスプル', 'ケーブルサイドレイズ', 'ケーブルフロントレイズ', 'ケーブルリアレイズ'],
      },
      {
        category: 'bodyweight',
        names: ['パイクプッシュアップ', 'ハンドスタンドプッシュアップ', 'ウォールハンドスタンド'],
      },
    ],
  },
  {
    part: '腕',
    categories: [
      {
        category: 'free',
        names: ['バーベルカール', 'EZバーカール', 'ライイングトライセプスエクステンション', 'クローズグリップベンチプレス'],
      },
      {
        category: 'machine',
        names: ['プリーチャーカール', 'マシンアームカール', 'マシントライセプスエクステンション', 'マシンディップス'],
      },
      {
        category: 'dumbbell',
        names: ['ダンベルカール', 'ハンマーカール', 'コンセントレーションカール', 'ダンベルキックバック'],
      },
      {
        category: 'cable',
        names: [
          'トライセプスプレスダウン',
          'オーバーヘッドトライセプスエクステンション',
          'ケーブルカール',
          'ケーブルハンマーカール',
        ],
      },
      {
        category: 'bodyweight',
        names: ['ディップス', 'ダイヤモンドプッシュアップ', 'ベンチディップス'],
      },
    ],
  },
  {
    part: '腹筋',
    categories: [
      {
        category: 'free',
        names: ['バーベルロールアウト', 'ランドマインローテーション'],
      },
      {
        category: 'machine',
        names: ['アブドミナルクランチ', 'ロータリートルソー', 'アブコースター'],
      },
      {
        category: 'dumbbell',
        names: ['ダンベルサイドベント', 'ダンベルロシアンツイスト', 'ダンベルクランチ'],
      },
      {
        category: 'cable',
        names: ['ケーブルクランチ', 'ケーブルウッドチョッパー', 'ケーブルサイドベント'],
      },
      {
        category: 'bodyweight',
        names: ['クランチ', 'プランク', 'サイドプランク', 'シットアップ', 'マウンテンクライマー'],
      },
    ],
  },
];

export const starterExercises: Exercise[] = starterCatalog.flatMap(({ part, categories }) =>
  categories.flatMap(({ category, names }) =>
    names.map((name) => ({
      id: uid(),
      part,
      name,
      measurementType: 'reps' as const,
      category,
      availableGrips: [...gripTypes],
      availableGripStyles: [...gripStyleTypes],
    })),
  ),
);
