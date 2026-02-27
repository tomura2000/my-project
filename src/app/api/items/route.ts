/**
 * GET  /api/items  → スプレッドシートから全商品を取得
 * POST /api/items  → スプレッドシートに新規行を追記
 */
import { NextResponse } from "next/server";
import { fetchAllItems, appendItem, isSheetsConfigured } from "@/lib/sheets";

// Node.js ランタイムで実行（google-spreadsheet は Edge 非対応）
export const runtime = "nodejs";

export async function GET() {
  if (!isSheetsConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Google Sheets の環境変数が設定されていません。" },
      { status: 503 }
    );
  }

  try {
    const items = await fetchAllItems();
    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    console.error("[GET /api/items]", err);
    return NextResponse.json({ error: "fetch_failed", message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSheetsConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Google Sheets の環境変数が設定されていません。" },
      { status: 503 }
    );
  }

  try {
    const data = await request.json();
    await appendItem(data);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
    console.error("[POST /api/items]", err);
    return NextResponse.json({ error: "append_failed", message }, { status: 500 });
  }
}
