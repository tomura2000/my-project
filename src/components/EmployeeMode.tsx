"use client";

import { useState, useEffect, useMemo } from "react";
import { AuctionItem, Assignee } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Package,
  LogOut,
  Star,
  Filter,
} from "lucide-react";
import { BrandFilterButtons } from "@/components/BrandFilterButtons";
import { BrandKey, BRANDS, matchesBrand } from "@/lib/brands";
import { ASSIGNEE_COLORS } from "@/components/AssigneeSelect";

interface EmployeeModeProps {
  items: AuctionItem[];
  currentAssignee: Assignee;
  onAssigneeChange: (assignee: Assignee) => void;
  onSave: (
    id: string,
    data: {
      marketPrice: number | null;
      referenceUrl1: string;
      referenceUrl2: string;
      referenceUrl3: string;
      referenceUrl4: string;
      referenceUrl5: string;
      notes: string;
      check: boolean;
      bidTarget: boolean;
      assignee: Assignee;
    }
  ) => void;
}

interface FormState {
  marketPrice: string;
  referenceUrl1: string;
  referenceUrl2: string;
  referenceUrl3: string;
  referenceUrl4: string;
  referenceUrl5: string;
  notes: string;
}

const emptyForm: FormState = {
  marketPrice: "",
  referenceUrl1: "",
  referenceUrl2: "",
  referenceUrl3: "",
  referenceUrl4: "",
  referenceUrl5: "",
  notes: "",
};

export function EmployeeMode({
  items,
  currentAssignee,
  onAssigneeChange,
  onSave,
}: EmployeeModeProps) {
  const [myTaskOnly, setMyTaskOnly] = useState(false);
  const [brandFilter, setBrandFilter] = useState<BrandKey>("ALL");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);

  // ブランドボタン用の件数（未処理商品ベース）
  const brandCounts = useMemo(() => {
    const base = items.filter((i) => !i.check);
    const result: Partial<Record<BrandKey, number>> = { ALL: base.length };
    for (const b of BRANDS) {
      result[b.key] = base.filter((i) => matchesBrand(i.brandName, b.key)).length;
    }
    return result;
  }, [items]);

  // フィルタ後の未処理リスト
  const pending = useMemo(
    () =>
      items
        .filter((i) => !i.check)
        .filter((i) => !myTaskOnly || i.assignee === currentAssignee)
        .filter((i) => matchesBrand(i.brandName, brandFilter)),
    [items, myTaskOnly, brandFilter, currentAssignee]
  );

  const allPendingCount = items.filter((i) => !i.check).length;
  const myTaskCount = items.filter(
    (i) => !i.check && i.assignee === currentAssignee
  ).length;

  const total = items.length;
  const doneCount = total - items.filter((i) => !i.check).length;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const current = pending[currentIndex] ?? null;

  useEffect(() => {
    setForm(emptyForm);
  }, [current?.id]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [myTaskOnly, brandFilter]);

  // 次の商品URL（プリロード対象 & 保存後に自動オープンする先）
  const nextPreloadUrl = pending[currentIndex + 1]?.productUrl ?? null;

  const handleSave = () => {
    if (!current) return;
    const price = form.marketPrice ? Number(form.marketPrice) : null;
    // 状態が変わる前にキャプチャしておく
    const urlToOpen = nextPreloadUrl;
    onSave(current.id, {
      marketPrice: price,
      referenceUrl1: form.referenceUrl1,
      referenceUrl2: form.referenceUrl2,
      referenceUrl3: form.referenceUrl3,
      referenceUrl4: form.referenceUrl4,
      referenceUrl5: form.referenceUrl5,
      notes: form.notes,
      check: true,
      bidTarget: price !== null,
      assignee: currentAssignee,
    });
    if (urlToOpen) {
      window.open(urlToOpen, "_blank", "noopener noreferrer");
    }
    setCurrentIndex((prev) => Math.max(0, Math.min(prev, pending.length - 2)));
  };

  const showEmpty = pending.length === 0;

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
          <p className="text-sm font-medium">{currentAssignee} としてログイン中</p>
          <p className="text-xs text-muted-foreground">
            担当タスク {myTaskCount} 件 ／ 未処理合計 {allPendingCount} 件
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            onAssigneeChange("");
            setMyTaskOnly(false);
            setBrandFilter("ALL");
            setCurrentIndex(0);
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          変更
        </Button>
      </div>

      {/* ── フィルターバー ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white px-4 py-3">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* マイタスクトグル */}
        <button
          onClick={() => setMyTaskOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
            myTaskOnly
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          <Star className="h-3 w-3" />
          マイタスク
          {myTaskCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs leading-none ${
                myTaskOnly
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {myTaskCount}
            </span>
          )}
        </button>

        {/* ブランドフィルター */}
        <BrandFilterButtons
          selected={brandFilter}
          onChange={setBrandFilter}
          counts={brandCounts}
        />

        {(myTaskOnly || brandFilter !== "ALL") && (
          <span className="text-xs text-muted-foreground ml-auto">
            {pending.length} 件表示中
          </span>
        )}
      </div>

      {/* ── 進捗バー ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            処理済み{" "}
            <span className="font-semibold text-foreground">{doneCount}</span> /{" "}
            {total} 件
          </span>
          <span className="font-semibold text-primary">{progressPercent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── 対象なしの場合 ── */}
      {showEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-xl border bg-white">
          <div className="rounded-full bg-green-100 p-5">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">
            {myTaskOnly || brandFilter !== "ALL"
              ? "条件に合う商品はありません"
              : "すべての商品を処理しました"}
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            {myTaskOnly || brandFilter !== "ALL"
              ? "フィルターを解除すると他の商品が表示されます"
              : "代表モードで確認を依頼してください"}
          </p>
          {(myTaskOnly || brandFilter !== "ALL") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMyTaskOnly(false);
                setBrandFilter("ALL");
              }}
            >
              フィルターをクリア
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ── ページネーション ── */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {currentIndex + 1}
              </span>{" "}
              / {pending.length} 件目
            </span>
            <div className="flex gap-1">
              {pending.slice(0, 12).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
              {pending.length > 12 && (
                <span className="text-xs text-muted-foreground ml-1">…</span>
              )}
            </div>
          </div>

          {/* ── メインカード ── */}
          <Card className="shadow-md border-0 ring-1 ring-border">
            {/* ヘッダー：タイトル＋ブランドのみ */}
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-2 shrink-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">商品情報入力</CardTitle>
                  {current.brandName && (
                    <Badge
                      variant="secondary"
                      className="mt-0.5 text-xs font-normal"
                    >
                      {current.brandName}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-5">
              {/* ── 商品URL表示 + 遷移ボタン（中央・押しやすい位置） ── */}
              <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2.5">
                <p className="text-xs text-muted-foreground font-medium">商品URL（A列）</p>
                {current.productUrl ? (
                  <p
                    className="text-xs text-foreground/70 break-all line-clamp-2 leading-relaxed"
                    title={current.productUrl}
                  >
                    {current.productUrl}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">URLなし</p>
                )}
                <Button
                  className="w-full gap-2 h-10"
                  variant="default"
                  onClick={() =>
                    window.open(current.productUrl, "_blank", "noopener noreferrer")
                  }
                  disabled={!current.productUrl}
                >
                  <ExternalLink className="h-4 w-4" />
                  商品ページを開く
                </Button>
              </div>

              {/* 相場価格 */}
              <div className="space-y-1.5">
                <Label htmlFor="marketPrice" className="flex items-center gap-1.5">
                  相場価格
                  <span className="text-xs text-muted-foreground font-normal">
                    （H列）
                  </span>
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
                    onChange={(e) =>
                      setForm({ ...form, marketPrice: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  参考URL
                  <span className="text-xs text-muted-foreground font-normal">
                    （M〜Q列）
                  </span>
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
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="flex items-center gap-1.5">
                  補足メモ
                  <span className="text-xs text-muted-foreground font-normal">
                    （R列）
                  </span>
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

              <Button
                className="w-full h-12 text-base gap-2"
                onClick={handleSave}
              >
                保存して次へ
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── 次の商品をバックグラウンドでプリロード ── */}
      {nextPreloadUrl && (
        <iframe
          key={nextPreloadUrl}
          src={nextPreloadUrl}
          // eslint-disable-next-line react/no-unknown-property
          sandbox=""
          aria-hidden="true"
          tabIndex={-1}
          style={{ display: "none" }}
        />
      )}
    </div>
  );
}
