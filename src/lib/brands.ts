/**
 * ブランドフィルター定義
 * D列（brandName）に対して大文字・小文字を区別しない部分一致で検索します。
 */

export type BrandKey = "ALL" | "ルイヴィトン" | "エルメス" | "CHANEL" | "グッチ";

export interface BrandDef {
  key: Exclude<BrandKey, "ALL">;
  label: string;
  keywords: string[]; // 小文字に正規化して部分一致検索
}

export const BRANDS: BrandDef[] = [
  {
    key: "ルイヴィトン",
    label: "ルイヴィトン",
    keywords: ["louis vuitton", "ルイヴィトン"],
  },
  {
    key: "エルメス",
    label: "エルメス",
    keywords: ["hermes", "エルメス"],
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

/** brandName が指定ブランドに一致するか（大文字小文字不問・部分一致） */
export function matchesBrand(brandName: string, key: BrandKey): boolean {
  if (key === "ALL") return true;
  const def = BRANDS.find((b) => b.key === key);
  if (!def) return false;
  const lower = brandName.toLowerCase();
  return def.keywords.some((kw) => lower.includes(kw));
}
