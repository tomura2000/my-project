"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { AuctionItem, Assignee } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare,
  Eye,
  EyeOff,
} from "lucide-react";

// ── 判定結果ビジュアル ──────────────────────────────────────

function JudgmentTag({ judged, result }: { judged: boolean; result: boolean }) {
  if (!judged)
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500">
        <HelpCircle className="h-3.5 w-3.5" />
        未判定
      </span>
    );
  if (result)
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-green-100 border border-green-200 px-2.5 py-1 text-xs font-semibold text-green-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        正解
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-100 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-800">
      <XCircle className="h-3.5 w-3.5" />
      要修正
    </span>
  );
}

// ── メインコンポーネント ────────────────────────────────────

interface FeedbackHistoryProps {
  items: AuctionItem[];
  currentAssignee: Assignee;
  onConfirm: (id: string) => void;
}

export function FeedbackHistory({ items, currentAssignee, onConfirm }: FeedbackHistoryProps) {
  // 確認済みIDのセット（ローカル状態：即時UI反映用）
  const [localConfirmedIds, setLocalConfirmedIds] = useState<Set<string>>(new Set());
  // 未確認のみ表示モード
  const [unreadOnly, setUnreadOnly] = useState(false);

  // 自分宛・フィードバックあり（確認済み含む全件）
  const allFeedbackItems = useMemo(
    () =>
      items.filter(
        (i) => i.assignee === currentAssignee && i.feedback.trim() !== ""
      ),
    [items, currentAssignee]
  );

  // 自分宛・フィードバックあり・V列未確認 の商品
  const feedbackItems = useMemo(
    () => allFeedbackItems.filter((i) => !i.feedbackConfirmed),
    [allFeedbackItems]
  );

  // ローカル状態も加味した未確認カウント
  const unreadCount = feedbackItems.filter((i) => !localConfirmedIds.has(i.id)).length;

  // 表示リスト：ローカル確認済みもフィルタ可能
  const displayItems = unreadOnly
    ? feedbackItems.filter((i) => !localConfirmedIds.has(i.id))
    : feedbackItems;

  const handleConfirm = (id: string) => {
    setLocalConfirmedIds((prev) => new Set([...prev, id]));
    onConfirm(id);
  };

  // ── 全件確認完了トースト（セッション内の遷移のみ検知） ────────
  const prevUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    const curr = feedbackItems.length;
    if (
      prevUnreadRef.current !== null &&
      prevUnreadRef.current > 0 &&
      curr === 0 &&
      allFeedbackItems.length > 0
    ) {
      toast.success(
        `${allFeedbackItems.length} 件のフィードバックをすべて確認しました！`,
        { duration: 5000 }
      );
    }
    prevUnreadRef.current = curr;
  }, [feedbackItems.length, allFeedbackItems.length]);

  // ── 空状態 ─────────────────────────────────────────────────
  if (feedbackItems.length === 0) {
    // 元々フィードバック自体が存在しない場合
    if (allFeedbackItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="rounded-full bg-muted p-5">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">フィードバックはありません</h2>
          <p className="text-muted-foreground text-sm">
            {currentAssignee} さん宛のフィードバックが届くとここに表示されます
          </p>
        </div>
      );
    }

    // フィードバックは存在したが、全件確認済みの場合
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="rounded-full bg-muted p-5">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">未確認のフィードバックはありません</h2>
      </div>
    );
  }

  // ── リスト表示 ──────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* 集計バー + フィルタートグル */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            合計{" "}
            <span className="font-semibold text-foreground">
              {feedbackItems.length}
            </span>{" "}
            件
          </span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              未確認 {unreadCount} 件
            </span>
          )}
        </div>

        <button
          onClick={() => setUnreadOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
            unreadOnly
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {unreadOnly ? (
            <>
              <Eye className="h-3 w-3" />
              未確認のみ表示中
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3" />
              未確認のみ表示
            </>
          )}
        </button>
      </div>

      {/* カードが0件のとき */}
      {displayItems.length === 0 && (
        <div className="rounded-xl border bg-white py-16 text-center text-muted-foreground text-sm">
          未確認のフィードバックはありません
        </div>
      )}

      {/* フィードバックカード */}
      <div className="space-y-4">
        {displayItems.map((item) => {
          const isConfirmed = localConfirmedIds.has(item.id);
          return (
            <Card
              key={item.id}
              className={`border-0 ring-1 transition-all ${
                isConfirmed
                  ? "ring-border opacity-55 bg-gray-50"
                  : "ring-border shadow-sm bg-white"
              }`}
            >
              {/* カードヘッダー：判定 + URL */}
              <CardHeader className="pb-3 pt-4 px-5 border-b">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 pt-0.5">
                    <JudgmentTag judged={item.representativeCheck} result={item.judgmentResult} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {item.brandName && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {item.brandName}
                      </Badge>
                    )}
                    {item.productUrl ? (
                      <a
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline break-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{item.productUrl}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">URL なし</span>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* カードボディ */}
              <CardContent className="pt-4 px-5 pb-5 space-y-4">
                {/* 入力内容サマリー */}
                <div className="space-y-3 text-sm">
                  {/* 相場価格 */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      相場価格（H列）
                    </p>
                    <p className="font-mono font-semibold">
                      {item.marketPrice != null
                        ? `¥${item.marketPrice.toLocaleString()}`
                        : "—"}
                    </p>
                  </div>

                  {/* 補足メモ */}
                  {item.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        補足メモ（R列）
                      </p>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {item.notes}
                      </p>
                    </div>
                  )}

                  {/* 参考URL ①〜⑤ */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      参考URL（M〜Q列）
                    </p>
                    <div className="space-y-1">
                      {[
                        { label: "①", url: item.referenceUrl1 },
                        { label: "②", url: item.referenceUrl2 },
                        { label: "③", url: item.referenceUrl3 },
                        { label: "④", url: item.referenceUrl4 },
                        { label: "⑤", url: item.referenceUrl5 },
                      ].map(({ label, url }) =>
                        url ? (
                          <a
                            key={label}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                          >
                            <span className="text-muted-foreground w-4 shrink-0">{label}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[240px]">
                              {url.replace(/^https?:\/\//, "")}
                            </span>
                          </a>
                        ) : null
                      )}
                      {!item.referenceUrl1 && !item.referenceUrl2 && !item.referenceUrl3 &&
                       !item.referenceUrl4 && !item.referenceUrl5 && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* フィードバック（メイン） */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    代表からのフィードバック（U列）
                  </p>
                  <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
                    {item.feedback}
                  </p>
                </div>

                {/* 確認済みボタン */}
                {!isConfirmed ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 border-dashed"
                    onClick={() => handleConfirm(item.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    確認済みにする
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 py-1 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    確認済み
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
