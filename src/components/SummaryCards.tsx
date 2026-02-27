"use client";

import { AuctionItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Package } from "lucide-react";

interface SummaryCardsProps {
  items: AuctionItem[];
}

export function SummaryCards({ items }: SummaryCardsProps) {
  const total = items.length;
  const targets = items.filter((i) => i.bidTarget).length;
  const successes = items.filter((i) => i.representativeCheck && i.judgmentResult).length;
  const pending = items.filter((i) => !i.representativeCheck).length;

  const cards = [
    {
      title: "総商品数",
      value: total,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "入札対象",
      value: targets,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "成功",
      value: successes,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "未判定/保留",
      value: pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`rounded-md p-1.5 ${card.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
