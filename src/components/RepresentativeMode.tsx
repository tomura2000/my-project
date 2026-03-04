"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AuctionItem, ASSIGNEES } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { getSampleItems } from "@/lib/data";
import { ASSIGNEE_COLORS } from "@/components/AssigneeSelect";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  Loader2,
  RefreshCw,
  Globe,
} from "lucide-react";

// ── 型定義 ────────────────────────────────────────────────

/** 全カテゴリーを横断したアイテム型（カテゴリー情報を付与） */
interface RichItem extends AuctionItem {
  /** カテゴリーと行番号を合わせた一意キー（例: "apparel-2"） */
  uid: string;
  categoryKey: string;
  categoryLabel: string;
}

type SortOrder = "none" | "asc" | "desc";

const FADE_DURATION_MS = 300;

// ── カテゴリーバッジの色定義 ─────────────────────────────

const CATEGORY_BADGE_STYLE: Record<string, string> = {
  apparel: "border-blue-300 text-blue-700 bg-blue-50",
  bags:    "border-violet-300 text-violet-700 bg-violet-50",
};

// ── RepresentativeMode ────────────────────────────────────

/**
 * 代表モード — 全カテゴリーのデータを統合して表示する自己完結コンポーネント。
 * データ取得・PATCH 送信をコンポーネント内部で行うため、親からの props は不要。
 */
export function RepresentativeMode() {
  // ── 全カテゴリー統合データ ─────────────────────────────
  const [allItems, setAllItems] = useState<RichItem[]>([]);
  const [fetchStatus, setFetchStatus] = useState<"loading" | "done">("loading");
  const [isSample, setIsSample] = useState(false);

  // ── フィルター・ソート ─────────────────────────────────
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");

  // ── フィードバック（uid をキーに使用してカテゴリー間 ID 衝突を防ぐ） ──
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const feedbackRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // ── データ取得（全カテゴリー並列） ────────────────────

  const fetchAll = useCallback(async () => {
    setFetchStatus("loading");
    try {
      const results = await Promise.all(
        CATEGORIES.map(async (cat) => {
          const res = await fetch(`/api/items?category=${cat.key}`);
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            if (body.error === "not_configured") throw new Error("not_configured");
            throw new Error(body.message ?? `HTTP ${res.status}`);
          }
          const items: AuctionItem[] = await res.json();
          return items.map<RichItem>((item) => ({
            ...item,
            uid: `${cat.key}-${item.id}`,
            categoryKey: cat.key,
            categoryLabel: cat.label,
          }));
        })
      );
      setAllItems(results.flat());
      setIsSample(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg !== "not_configured") {
        toast.error("データ取得に失敗しました。サンプルデータを表示します。");
      }
      const sampleRich = CATEGORIES.flatMap((cat) =>
        getSampleItems(cat.key).map<RichItem>((item) => ({
          ...item,
          uid: `${cat.key}-${item.id}`,
          categoryKey: cat.key,
          categoryLabel: cat.label,
        }))
      );
      setAllItems(sampleRich);
      setIsSample(true);
    } finally {
      setFetchStatus("done");
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── PATCH（カテゴリーに応じてエンドポイントを切り替え） ──

  const patchItem = useCallback(async (
    item: RichItem,
    payload: object,
    successMsg: string
  ) => {
    // ローカル楽観的更新
    setAllItems((prev) =>
      prev.map((i) =>
        i.uid === item.uid
          ? { ...i, ...(payload as Partial<AuctionItem>), updatedAt: new Date().toISOString() }
          : i
      )
    );

    if (!isSample) {
      try {
        const res = await fetch(`/api/items/${item.id}?category=${item.categoryKey}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `HTTP ${res.status}`);
        }
        toast.success(successMsg);
      } catch (err) {
        toast.error(`保存に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
      }
    } else {
      toast.success(`${successMsg}（サンプルデータ）`);
    }
  }, [isSample]);

  // ── 判定ハンドラ ──────────────────────────────────────

  const handleJudge = useCallback((item: RichItem, isApprove: boolean) => {
    const currentFeedback = feedbackDraft[item.uid] ?? item.feedback ?? "";

    setFeedbackDraft((prev) => {
      const next = { ...prev };
      delete next[item.uid];
      return next;
    });

    setFadingIds((prev) => new Set([...prev, item.uid]));

    setTimeout(() => {
      patchItem(
        item,
        { representativeCheck: true, judgmentResult: isApprove, feedback: currentFeedback },
        isApprove ? "合格として記録しました（S・T・U列）" : "不合格として記録しました（S・T・U列）"
      );
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.uid);
        return next;
      });
    }, FADE_DURATION_MS);
  }, [feedbackDraft, patchItem]);

  const handleSaveFeedback = useCallback((item: RichItem, feedback: string) => {
    patchItem(item, { feedback }, "フィードバックを保存しました（U列）");
    setFeedbackDraft((prev) => {
      const next = { ...prev };
      delete next[item.uid];
      return next;
    });
  }, [patchItem]);

  // ── 全URL一括オープン ─────────────────────────────────

  const openAllUrls = useCallback((item: RichItem) => {
    const urls = [
      item.productUrl,
      item.referenceUrl1,
      item.referenceUrl2,
      item.referenceUrl3,
      item.referenceUrl4,
      item.referenceUrl5,
    ].filter((u): u is string => !!u);

    // ブラウザのポップアップブロック対策: 150ms ずつずらして開く
    urls.forEach((url, i) => {
      setTimeout(() => window.open(url, "_blank", "noopener noreferrer"), i * 150);
    });
  }, []);

  // ── フィルタ + ソート ─────────────────────────────────

  const reviewed = useMemo(() => {
    const filtered = allItems
      .filter((i) => i.check && !i.representativeCheck)
      .filter((i) => assigneeFilter === "ALL" || i.assignee === assigneeFilter);

    if (sortOrder === "none") return filtered;
    return [...filtered].sort((a, b) => {
      const cmp = a.brandName.localeCompare(b.brandName, "ja");
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [allItems, assigneeFilter, sortOrder]);

  // 担当者別の未判定件数
  const assigneeCounts = useMemo(() => {
    const base = allItems.filter((i) => i.check && !i.representativeCheck);
    const counts: Record<string, number> = { ALL: base.length };
    for (const name of ASSIGNEES) {
      counts[name] = base.filter((i) => i.assignee === name).length;
    }
    return counts;
  }, [allItems]);

  // 全件完了トースト
  const prevPendingRef = useRef<number | null>(null);
  useEffect(() => {
    if (fetchStatus !== "done") return;
    const curr = allItems.filter((i) => i.check && !i.representativeCheck).length;
    const checked = allItems.filter((i) => i.check).length;
    if (prevPendingRef.current !== null && prevPendingRef.current > 0 && curr === 0 && checked > 0) {
      toast.success(`全 ${checked} 件の判定が完了しました！`, { duration: 5000 });
    }
    prevPendingRef.current = curr;
  }, [allItems, fetchStatus]);

  // ── ローディング ──────────────────────────────────────

  if (fetchStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">全カテゴリーのデータを取得中...</p>
      </div>
    );
  }

  const checkedCount = allItems.filter((i) => i.check).length;
  const pendingCount = allItems.filter((i) => i.check && !i.representativeCheck).length;
  const approvedCount = allItems.filter((i) => i.representativeCheck).length;

  const cycleSort = () =>
    setSortOrder((prev) => prev === "none" ? "asc" : prev === "asc" ? "desc" : "none");
  const SortIcon = sortOrder === "asc" ? ArrowUpAZ : sortOrder === "desc" ? ArrowDownAZ : ArrowUpDown;
  const sortLabel = sortOrder === "asc" ? "ブランド昇順" : sortOrder === "desc" ? "ブランド降順" : "ブランド並び替え";

  // ── 空状態 ────────────────────────────────────────────

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
        <div className="rounded-full bg-green-100 p-5">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold">未処理の商品はありません</h2>
        <p className="text-muted-foreground text-sm">全カテゴリーの判定が完了しています。</p>
      </div>
    );
  }

  // ── メイン表示 ────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* サンプルデータバナー */}
      {isSample && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-800">
          <strong>サンプルデータを表示中。</strong>{" "}
          接続するには <code className="bg-amber-100 px-1 rounded">.env.local</code> を設定して再起動してください。
        </div>
      )}

      {/* 集計バー */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          入力済み：<span className="font-semibold text-foreground">{checkedCount}</span> 件
        </span>
        <span className="text-muted-foreground">
          承認済み：<span className="font-semibold text-green-600">{approvedCount}</span> 件
        </span>
        <span className="text-muted-foreground">
          未判定：<span className="font-semibold text-amber-600">{pendingCount}</span> 件
        </span>
        {/* カテゴリー内訳 */}
        <span className="text-muted-foreground text-xs hidden sm:inline">
          ({CATEGORIES.map((c) => {
            const cnt = allItems.filter((i) => i.check && !i.representativeCheck && i.categoryKey === c.key).length;
            return `${c.label}:${cnt}`;
          }).join(" / ")})
        </span>
        <button
          onClick={fetchAll}
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          再取得
        </button>
      </div>

      {/* 担当者フィルター + ソート */}
      <div className="rounded-lg border bg-white px-4 py-3 space-y-3">
        {/* 担当者ボタン */}
        <div className="flex flex-wrap gap-2">
          {(["ALL", ...ASSIGNEES] as const).map((name) => {
            const isActive = assigneeFilter === name;
            const count = assigneeCounts[name] ?? 0;
            const color = name !== "ALL" ? (ASSIGNEE_COLORS[name] ?? "bg-gray-400") : undefined;

            return (
              <button
                key={name}
                onClick={() => setAssigneeFilter(name)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5
                  text-sm font-medium transition-all
                  ${isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
              >
                {name !== "ALL" && (
                  <span className={`h-4 w-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${color}`}>
                    {name[0]}
                  </span>
                )}
                {name === "ALL" ? "すべて" : name}
                <span className={`rounded-full px-1.5 py-0.5 text-xs leading-none font-semibold
                  ${isActive ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ソート + クリア */}
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
          {(assigneeFilter !== "ALL" || sortOrder !== "none") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => { setAssigneeFilter("ALL"); setSortOrder("none"); }}
            >
              クリア
            </Button>
          )}
          {assigneeFilter !== "ALL" && (
            <span className="text-xs text-muted-foreground ml-auto">
              {reviewed.length} 件表示中
            </span>
          )}
        </div>
      </div>

      {/* アイテムリスト */}
      <div className="divide-y rounded-lg border overflow-hidden">
        {/* テーブルヘッダー（デスクトップ） */}
        <div
          className="hidden md:grid gap-3 bg-muted/60 px-4 py-2.5 text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: "minmax(0,1fr) 6rem minmax(0,1.1fr) minmax(0,0.8fr) 5rem minmax(0,1.5fr) auto" }}
        >
          <span>商品 + カテゴリー（A列）</span>
          <span>価格情報（H・K・L列）</span>
          <span>参考URL（M〜Q列）</span>
          <span>補足メモ（R列）</span>
          <span>ブランド（D列）</span>
          <span>フィードバック（U列）</span>
          <span>承認（S・T列）</span>
        </div>

        {reviewed.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm bg-white">
            この担当者の未判定商品はありません
          </div>
        ) : (
          reviewed.map((item) => {
            const draft = feedbackDraft[item.uid] ?? item.feedback;
            const isDirty = draft !== item.feedback;
            const isNoteExpanded = expandedNotes.has(item.uid);
            const hasLongNote = item.notes.length > 50;
            const isFading = fadingIds.has(item.uid);

            const allUrls = [
              item.productUrl,
              item.referenceUrl1,
              item.referenceUrl2,
              item.referenceUrl3,
              item.referenceUrl4,
              item.referenceUrl5,
            ].filter((u): u is string => !!u);
            const hasMultipleUrls = allUrls.length > 1;

            return (
              <div
                key={item.uid}
                className={`px-4 py-4 bg-white transition-opacity duration-300 ease-in-out ${
                  isFading ? "opacity-0 pointer-events-none" : "opacity-100 hover:bg-muted/20"
                }`}
              >
                <div
                  className="flex flex-col gap-3 md:grid md:items-start md:gap-3"
                  style={{ gridTemplateColumns: "minmax(0,1fr) 6rem minmax(0,1.1fr) minmax(0,0.8fr) 5rem minmax(0,1.5fr) auto" }}
                >
                  {/* 商品URL + カテゴリーバッジ + 担当者 */}
                  <div className="min-w-0 overflow-hidden space-y-1">
                    {/* バッジ行 */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 shrink-0 font-medium
                          ${CATEGORY_BADGE_STYLE[item.categoryKey] ?? "border-gray-300 text-gray-700 bg-gray-50"}`}
                      >
                        {item.categoryLabel}
                      </Badge>
                      {item.assignee && (
                        <span
                          className={`inline-flex items-center justify-center h-4 w-4 rounded-full
                            text-white text-[9px] font-bold shrink-0
                            ${ASSIGNEE_COLORS[item.assignee] ?? "bg-gray-400"}`}
                          title={item.assignee}
                        >
                          {item.assignee[0]}
                        </span>
                      )}
                      {item.assignee && (
                        <span className="text-xs text-muted-foreground hidden md:inline">{item.assignee}</span>
                      )}
                    </div>

                    {/* 商品URL */}
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
                      <p className="text-xs text-muted-foreground md:hidden">担当：{item.assignee}</p>
                    )}
                  </div>

                  {/* 価格情報 */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mb-0.5 md:hidden">価格情報</p>
                    {[
                      { label: "相場", value: item.marketPrice, cls: "text-foreground" },
                      { label: "入札", value: item.bidPrice, cls: "text-blue-700" },
                      { label: "卸値", value: item.wholesalePrice, cls: "text-green-700" },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="flex items-baseline gap-1">
                        <span className="text-xs text-muted-foreground shrink-0 w-6">{label}</span>
                        <span className={`text-sm font-mono font-medium whitespace-nowrap ${cls}`}>
                          {value != null && value !== 0
                            ? `¥${value.toLocaleString()}`
                            : <span className="text-muted-foreground font-normal">—</span>}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 参考URL + 全URL一括オープン */}
                  <div className="min-w-0 overflow-hidden space-y-1">
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
                          <span className="truncate min-w-0">{url.replace(/^https?:\/\//, "")}</span>
                        </a>
                      ) : null
                    )}

                    {/* 全URL一括オープンボタン */}
                    {hasMultipleUrls && (
                      <button
                        onClick={() => openAllUrls(item)}
                        className="mt-1 flex items-center gap-1 rounded px-2 py-1 text-xs font-medium
                          text-primary border border-primary/30 bg-primary/5
                          hover:bg-primary/10 transition-colors"
                        title={`${allUrls.length} 件のURLをすべて別タブで開く`}
                      >
                        <Globe className="h-3 w-3" />
                        全 {allUrls.length} 件を開く
                      </button>
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

                  {/* 補足メモ */}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5 md:hidden">補足メモ</p>
                    {item.notes ? (
                      <div>
                        <span
                          className={`text-sm text-muted-foreground block whitespace-pre-wrap ${
                            isNoteExpanded ? "" : "line-clamp-3"
                          }`}
                        >
                          {item.notes}
                        </span>
                        {hasLongNote && (
                          <button
                            className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                            onClick={() =>
                              setExpandedNotes((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.uid)) next.delete(item.uid);
                                else next.add(item.uid);
                                return next;
                              })
                            }
                          >
                            {isNoteExpanded
                              ? <><ChevronUp className="h-3 w-3" />閉じる</>
                              : <><ChevronDown className="h-3 w-3" />続きを見る</>
                            }
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
                      <p className="text-xs text-muted-foreground mb-0.5 md:hidden">フィードバック</p>
                      <Textarea
                        ref={(el) => { feedbackRefs.current[item.uid] = el; }}
                        placeholder="フィードバックを入力..."
                        className="text-sm resize-none min-h-[5rem]"
                        rows={3}
                        value={draft}
                        onChange={(e) =>
                          setFeedbackDraft((prev) => ({ ...prev, [item.uid]: e.target.value }))
                        }
                      />
                    </div>
                    {isDirty && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 shrink-0"
                        title="フィードバックを保存（U列）"
                        onClick={() => handleSaveFeedback(item, draft)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* 〇/× 判定ボタン */}
                  <div className="flex items-start gap-1 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 px-2.5 bg-green-600 hover:bg-green-700 text-white shrink-0"
                      title="合格（フィードバックも同時保存）"
                      onClick={() => handleJudge(item, true)}
                    >
                      〇
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 border-red-300 text-red-600 hover:bg-red-50 shrink-0"
                      title="不合格（フィードバックも同時保存）"
                      onClick={() => handleJudge(item, false)}
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
