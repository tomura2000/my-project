"use client";

import { Assignee, ASSIGNEES } from "@/lib/types";
import { Package } from "lucide-react";

const ASSIGNEE_COLORS: Record<string, string> = {
  吉川さん: "bg-blue-500",
  伊藤さん: "bg-violet-500",
  望月さん: "bg-rose-500",
  折出さん: "bg-amber-500",
};

interface AssigneeSelectProps {
  onSelect: (name: Assignee) => void;
}

export function AssigneeSelect({ onSelect }: AssigneeSelectProps) {
  return (
    <div className="max-w-md mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex rounded-full bg-primary/10 p-4 mb-2">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">担当者を選択してください</h2>
        <p className="text-muted-foreground text-sm">
          選んだ名前が G列（担当者）への書き込みとフィードバック確認に使われます
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ASSIGNEES.map((name) => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-white p-5
                       text-center hover:border-primary hover:bg-primary/5 hover:shadow-md
                       transition-all active:scale-95"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full
                          text-white text-lg font-bold ${ASSIGNEE_COLORS[name]}`}
            >
              {name[0]}
            </div>
            <span className="font-semibold text-base">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { ASSIGNEE_COLORS };
