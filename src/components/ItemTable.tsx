"use client";

import { useState } from "react";
import { AuctionItem } from "@/lib/types";
import { BidTargetBadge, JudgmentBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ItemForm } from "@/components/ItemForm";
import { CreateAuctionItem } from "@/lib/types";
import { ExternalLink, Pencil, Trash2, Plus } from "lucide-react";

interface ItemTableProps {
  items: AuctionItem[];
  onUpdate: (id: string, data: Partial<CreateAuctionItem>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: CreateAuctionItem) => void;
}

function truncateUrl(url: string, maxLength = 40): string {
  if (!url) return "—";
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength) + "…";
}

export function ItemTable({ items, onUpdate, onDelete, onCreate }: ItemTableProps) {
  const [editingItem, setEditingItem] = useState<AuctionItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleUpdate = (data: CreateAuctionItem) => {
    if (editingItem) {
      onUpdate(editingItem.id, data);
      setEditingItem(null);
    }
  };

  const handleCreate = (data: CreateAuctionItem) => {
    onCreate(data);
    setIsCreating(false);
  };

  return (
    <div className="space-y-4">
      {/* ヘッダーアクション */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} 件の商品
        </p>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          商品を追加
        </Button>
      </div>

      {/* テーブル */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10 text-center">E</TableHead>
              <TableHead className="min-w-[180px]">商品URL (A)</TableHead>
              <TableHead className="w-28">入札対象 (F)</TableHead>
              <TableHead className="w-28 text-right">相場価格 (H)</TableHead>
              <TableHead className="min-w-[140px]">参考URL1 (M)</TableHead>
              <TableHead className="min-w-[140px]">参考URL2 (N)</TableHead>
              <TableHead className="min-w-[160px]">補足メモ (O)</TableHead>
              <TableHead className="w-10 text-center">P</TableHead>
              <TableHead className="w-24">成否 (Q)</TableHead>
              <TableHead className="min-w-[160px]">フィードバック (R)</TableHead>
              <TableHead className="w-20 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center text-muted-foreground py-12"
                >
                  商品が登録されていません
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  {/* check */}
                  <TableCell className="text-center">
                    <Checkbox
                      checked={item.check}
                      onCheckedChange={(v) =>
                        onUpdate(item.id, { check: !!v })
                      }
                    />
                  </TableCell>

                  {/* 商品URL */}
                  <TableCell>
                    {item.productUrl ? (
                      <a
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <span className="truncate max-w-[160px]">
                          {truncateUrl(item.productUrl)}
                        </span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* 入札対象 */}
                  <TableCell>
                    <BidTargetBadge value={item.bidTarget} />
                  </TableCell>

                  {/* 相場価格 */}
                  <TableCell className="text-right font-mono text-sm">
                    {item.marketPrice != null
                      ? `¥${item.marketPrice.toLocaleString()}`
                      : "—"}
                  </TableCell>

                  {/* 参考URL1 */}
                  <TableCell>
                    {item.referenceUrl1 ? (
                      <a
                        href={item.referenceUrl1}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <span className="truncate max-w-[120px]">
                          {truncateUrl(item.referenceUrl1, 30)}
                        </span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* 参考URL2 */}
                  <TableCell>
                    {item.referenceUrl2 ? (
                      <a
                        href={item.referenceUrl2}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <span className="truncate max-w-[120px]">
                          {truncateUrl(item.referenceUrl2, 30)}
                        </span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* 参考URL③ */}
                  <TableCell className="text-sm text-muted-foreground max-w-[160px]">
                    <span className="truncate block">
                      {item.referenceUrl3 || "—"}
                    </span>
                  </TableCell>

                  {/* 代表チェック */}
                  <TableCell className="text-center">
                    <Checkbox
                      checked={item.representativeCheck}
                      onCheckedChange={(v) =>
                        onUpdate(item.id, { representativeCheck: !!v })
                      }
                    />
                  </TableCell>

                  {/* 成否判断 */}
                  <TableCell>
                    <JudgmentBadge value={item.judgmentResult} judged={item.representativeCheck} />
                  </TableCell>

                  {/* フィードバック */}
                  <TableCell className="text-sm text-muted-foreground max-w-[160px]">
                    <span className="truncate block" title={item.feedback}>
                      {item.feedback || "—"}
                    </span>
                  </TableCell>

                  {/* 操作 */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingItem(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 編集シート */}
      <Sheet open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>商品を編集</SheetTitle>
            <SheetDescription>
              商品情報を更新してください
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {editingItem && (
              <ItemForm
                item={editingItem}
                onSubmit={handleUpdate}
                onCancel={() => setEditingItem(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 新規登録シート */}
      <Sheet open={isCreating} onOpenChange={setIsCreating}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>商品を追加</SheetTitle>
            <SheetDescription>
              新しい入札候補商品を登録します
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ItemForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreating(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
