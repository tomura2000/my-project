"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AuctionItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  ClipboardList,
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { BrandFilterButtons } from "@/components/BrandFilterButtons";
import { BrandKey, BRANDS, matchesBrand } from "@/lib/brands";

type SortOrder = "none" | "asc" | "desc";

// フェードアウトにかかるミリ秒（Tailwind の duration-300 と合わせる）
const FADE_DURATION_MS = 300;

interface RepresentativeModeProps {
  items: AuctionItem[];
  onApprove: (id: string, feedback: string) => void;
  onReject: (id: string, feedback: string) => void;
  onSaveFeedback: (id: string, feedback: string) => void;
}

export function RepresentativeMode({
  items,
  onApprove,
  onReject,
  onSaveFeedback,
}: RepresentativeModeProps) {
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const feedbackRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [brandFilter, setBrandFilter] = useState<BrandKey>("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  // フェードアウト中のアイテムID集合
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());

  // ── 全件完了トースト（セッション内の遷移のみ検知） ────────────
  const prevPendingRef = useRef<number | null>(null);
  useEffect(() => {
    const curr = items.filter((i) => i.check && !i.representativeCheck).length;
    const checked = items.filter((i) => i.check).length;
    if (prevPendingRef.current !== null && prevPendingRef.current > 0 && curr === 0 && checked > 0) {
      toast.success(`全 ${checked} 件の判定が完了しました！`, { duration: 5000 });
    }
    prevPendingRef.current = curr;
  // items が変わるたびに再計算（pendingCountはレンダー後の値なので items を依存に）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // ── ブランドボタン用件数（未判定商品ベース） ────────────────
  const brandCounts = useMemo(() => {
    const base = items.filter((i) => i.check && !i.representativeCheck);
    const result: Partial<Record<BrandKey, number>> = { ALL: base.length };
    for (const b of BRANDS) {
      result[b.key] = base.filter((i) => matchesBrand(i.brandName, b.key)).length;
    }
    return result;
  }, [items]);

  // ── フィルタ + ソート（未判定のみ表示） ─────────────────────
  const reviewed = useMemo(() => {
    const filtered = items
      .filter((i) => i.check && !i.representativeCheck) // 未判定のみ
      .filter((i) => matchesBrand(i.brandName, brandFilter));

    if (sortOrder === "none") return filtered;
    return [...filtered].sort((a, b) => {
      const cmp = a.brandName.localeCompare(b.brandName, "ja");
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [items, brandFilter, sortOrder]);

  // ── 判定ボタン共通ハンドラ（フェードアウト → API呼び出し） ──
  const handleJudge = useCallback(
    (id: string, isApprove: boolean) => {
      const currentFeedback =
        feedbackDraft[id] ?? items.find((i) => i.id === id)?.feedback ?? "";

      // feedbackDraft を即座にクリア
      setFeedbackDraft((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      // フェードアウト開始
      setFadingIds((prev) => new Set([...prev, id]));

      // アニメーション完了後に API 呼び出し
      setTimeout(() => {
        if (isApprove) {
          onApprove(id, currentFeedback);
        } else {
          onReject(id, currentFeedback);
        }
        // fadingIds からも除去（アイテムはもうリストにない）
        setFadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, FADE_DURATION_MS);
    },
    [feedbackDraft, items, onApprove, onReject]
  );

  const cycleSort = () => {
    setSortOrder((prev) =>
      prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"
    );
  };

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const SortIcon =
    sortOrder === "asc" ? ArrowUpAZ : sortOrder === "desc" ? ArrowDownAZ : ArrowUpDown;
  const sortLabel =
    sortOrder === "asc" ? "ブランド昇順" : sortOrder === "desc" ? "ブランド降順" : "ブランド並び替え";

  const checkedCount = items.filter((i) => i.check).length;
  const pendingCount = items.filter((i) => i.check && !i.representativeCheck).length;

  // ── 空状態 ─────────────────────────────────────────────────
  if (checkedCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="rounded-full bg-muted p-5">
          <ClipboardList className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">入力済みの商品がありません</h2>
        <p className="text-muted-foreground text-sm">
          社員モードで商品情報が入力されると、ここに表示されます。
        </p>
      </div>
    );
  }

  if (pendingCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="rounded-full bg-muted p-5">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">未処理の商品はありません</h2>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 集計バー ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          入力済み：<span className="font-semibold text-foreground">{checkedCount}</span> 件
        </span>
        <span className="text-muted-foreground">
          承認済み：<span className="font-semibold text-green-600">
            {items.filter((i) => i.representativeCheck).length}
          </span> 件
        </span>
        <span className="text-muted-foreground">
          未判定：<span className="font-semibold text-amber-600">{pendingCount}</span> 件
        </span>
        {brandFilter !== "ALL" && (
          <span className="text-muted-foreground">
            表示中：<span className="font-semibold text-foreground">{reviewed.length}</span> 件
          </span>
        )}
      </div>

      {/* ── ブランドフィルターボタン + ソートバー ── */}
      <div className="rounded-lg border bg-white px-4 py-3 space-y-3">
        <BrandFilterButtons
          selected={brandFilter}
          onChange={setBrandFilter}
          counts={brandCounts}
        />

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Button
            variant={sortOrder !== "none" ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={cycleSort}
          >
            <SortIcon className="h-3.5 w-3.5" />
            {sortLabel}
          </Button>

          {(brandFilter !== "ALL" || sortOrder !== "none") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setBrandFilter("ALL");
                setSortOrder("none");
              }}
            >
              クリア
            </Button>
          )}
        </div>
      </div>

      {/* ── リスト ── */}
      <div className="divide-y rounded-lg border overflow-hidden">
        {/* テーブルヘッダー */}
        <div
          className="hidden md:grid gap-3 bg-muted/60 px-4 py-2.5 text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: "minmax(0,1fr) 6rem minmax(0,1.1fr) minmax(0,0.8fr) 5rem minmax(0,1.5fr) auto" }}
        >
          <span>商品URL（A列）</span>
          <span>価格情報（H・K・L列）</span>
          <span>参考URL①〜⑤（M〜Q列）</span>
          <span>補足メモ（R列）</span>
          <span>ブランド（D列）</span>
          <span>フィードバック（U列）</span>
          <span>承認（S・T列）</span>
        </div>

        {reviewed.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm bg-white">
            このブランドの未判定商品はありません
          </div>
        ) : (
          reviewed.map((item) => {
            const draft = feedbackDraft[item.id] ?? item.feedback;
            const isDirty = draft !== item.feedback;
            const isNoteExpanded = expandedNotes.has(item.id);
            const hasLongNote = item.notes.length > 50;
            const isFading = fadingIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`px-4 py-4 bg-white transition-opacity duration-300 ease-in-out ${
                  isFading ? "opacity-0 pointer-events-none" : "opacity-100 hover:bg-muted/20"
                }`}
              >
                <div
                  className="flex flex-col gap-3 md:grid md:items-start md:gap-3"
                  style={{ gridTemplateColumns: "minmax(0,1fr) 6rem minmax(0,1.1fr) minmax(0,0.8fr) 5rem minmax(0,1.5fr) auto" }}
                >
                  {/* 商品URL */}
                  <div className="min-w-0 overflow-hidden">
                    <p className="text-xs text-muted-foreground mb-0.5 md:hidden">商品URL</p>
                    {item.productUrl ? (
                      <a
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline max-w-full"
                        title={item.productUrl}
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate block min-w-0">
                          {item.productUrl.replace(/^https?:\/\//, "")}
                        </span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                    {item.assignee && (
                      <p className="mt-1 text-xs text-muted-foreground md:hidden">
                        担当：{item.assignee}
                      </p>
                    )}
                  </div>

                  {/* 価格情報（相場・入札・卸） */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-0.5 md:hidden">価格情報</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-muted-foreground shrink-0 w-6">相場</span>
                      <span className="text-sm font-mono font-medium whitespace-nowrap">
                        {item.marketPrice != null
                          ? `¥${item.marketPrice.toLocaleString()}`
                          : <span className="text-muted-foreground">—</span>}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-muted-foreground shrink-0 w-6">入札</span>
                      <span className="text-sm font-mono font-medium whitespace-nowrap text-blue-700">
                        {item.bidPrice != null && item.bidPrice !== 0
                          ? `¥${item.bidPrice.toLocaleString()}`
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-muted-foreground shrink-0 w-6">卸値</span>
                      <span className="text-sm font-mono font-medium whitespace-nowrap text-green-700">
                        {item.wholesalePrice != null && item.wholesalePrice !== 0
                          ? `¥${item.wholesalePrice.toLocaleString()}`
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </span>
                    </div>
                  </div>

                  {/* 参考URL ①〜⑤ */}
                  <div className="min-w-0 overflow-hidden space-y-0.5">
                    <p className="text-xs text-muted-foreground mb-0.5 md:hidden">参考URL</p>
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
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline min-w-0"
                          title={url}
                        >
                          <span className="text-muted-foreground shrink-0">{label}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate min-w-0">
                            {url.replace(/^https?:\/\//, "")}
                          </span>
                        </a>
                      ) : null
                    )}
                    {!item.referenceUrl1 && !item.referenceUrl2 && !item.referenceUrl3 &&
                     !item.referenceUrl4 && !item.referenceUrl5 && (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                    {item.assignee && (
                      <Badge variant="outline" className="hidden md:inline-flex mt-1 text-xs font-normal">
                        {item.assignee}
                      </Badge>
                    )}
                  </div>

                  {/* 補足メモ（アコーディオン） */}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5 md:hidden">補足メモ</p>
                    {item.notes ? (
                      <div>
                        <span
                          className={`text-sm text-muted-foreground block ${
                            isNoteExpanded ? "" : "line-clamp-3"
                          }`}
                        >
                          {item.notes}
                        </span>
                        {hasLongNote && (
                          <button
                            className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                            onClick={() => toggleNote(item.id)}
                          >
                            {isNoteExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                閉じる
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                続きを見る
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>

                  {/* ブランド */}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5 md:hidden">ブランド</p>
                    {item.brandName ? (
                      <Badge
                        variant="secondary"
                        className="text-xs font-normal max-w-[72px] truncate block"
                        title={item.brandName}
                      >
                        {item.brandName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>

                  {/* フィードバック入力 */}
                  <div className="flex gap-1.5 items-start min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5 md:hidden">
                        フィードバック
                      </p>
                      <Input
                        ref={(el) => { feedbackRefs.current[item.id] = el; }}
                        placeholder="フィードバックを入力..."
                        className="h-8 text-sm"
                        value={draft}
                        onChange={(e) =>
                          setFeedbackDraft((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    {isDirty && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 shrink-0"
                        title="フィードバックを保存"
                        onClick={() => {
                          onSaveFeedback(item.id, draft);
                          setFeedbackDraft((prev) => {
                            const next = { ...prev };
                            delete next[item.id];
                            return next;
                          });
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* 〇/× ボタン */}
                  <div className="flex items-start gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 px-2.5 bg-green-600 hover:bg-green-700 text-white shrink-0"
                      title="合格（フィードバックも同時保存）"
                      onClick={() => handleJudge(item.id, true)}
                    >
                      〇
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 border-red-300 text-red-600 hover:bg-red-50 shrink-0"
                      title="不合格（フィードバックも同時保存）"
                      onClick={() => handleJudge(item.id, false)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
