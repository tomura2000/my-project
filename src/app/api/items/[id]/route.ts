/**
 * PATCH /api/items/[id]?category=apparel  → 指定行を部分更新
 *   [id]      = スプレッドシートの行番号（1始まり）例: /api/items/2
 *   ?category = カテゴリーキー（省略時は DEFAULT_CATEGORY_KEY）
 */
import { NextResponse } from "next/server";
import { updateItem, isSheetsConfigured, UpdatePayload } from "@/lib/sheets";
import { getCategoryConfig, DEFAULT_CATEGORY_KEY, isValidCategoryKey } from "@/lib/categories";

// Node.js ランタイムで実行（google-spreadsheet は Edge 非対応）
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Next.js 15+ は Promise
) {
  if (!isSheetsConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Google Sheets の環境変数が設定されていません。" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const categoryKey = searchParams.get("category") ?? DEFAULT_CATEGORY_KEY;

  if (!isValidCategoryKey(categoryKey)) {
    return NextResponse.json(
      { error: "invalid_category", message: `未知のカテゴリー: ${categoryKey}` },
      { status: 400 }
    );
  }

  const { id } = await params;
  const rowNumber = parseInt(id, 10);

  if (isNaN(rowNumber) || rowNumber < 2) {
    return NextResponse.json(
      { error: "invalid_id", message: `行番号が無効です: ${id}（2以上の整数を指定してください）` },
      { status: 400 }
    );
  }

  const category = getCategoryConfig(categoryKey)!;

  try {
    const payload: UpdatePayload = await request.json();
    await updateItem(category.sheetName, rowNumber, payload);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    console.error(`[PATCH /api/items/${id}?category=${categoryKey}]`, err);
    return NextResponse.json({ error: "update_failed", message }, { status: 500 });
  }
}
