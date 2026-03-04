/**
 * GET  /api/items?category=apparel  → スプレッドシートから全商品を取得
 * POST /api/items?category=apparel  → スプレッドシートに新規行を追記
 */
import { NextResponse } from "next/server";
import { fetchAllItems, appendItem, isSheetsConfigured } from "@/lib/sheets";
import { getCategoryConfig, DEFAULT_CATEGORY_KEY, isValidCategoryKey } from "@/lib/categories";

// Node.js ランタイムで実行（google-spreadsheet は Edge 非対応）
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryKey = searchParams.get("category") ?? DEFAULT_CATEGORY_KEY;

  if (!isValidCategoryKey(categoryKey)) {
    return NextResponse.json(
      { error: "invalid_category", message: `未知のカテゴリー: ${categoryKey}` },
      { status: 400 }
    );
  }

  if (!isSheetsConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Google Sheets の環境変数が設定されていません。" },
      { status: 503 }
    );
  }

  const category = getCategoryConfig(categoryKey)!;

  try {
    const items = await fetchAllItems(category.sheetName);
    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    console.error(`[GET /api/items?category=${categoryKey}]`, err);
    return NextResponse.json({ error: "fetch_failed", message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryKey = searchParams.get("category") ?? DEFAULT_CATEGORY_KEY;

  if (!isValidCategoryKey(categoryKey)) {
    return NextResponse.json(
      { error: "invalid_category", message: `未知のカテゴリー: ${categoryKey}` },
      { status: 400 }
    );
  }

  if (!isSheetsConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Google Sheets の環境変数が設定されていません。" },
      { status: 503 }
    );
  }

  const category = getCategoryConfig(categoryKey)!;

  try {
    const data = await request.json();
    await appendItem(category.sheetName, data);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    console.error(`[POST /api/items?category=${categoryKey}]`, err);
    return NextResponse.json({ error: "append_failed", message }, { status: 500 });
  }
}

