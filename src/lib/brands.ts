/**
 * ブランドフィルター定義
 *
 * カテゴリー（商材）ごとにブランドリストを管理します。
 * D列（brandName）に対して大文字・小文字を区別しない部分一致で検索します。
 *
 * ブランドを追加する場合:
 *   - アパレル: BRANDS_APPAREL に追記し、BrandKey にも追加してください。
 *   - バッグ  : BRANDS_BAGS に追記し、BrandKey にも追加してください。
 */

// 全カテゴリーのブランドキーを包含したユニオン型
export type BrandKey =
  | "ALL"
  // アパレル
  | "ルイヴィトン"
  | "エルメス"
  | "CHANEL"
  | "グッチ"
  // バッグ
  | "ロエベ"
  | "セリーヌ"
  | "ディオール";

export interface BrandDef {
  key: Exclude<BrandKey, "ALL">;
  label: string;
  /** 検索キーワード（すべて小文字で記述 — 照合時に brandName 側を小文字化して比較） */
  keywords: string[];
}

// ── アパレル ────────────────────────────────────────────────

export const BRANDS_APPAREL: BrandDef[] = [
  {
    key: "ルイヴィトン",
    label: "ルイヴィトン",
    keywords: ["louis vuitton", "ルイヴィトン", "ルイ・ヴィトン"],
  },
  {
    key: "エルメス",
    label: "エルメス",
    keywords: ["hermes", "hermès", "エルメス"],
  },
  {
    key: "CHANEL",
    label: "CHANEL",
    keywords: ["chanel", "シャネル"],
  },
  {
    key: "グッチ",
    label: "グッチ",
    keywords: ["gucci", "グッチ"],
  },
];

// ── バッグ ──────────────────────────────────────────────────

export const BRANDS_BAGS: BrandDef[] = [
  {
    key: "ロエベ",
    label: "ロエベ",
    keywords: ["loewe", "ロエベ"],
  },
  {
    key: "セリーヌ",
    label: "セリーヌ",
    keywords: ["celine", "céline", "セリーヌ"],
  },
  {
    key: "ディオール",
    label: "ディオール",
    keywords: ["dior", "ディオール", "クリスチャンディオール", "christian dior"],
  },
];

// ── ユーティリティ ─────────────────────────────────────────

/** 全ブランドの結合リスト（matchesBrand の検索に使用） */
const ALL_BRANDS: BrandDef[] = [...BRANDS_APPAREL, ...BRANDS_BAGS];

/**
 * カテゴリーキーに対応するブランドリストを返す。
 * カテゴリーを追加した場合はここに case を追記してください。
 */
export function getBrandsForCategory(categoryKey: string): BrandDef[] {
  switch (categoryKey) {
    case "bags":    return BRANDS_BAGS;
    case "apparel": return BRANDS_APPAREL;
    default:        return BRANDS_APPAREL;
  }
}

/**
 * brandName が指定ブランドに一致するか（大文字小文字不問・部分一致）。
 * 全カテゴリーのブランド定義を対象に検索するため、
 * アパレル・バッグどちらの BrandKey でも正しく動作します。
 */
export function matchesBrand(brandName: string, key: BrandKey): boolean {
  if (key === "ALL") return true;
  const def = ALL_BRANDS.find((b) => b.key === key);
  if (!def) return false;
  const lower = brandName.toLowerCase();
  return def.keywords.some((kw) => lower.includes(kw));
}

/** 後方互換性のため残す（デフォルトはアパレル） */
export const BRANDS = BRANDS_APPAREL;
