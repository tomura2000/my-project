"use client";

import { BRANDS, BrandKey } from "@/lib/brands";

interface BrandFilterButtonsProps {
  selected: BrandKey;
  onChange: (key: BrandKey) => void;
  /** 各ブランドの件数（省略可） */
  counts?: Partial<Record<BrandKey, number>>;
}

export function BrandFilterButtons({
  selected,
  onChange,
  counts,
}: BrandFilterButtonsProps) {
  const allKeys: BrandKey[] = ["ALL", ...BRANDS.map((b) => b.key)];

  const label = (key: BrandKey) => (key === "ALL" ? "すべて表示" : key);

  return (
    <div className="flex flex-wrap gap-2">
      {allKeys.map((key) => {
        const isActive = selected === key;
        const count = counts?.[key];

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`
              inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5
              text-sm font-medium transition-all
              ${isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"
              }
            `}
          >
            {label(key)}
            {count !== undefined && (
              <span
                className={`
                  rounded-full px-1.5 py-0.5 text-xs leading-none font-semibold
                  ${isActive
                    ? "bg-white/25 text-white"
                    : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
