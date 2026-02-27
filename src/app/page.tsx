"use client";

import { useState, useEffect, useCallback } from "react";
import { AuctionItem, Assignee } from "@/lib/types";
import { sampleItems } from "@/lib/data";
import { AssigneeSelect, ASSIGNEE_COLORS } from "@/components/AssigneeSelect";
import { EmployeeMode } from "@/components/EmployeeMode";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "employee" | "feedback" | "representative";
type ConnectionStatus = "loading" | "connected" | "sample";

async function apiPatch(id: string, payload: object): Promise<void> {
  const res = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
}

export default function HomePage() {
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("employee");
  const [status, setStatus] = useState<ConnectionStatus>("loading");

  // 担当者はページ全体で共有（入札入力・フィードバック確認で同じ人を使う）
  const [currentAssignee, setCurrentAssignee] = useState<Assignee>("");

  // ── データ取得 ───────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/items");
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
      setItems(sampleItems);
      setStatus("sample");
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── ローカル状態更新 + API PATCH ────────────────────────────
  const patchItem = async (id: string, payload: object, msg: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, ...(payload as Partial<AuctionItem>), updatedAt: new Date().toISOString() } : i
      )
    );
    if (status === "connected") {
      try {
        await apiPatch(id, payload);
        toast.success(msg);
      } catch (err) {
        toast.error(`保存に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
      }
    } else {
      toast.success(`${msg}（サンプルデータ）`);
    }
  };

  // ── ハンドラ ────────────────────────────────────────────────
  const handleEmployeeSave = (id: string, data: Parameters<typeof patchItem>[1] & object) =>
    patchItem(id, data, "保存しました。次の商品に進みます。");

  const handleApprove = (id: string, feedback: string) =>
    patchItem(id, { representativeCheck: true, judgmentResult: true, feedback }, "合格として記録しました（S・T・U列を更新）");

  const handleReject = (id: string, feedback: string) =>
    patchItem(id, { representativeCheck: true, judgmentResult: false, feedback }, "不合格として記録しました（S・T・U列を更新）");

  const handleSaveFeedback = (id: string, feedback: string) =>
    patchItem(id, { feedback }, "フィードバックを保存しました（U列）");

  const handleFeedbackConfirm = (id: string) =>
    patchItem(id, { feedbackConfirmed: true }, "確認済みにしました（V列）");

  // ── 集計 ────────────────────────────────────────────────────
  const pendingCount   = items.filter((i) => !i.check).length;
  const feedbackCount  = items.filter((i) => i.assignee === currentAssignee && i.feedback.trim() !== "" && !i.feedbackConfirmed).length;
  const approvalCount  = items.filter((i) => i.check && !i.representativeCheck).length;

  // ── 社員系タブで担当者未選択なら選択画面を表示 ─────────────
  const needsAssignee = (activeTab === "employee" || activeTab === "feedback") && !currentAssignee;

  // ── タブ設定 ────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "employee",       label: "入札入力",         icon: ClipboardList, badge: pendingCount },
    { key: "feedback",       label: "フィードバック確認", icon: MessageSquare,  badge: currentAssignee ? feedbackCount : undefined },
    { key: "representative", label: "代表モード",        icon: Crown,          badge: approvalCount },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── ヘッダー ── */}
      <header className="bg-white border-b sticky top-0 z-20">
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
                                       ? key === "representative" ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
                                       : "bg-muted-foreground/20 text-muted-foreground"}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

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
        /* 担当者選択画面（入札入力・フィードバック確認タブ共通） */
        <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8">
          <AssigneeSelect onSelect={setCurrentAssignee} />
        </main>
      ) : (
        <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8">
          {activeTab === "employee" && (
            <EmployeeMode
              items={items}
              currentAssignee={currentAssignee}
              onAssigneeChange={setCurrentAssignee}
              onSave={handleEmployeeSave}
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
            <RepresentativeMode
              items={items}
              onApprove={handleApprove}
              onReject={handleReject}
              onSaveFeedback={handleSaveFeedback}
            />
          )}
        </main>
      )}

      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
