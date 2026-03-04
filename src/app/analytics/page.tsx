"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnalyticsResponse, AssigneeAnalytics } from "@/lib/types";
import { ASSIGNEE_COLORS } from "@/components/AssigneeSelect";
import {
  BarChart2,
  ArrowLeft,
  ShoppingBag,
  Trophy,
  Target,
  TrendingUp,
  WifiOff,
  AlertCircle,
} from "lucide-react";

// ── Skeleton ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-white p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="h-5 w-24 rounded bg-gray-200" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-7 w-12 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonView() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* period bar skeleton */}
        <div className="h-10 w-72 rounded-lg bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </main>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="bg-white border-b sticky top-0 z-20">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm hidden sm:inline">戻る</span>
        </Link>

        <div className="flex items-center gap-2 mx-auto">
          <div className="bg-primary rounded-md p-1.5">
            <BarChart2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">担当者別パフォーマンス分析</span>
        </div>

        {/* spacer to balance the back button */}
        <div className="w-16 shrink-0 hidden sm:block" />
      </div>
    </header>
  );
}

// ── Stat item inside a card ───────────────────────────────────────────────

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

function StatItem({ icon: Icon, label, value, sub, highlight }: StatItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Assignee card ─────────────────────────────────────────────────────────

function AssigneeCard({ stat, rank }: { stat: AssigneeAnalytics; rank: number }) {
  const color = ASSIGNEE_COLORS[stat.assignee] ?? "bg-gray-400";
  const accuracy = stat.marketAccuracy !== null ? `${stat.marketAccuracy.toFixed(1)}%` : "—";
  const accuracyColor =
    stat.marketAccuracy === null
      ? ""
      : stat.marketAccuracy >= 70
      ? "text-green-600"
      : stat.marketAccuracy >= 50
      ? "text-amber-600"
      : "text-red-500";

  return (
    <div className="rounded-xl border bg-white p-5 space-y-4 hover:shadow-md transition-shadow">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0 ${color}`}>
          {stat.assignee[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{stat.assignee}</p>
          {rank <= 3 && (
            <p className="text-xs text-muted-foreground">
              {rank === 1 ? "🥇 1位" : rank === 2 ? "🥈 2位" : "🥉 3位"}
            </p>
          )}
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-3 pt-1 border-t">
        <StatItem
          icon={ShoppingBag}
          label="入札数"
          value={String(stat.bidCount)}
          sub="件"
        />
        <StatItem
          icon={Trophy}
          label="落札成功"
          value={String(stat.winCount)}
          sub={`/ ${stat.bidCount}件`}
          highlight={stat.winCount > 0}
        />
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Target className="h-3 w-3" />
            <span>相場正答率</span>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${accuracyColor}`}>
            {accuracy}
          </p>
          <p className="text-xs text-muted-foreground">
            {stat.bidCount > 0 ? `${stat.correctCount}/${stat.bidCount}件正解` : "データなし"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Summary table ─────────────────────────────────────────────────────────

function SummaryTable({ stats }: { stats: AssigneeAnalytics[] }) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30">
        <h2 className="font-semibold text-sm flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" />
          一覧比較
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/10">
              <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">担当者</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">入札数</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">落札成功</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">相場正解</th>
              <th className="text-right px-5 py-2.5 font-medium text-muted-foreground">相場正答率</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const color = ASSIGNEE_COLORS[s.assignee] ?? "bg-gray-400";
              const accuracy = s.marketAccuracy !== null ? `${s.marketAccuracy.toFixed(1)}%` : "—";
              const accuracyColor =
                s.marketAccuracy === null
                  ? "text-muted-foreground"
                  : s.marketAccuracy >= 70
                  ? "text-green-600 font-semibold"
                  : s.marketAccuracy >= 50
                  ? "text-amber-600 font-semibold"
                  : "text-red-500 font-semibold";
              return (
                <tr key={s.assignee} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
                        {s.assignee[0]}
                      </div>
                      <span className="font-medium">{s.assignee}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.bidCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={s.winCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"}>
                      {s.winCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.correctCount}</td>
                  <td className={`px-5 py-3 text-right tabular-nums ${accuracyColor}`}>{accuracy}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<AnalyticsResponse>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "不明なエラー");
        setLoading(false);
      });
  }, []);

  if (loading) return <SkeletonView />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* サンプルバナー */}
        {data?.isSample && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>サンプルデータを表示中。</strong>
              {" "}接続するには <code className="bg-amber-100 px-1 rounded">.env.local</code> を設定して再起動してください。
            </span>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>データ取得に失敗しました: {error}</span>
          </div>
        )}

        {/* 期間表示 */}
        {data && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-medium">
              <BarChart2 className="h-3.5 w-3.5" />
              直近1ヶ月（開催日: {data.period.from} 〜 {data.period.to}）のデータ
            </span>
          </div>
        )}

        {/* カードグリッド */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.stats.map((stat, i) => (
              <AssigneeCard key={stat.assignee} stat={stat} rank={i + 1} />
            ))}
          </div>
        )}

        {/* 一覧テーブル */}
        {data && data.stats.length > 0 && <SummaryTable stats={data.stats} />}

        {/* データなし */}
        {data && data.stats.every((s) => s.bidCount === 0) && (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <BarChart2 className="h-10 w-10 mx-auto opacity-30" />
            <p className="text-sm">該当期間内に入札データがありません。</p>
            <p className="text-xs">
              Y列（開催日）が {data.period.from} 〜 {data.period.to} の範囲内に設定されているか確認してください。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
