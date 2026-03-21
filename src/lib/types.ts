// スプレッドシートの列構造に対応したデータモデル
export const ASSIGNEES = ["吉川さん", "伊藤さん", "望月さん", "折出さん", "小澤さん"] as const;
export type Assignee = (typeof ASSIGNEES)[number] | "";

export interface AuctionItem {
  id: string;
  productUrl: string;              // A列(0): 商品URL
  brandName: string;               // E列(4): ブランド名
  check: boolean;                  // F列(5): check
  bidTarget: boolean;              // G列(6): 入札対象（チェックボックス）
  assignee: Assignee;              // H列(7): 担当者
  revisedMarketPrice: number | null; // I列(8): 修正相場（代表が入力）
  marketPrice: number | null;      // J列(9): 相場価格
  bidPrice: number | null;         // M列(12): 入札価格
  wholesalePrice: number | null;   // N列(13): 卸価格
  referenceUrl1: string;           // O列(14): 参考URL①
  referenceUrl2: string;           // P列(15): 参考URL②
  referenceUrl3: string;           // Q列(16): 参考URL③
  referenceUrl4: string;           // R列(17): 参考URL④
  referenceUrl5: string;           // S列(18): 参考URL⑤
  notes: string;                   // T列(19): 補足メモ
  representativeCheck: boolean;    // U列(20): 代表チェック
  judgmentResult: boolean;         // V列(21): 相場正誤チェック（チェックボックス）
  feedback: string;                // W列(22): フィードバック
  feedbackConfirmed: boolean;      // X列(23): フィードバック確認完了
  winningSuccess: boolean;         // Z列(25): 落札成功（読み取り専用）
  auctionDate: string;             // AA列(26): 開催日
  createdAt: string;
  updatedAt: string;
}

// ── 分析用型定義 ────────────────────────────────────────────

export interface AssigneeAnalytics {
  assignee: string;
  bidCount: number;           // 入札数（J列に数値がある行数）
  winCount: number;           // 落札成功数（Z列がTRUE）
  correctCount: number;       // 相場正解数（J列に数値 かつ V列がTRUE）
  marketAccuracy: number | null; // 相場正答率 [%]（null = 入札数0で算出不可）
}

export interface AnalyticsResponse {
  period: { from: string; to: string };
  stats: AssigneeAnalytics[];
  isSample: boolean;
}

export type CreateAuctionItem = Omit<AuctionItem, "id" | "createdAt" | "updatedAt">;
