"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

export interface FilterState {
  search: string;
  bidTarget: "ALL" | "true" | "false";
  judgmentResult: "ALL" | "true" | "false" | "NONE";
  checkedOnly: boolean;
}

interface FilterBarProps {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
}

export function FilterBar({ filter, onChange }: FilterBarProps) {
  const hasActiveFilter =
    filter.search ||
    filter.bidTarget !== "ALL" ||
    filter.judgmentResult !== "ALL" ||
    filter.checkedOnly;

  const reset = () =>
    onChange({
      search: "",
      bidTarget: "ALL",
      judgmentResult: "ALL",
      checkedOnly: false,
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 検索 */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="URL・メモで検索..."
          className="pl-8"
          value={filter.search}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
        />
      </div>

      {/* 入札対象フィルタ */}
      <Select
        value={filter.bidTarget}
        onValueChange={(v) =>
          onChange({ ...filter, bidTarget: v as FilterState["bidTarget"] })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="入札対象" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">すべて</SelectItem>
          <SelectItem value="true">対象</SelectItem>
          <SelectItem value="false">対象外</SelectItem>
        </SelectContent>
      </Select>

      {/* 成否判断フィルタ */}
      <Select
        value={filter.judgmentResult}
        onValueChange={(v) =>
          onChange({ ...filter, judgmentResult: v as FilterState["judgmentResult"] })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="成否判断" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">すべて</SelectItem>
          <SelectItem value="true">合格</SelectItem>
          <SelectItem value="false">不合格</SelectItem>
          <SelectItem value="NONE">未判定</SelectItem>
        </SelectContent>
      </Select>

      {/* リセット */}
      {hasActiveFilter && (
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
          <X className="h-3.5 w-3.5" />
          クリア
        </Button>
      )}
    </div>
  );
}
