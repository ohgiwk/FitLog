/**
 * 部位の表示色として選べる 8 色のパレット。
 * 部位の編集画面でこの中からボタンで選択する
 */
export const partColorPalette = [
  '#ef2331',
  '#f76707',
  '#f2c94c',
  '#2f9e44',
  '#20c997',
  '#1c7ed6',
  '#8b7cf6',
  '#e64980',
] as const;

/**
 * 色が未設定の部位に使う既定色(既存のヘッダ左の赤に合わせる)
 */
export const defaultPartColor = partColorPalette[0];

/**
 * 並び順のインデックスからパレット色を循環して割り当てる
 */
export function paletteColorAt(index: number): string {
  return partColorPalette[((index % partColorPalette.length) + partColorPalette.length) % partColorPalette.length];
}
