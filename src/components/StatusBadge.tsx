"use client";

import { Badge } from "@/components/ui/badge";

interface BidTargetBadgeProps {
  value: boolean;
}

export function BidTargetBadge({ value }: BidTargetBadgeProps) {
  return (
    <Badge variant={value ? "default" : "outline"}>
      {value ? "対象" : "対象外"}
    </Badge>
  );
}

interface JudgmentBadgeProps {
  value: boolean;
  judged?: boolean;
}

export function JudgmentBadge({ value, judged = true }: JudgmentBadgeProps) {
  if (!judged) {
    return (
      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500 border-gray-200">
        未判定
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        value
          ? "bg-green-100 text-green-800 border-green-200"
          : "bg-red-100 text-red-800 border-red-200"
      }`}
    >
      {value ? "合格" : "不合格"}
    </span>
  );
}
