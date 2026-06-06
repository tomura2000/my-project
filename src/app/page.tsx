"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AuctionItem, Assignee } from "@/lib/types";
import { CATEGORIES, DEFAULT_CATEGORY_KEY } from "@/lib/categories";
import { getSampleItems } from "@/lib/data";
import { AssigneeSelect, ASSIGNEE_COLORS } from "@/components/AssigneeSelect";
import { EmployeeMode, PostData } from "@/components/EmployeeMode";
import { FeedbackHistory } from "@/components/FeedbackHistory";
import { RepresentativeMode } from "@/components/RepresentativeMode";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  ShoppingBag,
  ClipboardList,
  MessageSquare,
  Crown,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  LogOut,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "employee" | "feedback" | "representative";
type ConnectionStatus = "loading" | "connected" | "sample";

export default function HomePage() {
  // フィードバック確認タブ用のアイテムリスト
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("employee");
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [currentCategory, setCurrentCategory] = useState<string>(DEFAULT_CATEGORY_KEY);

  // 担当者はページ全体で共有（投稿・フィードバック確認で同じ人を使う）
  const [currentAssignee, setCurrentAssignee] = useState<Assignee>("");

  // ── データ取得（フィードバックタブ用） ──────────────────────
  const fetchItems = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/items?category=${currentCategory}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "not_configured") throw new Error("not_configured");
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      setItems(await res.json());
      setStatus("connected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg !== "not_configured") {
        toast.error("スプレッドシートの取得に失敗しました。サンプルデータを表示します。");
      }
      setItems(getSampleItems(currentCategory));
      setStatus("sample");
    }
  }, [currentCategory]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── 新規投稿（Append） ───────────────────────────────────────
  const handleEmployeePost = async (data: PostData) => {
    if (status === "connected") {
      const res = await fetch(`/api/items?category=${currentCategory}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productUrl: data.productUrl,
          brandName: "",
          check: true,
          bidTarget: data.marketPrice !== null,
          assignee: data.assignee,
          revisedMarketPrice: null,
          marketPrice: data.marketPrice,
          bidPrice: data.bidPrice ?? null,
          wholesalePrice: null,
          referenceUrl1: data.referenceUrl1,
          referenceUrl2: data.referenceUrl2,
          referenceUrl3: data.referenceUrl3,
          referenceUrl4: data.referenceUrl4,
          referenceUrl5: data.referenceUrl5,
          notes: data.notes,
          representativeCheck: data.bidOnly,
          judgmentResult: false,
          feedback: "",
          feedbackConfirmed: false,
          winningSuccess: false,
          auctionDate: "",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      toast.success(data.bidOnly ? "入札登録しました。次の商品を入力できます。" : "投稿しました。次の商品を入力できます。");
    } else {
      // サンプルモード: ローカル state に追加してデモ
      const newItem: AuctionItem = {
        id: String(Date.now()),
        productUrl: data.productUrl,
        brandName: "",
        check: true,
        bidTarget: data.marketPrice !== null,
        assignee: data.assignee,
        revisedMarketPrice: null,
        marketPrice: data.marketPrice,
        bidPrice: data.bidPrice ?? null,
        wholesalePrice: null,
        referenceUrl1: data.referenceUrl1,
        referenceUrl2: data.referenceUrl2,
        referenceUrl3: data.referenceUrl3,
        referenceUrl4: data.referenceUrl4,
        referenceUrl5: data.referenceUrl5,
        notes: data.notes,
        representativeCheck: data.bidOnly,
        judgmentResult: false,
        feedback: "",
        feedbackConfirmed: false,
        winningSuccess: false,
        auctionDate: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
      toast.success(data.bidOnly ? "入札登録しました（サンプルデータ）。次の商品を入力できます。" : "投稿しました（サンプルデータ）。次の商品を入力できます。");
    }
  };

  // ── 投稿編集（Update） ──────────────────────────────────────
  const handleEmployeeUpdate = async (id: string, data: PostData) => {
    const patch = {
      productUrl: data.productUrl,
      marketPrice: data.marketPrice,
      bidTarget: data.marketPrice !== null,
      referenceUrl1: data.referenceUrl1,
      referenceUrl2: data.referenceUrl2,
      referenceUrl3: data.referenceUrl3,
      referenceUrl4: data.referenceUrl4,
      referenceUrl5: data.referenceUrl5,
      notes: data.notes,
    };
    if (status === "connected") {
      const res = await fetch(`/api/items/${id}?category=${currentCategory}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, ...patch, updatedAt: new Date().toISOString() }
            : i
        )
      );
      toast.success("投稿を更新しました。");
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, ...patch, updatedAt: new Date().toISOString() }
            : i
        )
      );
      toast.success("投稿を更新しました（サンプルデータ）。");
    }
  };

  // ── フィードバック確認 ───────────────────────────────────────
  const handleFeedbackConfirm = async (id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, feedbackConfirmed: true, updatedAt: new Date().toISOString() } : i
      )
    );
    if (status === "connected") {
      try {
        const res = await fetch(`/api/items/${id}?category=${currentCategory}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedbackConfirmed: true }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `HTTP ${res.status}`);
        }
        toast.success("確認済みにしました（X列）");
      } catch (err) {
        toast.error(`保存に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
      }
    } else {
      toast.success("確認済みにしました（サンプルデータ）");
    }
  };

  // ── カテゴリー切り替え ───────────────────────────────────────
  const handleCategoryChange = (key: string) => {
    if (key === currentCategory) return;
    setCurrentCategory(key);
    setItems([]);
  };

  // ── 集計 ────────────────────────────────────────────────────
  const feedbackCount = items.filter(
    (i) => i.assignee === currentAssignee && i.feedback.trim() !== "" && !i.feedbackConfirmed
  ).length;

  // ── 社員系タブで担当者未選択なら選択画面を表示 ─────────────
  const needsAssignee = (activeTab === "employee" || activeTab === "feedback") && !currentAssignee;

  // ── タブ設定 ────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "employee",       label: "商品投稿",           icon: ClipboardList },
    { key: "feedback",       label: "フィードバック確認",  icon: MessageSquare, badge: currentAssignee ? feedbackCount : undefined },
    { key: "representative", label: "代表モード",          icon: Crown },
  ];

  const currentCategoryLabel = CATEGORIES.find((c) => c.key === currentCategory)?.label ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── ヘッダー ── */}
      <header className="bg-white border-b sticky top-0 z-20">
        {/* メインヘッダー行 */}
        <div className="max-w-screen-lg mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          {/* ロゴ */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-primary rounded-md p-1.5">
              <ShoppingBag className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm hidden sm:block">ブランド品入札管理</span>
          </div>

          {/* 3タブ切り替え */}
          <nav className="flex items-center bg-muted rounded-lg p-1 gap-0.5 mx-auto">
            {tabs.map(({ key, label, icon: Icon, badge }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-md text-xs sm:text-sm
                              font-medium transition-all whitespace-nowrap
                              ${isActive ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className={`inline-flex items-center justify-center rounded-full text-xs
                                     font-semibold h-4 min-w-4 px-1
                                     ${isActive
                                       ? "bg-primary text-primary-foreground"
                                       : "bg-muted-foreground/20 text-muted-foreground"}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 分析ページリンク */}
          <Link
            href="/analytics"
            className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2 py-1 rounded-md hover:bg-muted"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>分析</span>
          </Link>

          {/* 接続ステータス + ログイン中担当者 */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {currentAssignee && (activeTab === "employee" || activeTab === "feedback") && (
              <div className="flex items-center gap-1.5">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold
                                  ${ASSIGNEE_COLORS[currentAssignee] ?? "bg-gray-400"}`}>
                  {currentAssignee[0]}
                </div>
                <span className="text-xs text-muted-foreground">{currentAssignee}</span>
                <button
                  onClick={() => setCurrentAssignee("")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="担当者を変更"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1">
              {status === "loading" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />接続中
                </span>
              )}
              {status === "connected" && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Wifi className="h-3.5 w-3.5" />接続中
                </span>
              )}
              {status === "sample" && (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <WifiOff className="h-3.5 w-3.5" />サンプル
                </span>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchItems}
                disabled={status === "loading"}>
                <RefreshCw className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* カテゴリー切り替え行 */}
        <div className="border-t bg-muted/20">
          <div className="max-w-screen-lg mx-auto px-4 sm:px-6 h-10 flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">商材：</span>
            <div className="flex items-center gap-1">
              {CATEGORIES.map((cat) => {
                const isActive = currentCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryChange(cat.key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                      ${isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
            {status !== "loading" && (
              <span className="text-xs text-muted-foreground ml-1">
                — {currentCategoryLabel}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* サンプルデータバナー */}
      {status === "sample" && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-2 text-xs text-amber-800">
            <span className="font-semibold">サンプルデータを表示中。</span>
            {" "}接続するには <code className="bg-amber-100 px-1 rounded">.env.local</code> を設定して再起動してください。
          </div>
        </div>
      )}

      {/* ローディング */}
      {status === "loading" ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">データを取得中...</p>
        </div>
      ) : needsAssignee ? (
        /* 担当者選択画面（商品投稿・フィードバック確認タブ共通） */
        <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8">
          <AssigneeSelect onSelect={setCurrentAssignee} />
        </main>
      ) : (
        <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8">
          {activeTab === "employee" && (
            <EmployeeMode
              currentAssignee={currentAssignee}
              onAssigneeChange={setCurrentAssignee}
              categoryKey={currentCategory}
              onPost={handleEmployeePost}
              onUpdate={handleEmployeeUpdate}
              items={items}
              isSample={status === "sample"}
            />
          )}
          {activeTab === "feedback" && (
            <FeedbackHistory
              items={items}
              currentAssignee={currentAssignee}
              onConfirm={handleFeedbackConfirm}
            />
          )}
          {activeTab === "representative" && (
            <RepresentativeMode />
          )}
        </main>
      )}

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
