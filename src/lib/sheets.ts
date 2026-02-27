/**
 * Google スプレッドシート連携モジュール
 *
 * 列マッピング（スプレッドシートの列インデックス、0始まり）:
 *   A(0)  : 商品URL
 *   D(3)  : ブランド名
 *   E(4)  : check
 *   F(5)  : 入札対象（チェックボックス）
 *   G(6)  : 担当者
 *   H(7)  : 相場価格
 *   K(10) : 入札価格
 *   L(11) : 卸価格
 *   M(12) : 参考URL①
 *   N(13) : 参考URL②
 *   O(14) : 参考URL③
 *   P(15) : 参考URL④
 *   Q(16) : 参考URL⑤
 *   R(17) : 補足メモ
 *   S(18) : 代表チェック
 *   T(19) : 成否判断（チェックボックス）
 *   U(20) : フィードバック
 *   V(21) : フィードバック確認完了
 */

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import type { AuctionItem, Assignee } from "./types";

// ── 列インデックス定義 ──────────────────────────────────────
const COL = {
  productUrl: 0,          // A
  brandName: 3,           // D
  check: 4,               // E
  bidTarget: 5,           // F
  assignee: 6,            // G
  marketPrice: 7,         // H
  bidPrice: 10,           // K
  wholesalePrice: 11,     // L
  referenceUrl1: 12,      // M
  referenceUrl2: 13,      // N
  referenceUrl3: 14,      // O
  referenceUrl4: 15,      // P
  referenceUrl5: 16,      // Q
  notes: 17,              // R
  representativeCheck: 18,// S
  judgmentResult: 19,     // T
  feedback: 20,           // U
  feedbackConfirmed: 21,  // V
} as const;

const MAX_COL_INDEX = 21; // V 列

// ── クライアント初期化 ──────────────────────────────────────

/**
 * 環境変数が設定済みかチェック
 * - 秘密情報（EMAIL / PRIVATE_KEY）はサーバー専用変数（NEXT_PUBLIC_ なし）
 * - スプレッドシート ID / シートインデックスは NEXT_PUBLIC_ 付き
 */
export function isSheetsConfigured(): boolean {
  const spreadsheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID;
  const email         = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey    = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  // デバッグログ（値は出力せず存在確認のみ）
  console.log("[Sheets] 環境変数チェック:", {
    NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID:    !!spreadsheetId,
    GOOGLE_SERVICE_ACCOUNT_EMAIL:    !!email,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: !!privateKey,
  });

  return !!(spreadsheetId && email && privateKey);
}

/** Google Sheets ドキュメントクライアントを取得 */
async function getDoc(): Promise<GoogleSpreadsheet> {
  const email         = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey        = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!email || !rawKey || !spreadsheetId) {
    // どの変数が欠けているかをログに出力（値は非表示）
    console.error("[Sheets] 環境変数が不足しています:", {
      NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID:    !!spreadsheetId,
      GOOGLE_SERVICE_ACCOUNT_EMAIL:    !!email,
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: !!rawKey,
    });
    throw new Error(
      "環境変数が不足しています。.env.local / Vercel の Environment Variables に " +
      "NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID / " +
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / " +
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY を設定してください。"
    );
  }

  // \n リテラルを実際の改行に変換（.env.local・Vercel 両対応）
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const auth = new JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  return doc;
}

/** 設定されたシートを取得 */
function getSheet(doc: GoogleSpreadsheet): GoogleSpreadsheetWorksheet {
  const index = parseInt(process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SHEET_INDEX ?? "0", 10);
  const sheet = doc.sheetsByIndex[index];
  if (!sheet) throw new Error(`シートインデックス ${index} が見つかりません。`);
  return sheet;
}

// ── 型変換ユーティリティ ────────────────────────────────────

function toStr(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    // チェックボックス標準値 + 旧文字列（「対象」「成功」）も true として扱う
    return ["true", "TRUE", "1", "✓", "yes", "YES", "対象", "成功"].includes(value.trim());
  }
  return false;
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  if (typeof value === "string") {
    // カンマ・円記号・スペースを除去してパース（例: "10,000" → 10000, "¥85,000" → 85000）
    const cleaned = value.replace(/[,¥\s]/g, "");
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return isNaN(n) ? null : n;
  }
  const n = Number(value);
  return isNaN(n) ? null : n;
}

/**
 * 数式セルを安全に数値へ変換する。
 * google-spreadsheet ライブラリは数式セルの計算結果を cell.value に入れるが、
 * 未計算・エラーの場合は 0 や null になることがある。
 * そのため formattedValue（Google Sheets が画面に表示する文字列）を優先的に使う。
 *
 * @param cell  sheet.getCell() の戻り値
 * @param label デバッグログ用ラベル（例: "K列(入札価格)"）
 */
function readPriceCell(
  cell: { value: unknown; formattedValue?: string | null },
  label: string
): number | null {
  // ── デバッグログ（原因切り分け用。本番環境でも意図的に出力する） ──
  console.log(`[Sheets debug] ${label}:`, {
    value: cell.value,
    formattedValue: cell.formattedValue ?? "(undefined)",
  });

  // formattedValue = Google Sheets が実際に表示している文字列（数式の計算後の値）
  // これが取れる場合は最優先で使う
  if (cell.formattedValue != null && cell.formattedValue !== "") {
    const parsed = toNum(cell.formattedValue);
    if (parsed !== null) return parsed;
  }

  // フォールバック: cell.value（数式セルでは computed value が入る想定）
  return toNum(cell.value);
}

// ── スプレッドシート行 → AuctionItem 変換 ──────────────────

function rowToItem(
  sheet: GoogleSpreadsheetWorksheet,
  rowIndex: number // loadCells の 0始まり行インデックス
): AuctionItem | null {
  const productUrl = toStr(sheet.getCell(rowIndex, COL.productUrl).value);
  if (!productUrl) return null; // 空行はスキップ

  // スプレッドシート上の実際の行番号（1始まり）を ID として使う
  const spreadsheetRowNumber = rowIndex + 1; // rowIndex=0 → 行1（ヘッダー）なので、data は rowIndex>=1

  return {
    id: String(spreadsheetRowNumber),
    productUrl,
    brandName: toStr(sheet.getCell(rowIndex, COL.brandName).value),
    check: toBool(sheet.getCell(rowIndex, COL.check).value),
    bidTarget: toBool(sheet.getCell(rowIndex, COL.bidTarget).value),
    assignee: toStr(sheet.getCell(rowIndex, COL.assignee).value) as Assignee,
    marketPrice: toNum(sheet.getCell(rowIndex, COL.marketPrice).value),
    bidPrice: readPriceCell(sheet.getCell(rowIndex, COL.bidPrice), `行${rowIndex + 1} K列(入札価格)`),
    wholesalePrice: readPriceCell(sheet.getCell(rowIndex, COL.wholesalePrice), `行${rowIndex + 1} L列(卸価格)`),
    referenceUrl1: toStr(sheet.getCell(rowIndex, COL.referenceUrl1).value),
    referenceUrl2: toStr(sheet.getCell(rowIndex, COL.referenceUrl2).value),
    referenceUrl3: toStr(sheet.getCell(rowIndex, COL.referenceUrl3).value),
    referenceUrl4: toStr(sheet.getCell(rowIndex, COL.referenceUrl4).value),
    referenceUrl5: toStr(sheet.getCell(rowIndex, COL.referenceUrl5).value),
    notes: toStr(sheet.getCell(rowIndex, COL.notes).value),
    representativeCheck: toBool(sheet.getCell(rowIndex, COL.representativeCheck).value),
    judgmentResult: toBool(sheet.getCell(rowIndex, COL.judgmentResult).value),
    feedback: toStr(sheet.getCell(rowIndex, COL.feedback).value),
    feedbackConfirmed: toBool(sheet.getCell(rowIndex, COL.feedbackConfirmed).value),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── 公開 API ────────────────────────────────────────────────

/** 全商品データをスプレッドシートから取得する */
export async function fetchAllItems(): Promise<AuctionItem[]> {
  const doc = await getDoc();
  const sheet = getSheet(doc);

  // プロトタイプとして最大1001行（ヘッダー含む）を読み込む
  const maxRows = Math.min(sheet.rowCount, 1001);

  await sheet.loadCells({
    startRowIndex: 0,
    endRowIndex: maxRows,
    startColumnIndex: 0,
    endColumnIndex: MAX_COL_INDEX + 1,
  });

  const items: AuctionItem[] = [];

  // row=0 はヘッダー行のためスキップ
  for (let row = 1; row < maxRows; row++) {
    const item = rowToItem(sheet, row);
    if (item) items.push(item);
  }

  return items;
}

/** 更新対象のフィールド型 */
export type UpdatePayload = Partial<{
  check: boolean;
  bidTarget: boolean;
  assignee: string;
  marketPrice: number | null;
  referenceUrl1: string;
  referenceUrl2: string;
  referenceUrl3: string;
  referenceUrl4: string;
  referenceUrl5: string;
  notes: string;
  representativeCheck: boolean;
  judgmentResult: boolean;
  feedback: string;
  feedbackConfirmed: boolean;
}>;

/**
 * 既存行を更新する
 * @param rowNumber スプレッドシートの実際の行番号（1始まり）
 */
export async function updateItem(rowNumber: number, payload: UpdatePayload): Promise<void> {
  const doc = await getDoc();
  const sheet = getSheet(doc);

  // loadCells は 0始まりなので rowNumber - 1
  const rowIndex = rowNumber - 1;

  await sheet.loadCells({
    startRowIndex: rowIndex,
    endRowIndex: rowIndex + 1,
    startColumnIndex: 0,
    endColumnIndex: MAX_COL_INDEX + 1,
  });

  const set = (col: number, value: string | number | boolean | null) => {
    sheet.getCell(rowIndex, col).value = value ?? "";
  };

  if (payload.check !== undefined)               set(COL.check, payload.check);
  if (payload.bidTarget !== undefined)            set(COL.bidTarget, payload.bidTarget);
  if (payload.assignee !== undefined)             set(COL.assignee, payload.assignee);
  if (payload.marketPrice !== undefined)          set(COL.marketPrice, payload.marketPrice);
  if (payload.referenceUrl1 !== undefined)        set(COL.referenceUrl1, payload.referenceUrl1);
  if (payload.referenceUrl2 !== undefined)        set(COL.referenceUrl2, payload.referenceUrl2);
  if (payload.referenceUrl3 !== undefined)        set(COL.referenceUrl3, payload.referenceUrl3);
  if (payload.referenceUrl4 !== undefined)        set(COL.referenceUrl4, payload.referenceUrl4);
  if (payload.referenceUrl5 !== undefined)        set(COL.referenceUrl5, payload.referenceUrl5);
  if (payload.notes !== undefined)                set(COL.notes, payload.notes);
  if (payload.representativeCheck !== undefined)  set(COL.representativeCheck, payload.representativeCheck);
  if (payload.judgmentResult !== undefined)       set(COL.judgmentResult, payload.judgmentResult);
  if (payload.feedback !== undefined)             set(COL.feedback, payload.feedback);
  if (payload.feedbackConfirmed !== undefined)    set(COL.feedbackConfirmed, payload.feedbackConfirmed);

  await sheet.saveUpdatedCells();
}

/** 新規行をスプレッドシートに追記する */
export async function appendItem(
  data: Omit<AuctionItem, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const doc = await getDoc();
  const sheet = getSheet(doc);

  // A〜V（22列）の配列を用意し、対応するインデックスに値を入れる
  const row = new Array(MAX_COL_INDEX + 1).fill("");
  row[COL.productUrl]          = data.productUrl;
  row[COL.brandName]           = data.brandName;
  row[COL.check]               = data.check;
  row[COL.bidTarget]           = data.bidTarget;
  row[COL.assignee]            = data.assignee;
  row[COL.marketPrice]         = data.marketPrice ?? "";
  row[COL.bidPrice]            = data.bidPrice ?? "";
  row[COL.wholesalePrice]      = data.wholesalePrice ?? "";
  row[COL.referenceUrl1]       = data.referenceUrl1;
  row[COL.referenceUrl2]       = data.referenceUrl2;
  row[COL.referenceUrl3]       = data.referenceUrl3;
  row[COL.referenceUrl4]       = data.referenceUrl4;
  row[COL.referenceUrl5]       = data.referenceUrl5;
  row[COL.notes]               = data.notes;
  row[COL.representativeCheck] = data.representativeCheck;
  row[COL.judgmentResult]      = data.judgmentResult;
  row[COL.feedback]            = data.feedback;
  row[COL.feedbackConfirmed]   = data.feedbackConfirmed;

  await sheet.addRow(row);
}
