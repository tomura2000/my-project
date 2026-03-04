/**
 * GET /api/analytics
 *
 * 全カテゴリー統合・担当者別パフォーマンス集計
 *
 * - 定義された全シートから並列でデータを取得し合算する
 * - 期間: Y列（開催日）が「今日 - 37日」〜「今日 - 7日」の約1ヶ月間
 *
 * 集計項目（担当者ごと、全カテゴリー合計）:
 *   - 入札数     : H列（相場）に数値がある行の総数
 *   - 落札成功数 : X列（落札成功）が TRUE の行の総数
 *   - 相場正解数 : H列に数値あり かつ T列（相場正誤チェック）が TRUE
 *   - 相場正答率 : 正解数 / 入札数 × 100 [%]
 */
import { NextResponse } from "next/server";
import { fetchAllItemsMultiple, isSheetsConfigured } from "@/lib/sheets";
import { CATEGORIES } from "@/lib/categories";
import { getSampleItems } from "@/lib/data";
import { ASSIGNEES } from "@/lib/types";
import type { AuctionItem, AssigneeAnalytics, AnalyticsResponse } from "@/lib/types";

// Node.js ランタイムで実行（google-spreadsheet は Edge 非対応）
export const runtime = "nodejs";

/** "YYYY/MM/DD" や "YYYY-MM-DD" などを UTC 日付の Date に変換（失敗時は null） */
function parseAuctionDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const normalized = dateStr.replace(/\//g, "-");
  // YYYY-MM-DD → UTCとして解釈
  const d = new Date(`${normalized}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** アイテム一覧から担当者別集計を算出する */
function computeAnalytics(
  items: AuctionItem[],
  from: Date,
  to: Date
): AssigneeAnalytics[] {
  // 日付フィルタ（開催日が from 〜 to の範囲）
  const filtered = items.filter((item) => {
    const d = parseAuctionDate(item.auctionDate);
    if (!d) return false;
    return d >= from && d <= to;
  });

  // 担当者別カウンター（既知の担当者を全員初期化）
  const statsMap = new Map<string, { bidCount: number; winCount: number; correctCount: number }>();
  for (const name of ASSIGNEES) {
    statsMap.set(name, { bidCount: 0, winCount: 0, correctCount: 0 });
  }

  for (const item of filtered) {
    if (!item.assignee || item.marketPrice === null) continue;

    if (!statsMap.has(item.assignee)) {
      statsMap.set(item.assignee, { bidCount: 0, winCount: 0, correctCount: 0 });
    }
    const s = statsMap.get(item.assignee)!;
    s.bidCount++;
    if (item.winningSuccess) s.winCount++;
    if (item.judgmentResult) s.correctCount++;
  }

  return Array.from(statsMap.entries())
    .map(([assignee, s]) => ({
      assignee,
      bidCount: s.bidCount,
      winCount: s.winCount,
      correctCount: s.correctCount,
      marketAccuracy:
        s.bidCount > 0
          ? Math.round((s.correctCount / s.bidCount) * 1000) / 10
          : null,
    }))
    .sort((a, b) => b.bidCount - a.bidCount);
}

export async function GET() {
  // ── 集計期間（開催日が 37日前〜7日前 の約1ヶ月分） ────────
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 37));
  const to   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));

  const period = {
    from: from.toISOString().split("T")[0],
    to:   to.toISOString().split("T")[0],
  };

  // ── データ取得（全カテゴリー） ─────────────────────────────
  const configured = isSheetsConfigured();
  let allItems: AuctionItem[];

  if (configured) {
    try {
      // 全シートから並列取得（Doc 接続は1回）
      const sheetNames = CATEGORIES.map((c) => c.sheetName);
      const itemArrays = await fetchAllItemsMultiple(sheetNames);
      allItems = itemArrays.flat();
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラーが発生しました";
      console.error("[GET /api/analytics]", err);
      return NextResponse.json({ error: "fetch_failed", message }, { status: 500 });
    }
  } else {
    // 全カテゴリーのサンプルデータを結合
    allItems = CATEGORIES.flatMap((c) => getSampleItems(c.key));
  }

  // ── 集計 ───────────────────────────────────────────────────
  const stats = computeAnalytics(allItems, from, to);

  const response: AnalyticsResponse = { period, stats, isSample: !configured };
  return NextResponse.json(response);
}
