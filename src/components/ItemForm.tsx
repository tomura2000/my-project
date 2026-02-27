"use client";

import { useState } from "react";
import { AuctionItem, CreateAuctionItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ItemFormProps {
  item?: AuctionItem;
  onSubmit: (data: CreateAuctionItem) => void;
  onCancel: () => void;
}

const emptyForm: CreateAuctionItem = {
  productUrl: "",
  brandName: "",
  check: false,
  bidTarget: false,
  assignee: "",
  marketPrice: null,
  bidPrice: null,
  wholesalePrice: null,
  referenceUrl1: "",
  referenceUrl2: "",
  referenceUrl3: "",
  referenceUrl4: "",
  referenceUrl5: "",
  notes: "",
  representativeCheck: false,
  judgmentResult: false,
  feedback: "",
  feedbackConfirmed: false,
};

export function ItemForm({ item, onSubmit, onCancel }: ItemFormProps) {
  const [form, setForm] = useState<CreateAuctionItem>(
    item
      ? {
          productUrl: item.productUrl,
          brandName: item.brandName,
          check: item.check,
          bidTarget: item.bidTarget,
          assignee: item.assignee,
          marketPrice: item.marketPrice,
          bidPrice: item.bidPrice,
          wholesalePrice: item.wholesalePrice,
          referenceUrl1: item.referenceUrl1,
          referenceUrl2: item.referenceUrl2,
          referenceUrl3: item.referenceUrl3,
          referenceUrl4: item.referenceUrl4,
          referenceUrl5: item.referenceUrl5,
          notes: item.notes,
          representativeCheck: item.representativeCheck,
          judgmentResult: item.judgmentResult,
          feedback: item.feedback,
          feedbackConfirmed: item.feedbackConfirmed,
        }
      : emptyForm
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 商品URL */}
      <div className="space-y-1.5">
        <Label htmlFor="productUrl">
          商品URL <span className="text-xs text-muted-foreground">(A列)</span>
        </Label>
        <Input
          id="productUrl"
          type="url"
          placeholder="https://page.auctions.yahoo.co.jp/..."
          value={form.productUrl}
          onChange={(e) => setForm({ ...form, productUrl: e.target.value })}
        />
      </div>

      {/* チェック系フィールド */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 rounded-md border p-3">
          <Checkbox
            id="check"
            checked={form.check}
            onCheckedChange={(v) => setForm({ ...form, check: !!v })}
          />
          <Label htmlFor="check" className="cursor-pointer">
            check <span className="text-xs text-muted-foreground">(E列)</span>
          </Label>
        </div>
        <div className="flex items-center gap-2 rounded-md border p-3">
          <Checkbox
            id="bidTarget"
            checked={form.bidTarget}
            onCheckedChange={(v) => setForm({ ...form, bidTarget: !!v })}
          />
          <Label htmlFor="bidTarget" className="cursor-pointer">
            入札対象 <span className="text-xs text-muted-foreground">(F列)</span>
          </Label>
        </div>
        <div className="flex items-center gap-2 rounded-md border p-3">
          <Checkbox
            id="representativeCheck"
            checked={form.representativeCheck}
            onCheckedChange={(v) =>
              setForm({ ...form, representativeCheck: !!v })
            }
          />
          <Label htmlFor="representativeCheck" className="cursor-pointer">
            代表チェック <span className="text-xs text-muted-foreground">(S列)</span>
          </Label>
        </div>
        <div className="flex items-center gap-2 rounded-md border p-3">
          <Checkbox
            id="judgmentResult"
            checked={form.judgmentResult}
            onCheckedChange={(v) => setForm({ ...form, judgmentResult: !!v })}
          />
          <Label htmlFor="judgmentResult" className="cursor-pointer">
            成否判断（合格） <span className="text-xs text-muted-foreground">(T列)</span>
          </Label>
        </div>
        <div className="flex items-center gap-2 rounded-md border p-3">
          <Checkbox
            id="feedbackConfirmed"
            checked={form.feedbackConfirmed}
            onCheckedChange={(v) => setForm({ ...form, feedbackConfirmed: !!v })}
          />
          <Label htmlFor="feedbackConfirmed" className="cursor-pointer">
            FB確認済み <span className="text-xs text-muted-foreground">(V列)</span>
          </Label>
        </div>
      </div>

      {/* 相場価格 */}
      <div className="space-y-1.5">
        <Label htmlFor="marketPrice">
          相場価格 <span className="text-xs text-muted-foreground">(H列)</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            ¥
          </span>
          <Input
            id="marketPrice"
            type="number"
            className="pl-7"
            placeholder="0"
            value={form.marketPrice ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                marketPrice: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
      </div>

      {/* 参考URL */}
      <div className="space-y-1.5">
        <Label htmlFor="referenceUrl1">
          参考URL1 <span className="text-xs text-muted-foreground">(M列)</span>
        </Label>
        <Input
          id="referenceUrl1"
          type="url"
          placeholder="https://..."
          value={form.referenceUrl1}
          onChange={(e) => setForm({ ...form, referenceUrl1: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="referenceUrl2">
          参考URL2 <span className="text-xs text-muted-foreground">(N列)</span>
        </Label>
        <Input
          id="referenceUrl2"
          type="url"
          placeholder="https://..."
          value={form.referenceUrl2}
          onChange={(e) => setForm({ ...form, referenceUrl2: e.target.value })}
        />
      </div>

      {/* 参考URL③〜⑤ */}
      {(
        [
          { id: "ref3", key: "referenceUrl3" as const, label: "③", col: "O列" },
          { id: "ref4", key: "referenceUrl4" as const, label: "④", col: "P列" },
          { id: "ref5", key: "referenceUrl5" as const, label: "⑤", col: "Q列" },
        ] as const
      ).map(({ id, key, label, col }) => (
        <div key={id} className="space-y-1.5">
          <Label htmlFor={id}>
            参考URL{label} <span className="text-xs text-muted-foreground">({col})</span>
          </Label>
          <Input
            id={id}
            type="url"
            placeholder="https://..."
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </div>
      ))}

      {/* フィードバック */}
      <div className="space-y-1.5">
        <Label htmlFor="feedback">
          フィードバック <span className="text-xs text-muted-foreground">(U列)</span>
        </Label>
        <Textarea
          id="feedback"
          placeholder="入札結果や反省点など..."
          rows={3}
          value={form.feedback}
          onChange={(e) => setForm({ ...form, feedback: e.target.value })}
        />
      </div>

      {/* アクションボタン */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit">
          {item ? "更新する" : "登録する"}
        </Button>
      </div>
    </form>
  );
}
