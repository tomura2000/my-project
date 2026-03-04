/**
 * 商材カテゴリー設定
 *
 * カテゴリーを追加する場合は CATEGORIES 配列に追記するだけです。
 * - key      : URL クエリパラメータ・内部識別子（英小文字推奨）
 * - label    : 画面表示名
 * - sheetName: Google スプレッドシートのタブ名（完全一致）
 *
 * すべてのシートで列定義（G:担当者, H:相場, T:正誤, X:落札成功, Y:開催日）が
 * 統一されていることを前提としています。
 */

export interface CategoryConfig {
  key: string;
  label: string;
  sheetName: string;
}

export const CATEGORIES: readonly CategoryConfig[] = [
  { key: "apparel", label: "アパレル", sheetName: "エコリングアパレル入札" },
  { key: "bags",    label: "バッグ",   sheetName: "エコリングバッグ入札"   },
] as const;

export const DEFAULT_CATEGORY_KEY = CATEGORIES[0].key;

/** カテゴリーキーから設定を取得 */
export function getCategoryConfig(key: string): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

/** カテゴリーキーが有効かどうか確認 */
export function isValidCategoryKey(key: string): boolean {
  return CATEGORIES.some((c) => c.key === key);
}
