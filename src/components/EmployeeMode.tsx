"use client";

import { useState, useRef } from "react";
import { AuctionItem, Assignee } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ExternalLink,
  LogOut,
  Send,
  PlusCircle,
  List,
  Pencil,
  X,
} from "lucide-react";
import { ASSIGNEE_COLORS } from "@/components/AssigneeSelect";
import { toast } from "sonner";

// ── 型定義 ────────────────────────────────────────────────

export interface PostData {
  productUrl: string;
  assignee: Assignee;
  marketPrice: number | null;
  referenceUrl1: string;
  referenceUrl2: string;
  referenceUrl3: string;
  referenceUrl4: string;
  referenceUrl5: string;
  notes: string;
}

interface EmployeeModeProps {
  currentAssignee: Assignee;
  onAssigneeChange: (assignee: Assignee) => void;
  categoryKey: string;
  onPost: (data: PostData) => Promise<void>;
  onUpdate: (id: string, data: PostData) => Promise<void>;
  items: AuctionItem[];
  isSample: boolean;
}

interface FormState {
  productUrl: string;
  marketPrice: string;
  referenceUrl1: string;
  referenceUrl2: string;
  referenceUrl3: string;
  referenceUrl4: string;
  referenceUrl5: string;
  notes: string;
}

const emptyForm: FormState = {
  productUrl: "",
  marketPrice: "",
  referenceUrl1: "",
  referenceUrl2: "",
  referenceUrl3: "",
  referenceUrl4: "",
  referenceUrl5: "",
  notes: "",
};

type InnerTab = "form" | "list";

// ── メインコンポーネント ─────────────────────────────────

export function EmployeeMode({
  currentAssignee,
  onAssigneeChange,
  onPost,
  onUpdate,
  items,
  isSample,
}: EmployeeModeProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [innerTab, setInnerTab] = useState<InnerTab>("form");
  const [editingItem, setEditingItem] = useState<AuctionItem | null>(null);
  const productUrlRef = useRef<HTMLInputElement>(null);

  // 自分の投稿でU列（代表チェック）未確認のもの
  const myPendingItems = items.filter(
    (i) => i.assignee === currentAssignee && !i.representativeCheck
  );

  const startEdit = (item: AuctionItem) => {
    setEditingItem(item);
    setForm({
      productUrl: item.productUrl,
      marketPrice: item.marketPrice != null ? String(item.marketPrice) : "",
      referenceUrl1: item.referenceUrl1,
      referenceUrl2: item.referenceUrl2,
      referenceUrl3: item.referenceUrl3,
      referenceUrl4: item.referenceUrl4,
      referenceUrl5: item.referenceUrl5,
      notes: item.notes,
    });
    setInnerTab("form");
    setTimeout(() => productUrlRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.productUrl.trim()) {
      toast.error("商品URLを入力してください");
      productUrlRef.current?.focus();
      return;
    }

    const data: PostData = {
      productUrl: form.productUrl.trim(),
      assignee: currentAssignee,
      marketPrice: form.marketPrice ? Number(form.marketPrice) : null,
      referenceUrl1: form.referenceUrl1.trim(),
      referenceUrl2: form.referenceUrl2.trim(),
      referenceUrl3: form.referenceUrl3.trim(),
      referenceUrl4: form.referenceUrl4.trim(),
      referenceUrl5: form.referenceUrl5.trim(),
      notes: form.notes.trim(),
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await onUpdate(editingItem.id, data);
        setEditingItem(null);
      } else {
        await onPost(data);
      }
      setForm(emptyForm);
      productUrlRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── ユーザーバー ── */}
      <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                      text-white text-sm font-bold ${ASSIGNEE_COLORS[currentAssignee] ?? "bg-gray-400"}`}
        >
          {currentAssignee[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{currentAssignee} として投稿中</p>
          <p className="text-xs text-muted-foreground">
            商品URLを入力して投稿してください
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => onAssigneeChange("")}
        >
          <LogOut className="h-3.5 w-3.5" />
          変更
        </Button>
      </div>

      {/* ── インナータブ ── */}
      <div className="flex rounded-lg border bg-muted p-1 gap-0.5">
        <button
          onClick={() => setInnerTab("form")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all
            ${innerTab === "form"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"}`}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {editingItem ? "編集中" : "新規投稿"}
        </button>
        <button
          onClick={() => setInnerTab("list")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all
            ${innerTab === "list"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"}`}
        >
          <List className="h-3.5 w-3.5" />
          投稿の修正
          {myPendingItems.length > 0 && (
            <span className={`inline-flex items-center justify-center rounded-full text-xs font-semibold h-4 min-w-4 px-1
              ${innerTab === "list"
                ? "bg-primary text-primary-foreground"
                : "bg-muted-foreground/20 text-muted-foreground"}`}>
              {myPendingItems.length}
            </span>
          )}
        </button>
      </div>

      {/* ── 新規投稿 / 編集フォーム ── */}
      {innerTab === "form" && (
        <Card className="shadow-md border-0 ring-1 ring-border">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-2 shrink-0">
                {editingItem ? (
                  <Pencil className="h-4 w-4 text-primary" />
                ) : (
                  <PlusCircle className="h-4 w-4 text-primary" />
                )}
              </div>
              <CardTitle className="text-base flex-1">
                {editingItem ? "投稿を編集" : "新規商品を登録"}
              </CardTitle>
              {editingItem && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground hover:text-foreground"
                  onClick={cancelEdit}
                >
                  <X className="h-3.5 w-3.5" />
                  キャンセル
                </Button>
              )}
            </div>
            {editingItem && (
              <p className="text-xs text-muted-foreground mt-1 truncate pl-10">
                編集中：{editingItem.productUrl}
              </p>
            )}
          </CardHeader>

          <CardContent className="pt-5 space-y-5">

            {/* 商品URL */}
            <div className="space-y-1.5">
              <Label htmlFor="productUrl" className="flex items-center gap-1.5">
                商品URL
                <span className="text-xs text-muted-foreground font-normal">（A列・必須）</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  ref={productUrlRef}
                  id="productUrl"
                  type="url"
                  className="h-11 flex-1"
                  placeholder="https://page.auctions.yahoo.co.jp/..."
                  value={form.productUrl}
                  onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                />
                {form.productUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    title="商品ページを開く"
                    onClick={() => window.open(form.productUrl, "_blank", "noopener noreferrer")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* 相場 */}
            <div className="space-y-1.5">
              <Label htmlFor="marketPrice" className="flex items-center gap-1.5">
                相場
                <span className="text-xs text-muted-foreground font-normal">（J列）</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  ¥
                </span>
                <Input
                  id="marketPrice"
                  type="number"
                  min={0}
                  className="pl-7 text-base h-11"
                  placeholder="例：85000"
                  value={form.marketPrice}
                  onChange={(e) => setForm({ ...form, marketPrice: e.target.value })}
                />
              </div>
            </div>

            {/* 参考URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                参考URL
                <span className="text-xs text-muted-foreground font-normal">（O〜S列）</span>
              </Label>
              {(
                [
                  { id: "ref1", key: "referenceUrl1" as const, label: "①" },
                  { id: "ref2", key: "referenceUrl2" as const, label: "②" },
                  { id: "ref3", key: "referenceUrl3" as const, label: "③" },
                  { id: "ref4", key: "referenceUrl4" as const, label: "④" },
                  { id: "ref5", key: "referenceUrl5" as const, label: "⑤" },
                ] as const
              ).map(({ id, key, label }) => (
                <div key={id} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-4 shrink-0">{label}</span>
                  <Input
                    id={id}
                    type="url"
                    className="h-10 flex-1"
                    placeholder="https://..."
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            {/* 補足メモ */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="flex items-center gap-1.5">
                補足メモ
                <span className="text-xs text-muted-foreground font-normal">（T列）</span>
              </Label>
              <Textarea
                id="notes"
                rows={3}
                className="resize-none"
                placeholder="商品の状態、注意点など自由に記入..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {/* 送信ボタン */}
            <Button
              className="w-full h-12 text-base gap-2"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>送信中...</>
              ) : editingItem ? (
                <>
                  <Send className="h-4 w-4" />
                  更新する
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isSample ? "投稿する（サンプル）" : "投稿する"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── 対象の投稿リスト ── */}
      {innerTab === "list" && (
        <div className="space-y-3">
          {myPendingItems.length === 0 ? (
            <div className="rounded-xl border bg-white py-16 text-center space-y-2">
              <List className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">修正できる投稿はありません</p>
              <p className="text-xs text-muted-foreground">代表者確認前の投稿がここに表示されます</p>
            </div>
          ) : (
            myPendingItems.map((item) => (
              <Card key={item.id} className="border-0 ring-1 ring-border bg-white">
                <CardContent className="pt-4 pb-4 px-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
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
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {item.marketPrice != null && (
                          <span>
                            相場:{" "}
                            <span className="font-mono font-semibold text-foreground">
                              ¥{item.marketPrice.toLocaleString()}
                            </span>
                          </span>
                        )}
                        {item.notes && (
                          <span className="truncate max-w-[200px]">メモ: {item.notes}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      編集
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
