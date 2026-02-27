// スプレッドシートの列構造に対応したデータモデル
export const ASSIGNEES = ["吉川さん", "伊藤さん", "望月さん", "折出さん"] as const;
export type Assignee = (typeof ASSIGNEES)[number] | "";

export interface AuctionItem {
  id: string;
  productUrl: string;           // A列: 商品URL
  brandName: string;            // D列: ブランド名
  check: boolean;               // E列: check
  bidTarget: boolean;           // F列: 入札対象（チェックボックス）
  assignee: Assignee;           // G列: 担当者
  marketPrice: number | null;   // H列: 相場価格
  bidPrice: number | null;      // K列: 入札価格
  wholesalePrice: number | null;// L列: 卸価格
  referenceUrl1: string;        // M列: 参考URL①
  referenceUrl2: string;        // N列: 参考URL②
  referenceUrl3: string;        // O列: 参考URL③
  referenceUrl4: string;        // P列: 参考URL④
  referenceUrl5: string;        // Q列: 参考URL⑤
  notes: string;                // R列: 補足メモ
  representativeCheck: boolean; // S列: 代表チェック
  judgmentResult: boolean;      // T列: 成否判断（チェックボックス）
  feedback: string;             // U列: フィードバック
  feedbackConfirmed: boolean;   // V列: フィードバック確認完了
  createdAt: string;
  updatedAt: string;
}

export type CreateAuctionItem = Omit<AuctionItem, "id" | "createdAt" | "updatedAt">;
