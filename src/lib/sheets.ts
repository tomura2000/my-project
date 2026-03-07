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
 *   T(19) : 相場正誤チェック（チェックボックス）
 *   U(20) : フィードバック
 *   V(21) : フィードバック確認完了
 *   X(23) : 落札成功（読み取り専用）
 *   Y(24) : 開催日
 *
 * すべての商材シートで同じ列定義を使用します。
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
  winningSuccess: 23,     // X（読み取り専用）
  auctionDate: 24,        // Y
} as const;

const MAX_COL_INDEX = 24; // Y 列

// ── クライアント初期化 ──────────────────────────────────────

/**
 * 環境変数が設定済みかチェック
 * シートはタブ名で指定するため SHEET_INDEX は不要です。
 */
export function isSheetsConfigured(): boolean {
  const spreadsheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID;
  const email         = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey    = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  console.log("[Sheets] 環境変数チェック:", {
    NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID: !!spreadsheetId,
    GOOGLE_SERVICE_ACCOUNT_EMAIL:             !!email,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:       !!privateKey,
  });

  return !!(spreadsheetId && email && privateKey);
}

/** Google Sheets ドキュメントクライアントを取得（認証＋メタデータ読み込み） */
async function getDoc(): Promise<GoogleSpreadsheet> {
  const email         = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey        = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!email || !rawKey || !spreadsheetId) {
    console.error("[Sheets] 環境変数が不足しています:", {
      NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID: !!spreadsheetId,
      GOOGLE_SERVICE_ACCOUNT_EMAIL:             !!email,
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:       !!rawKey,
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
  await doc.loadInfo(); // シート一覧をロード（sheetsByTitle が使えるようになる）
  return doc;
}

/** タブ名でシートを取得 */
function getSheetByName(
  doc: GoogleSpreadsheet,
  sheetName: string
): GoogleSpreadsheetWorksheet {
  const sheet = doc.sheetsByTitle[sheetName];
  if (!sheet) {
    throw new Error(
      `シート「${sheetName}」が見つかりません。` +
      `利用可能なシート: ${Object.keys(doc.sheetsByTitle).join(", ")}`
    );
  }
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
    return ["true", "TRUE", "1", "✓", "yes", "YES", "対象", "成功"].includes(value.trim());
  }
  return false;
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[,¥\s]/g, "");
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return isNaN(n) ? null : n;
  }
  const n = Number(value);
  return isNaN(n) ? null : n;
}

/**
 * 日付セルを "YYYY-MM-DD" 形式の文字列へ変換する。
 * Google Sheets の日付セルは formattedValue（表示文字列）または
 * シリアル値（1899-12-30 起算の日数）で返る。
 */
function readDateCell(
  cell: { value: unknown; formattedValue?: string | null }
): string {
  if (cell.formattedValue != null && cell.formattedValue !== "") {
    return cell.formattedValue;
  }
  if (typeof cell.value === "number") {
    const msPerDay = 86400000;
    const base = Date.UTC(1899, 11, 30);
    const d = new Date(base + cell.value * msPerDay);
    return d.toISOString().split("T")[0];
  }
  return toStr(cell.value);
}

/**
 * 数式セルを安全に数値へ変換する。
 * formattedValue（Google Sheets が画面表示する文字列）を優先する。
 */
function readPriceCell(
  cell: { value: unknown; formattedValue?: string | null },
  label: string
): number | null {
  console.log(`[Sheets debug] ${label}:`, {
    value: cell.value,
    formattedValue: cell.formattedValue ?? "(undefined)",
  });

  if (cell.formattedValue != null && cell.formattedValue !== "") {
    const parsed = toNum(cell.formattedValue);
    if (parsed !== null) return parsed;
  }
  return toNum(cell.value);
}

// ── スプレッドシート行 → AuctionItem 変換 ──────────────────

function rowToItem(
  sheet: GoogleSpreadsheetWorksheet,
  rowIndex: number
): AuctionItem | null {
  const productUrl = toStr(sheet.getCell(rowIndex, COL.productUrl).value);
  if (!productUrl) return null;

  const spreadsheetRowNumber = rowIndex + 1;

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
    winningSuccess: toBool(sheet.getCell(rowIndex, COL.winningSuccess).value),
    auctionDate: readDateCell(sheet.getCell(rowIndex, COL.auctionDate)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── 内部ヘルパー: シートオブジェクトからアイテム一覧を取得 ──

async function fetchItemsFromSheet(
  sheet: GoogleSpreadsheetWorksheet
): Promise<AuctionItem[]> {
  const totalRows = sheet.rowCount;

  await sheet.loadCells({
    startRowIndex: 0,
    endRowIndex: totalRows,
    startColumnIndex: 0,
    endColumnIndex: MAX_COL_INDEX + 1,
  });

  const items: AuctionItem[] = [];
  for (let row = 1; row < totalRows; row++) {
    const item = rowToItem(sheet, row);
    if (item) items.push(item);
  }
  return items;
}

// ── 公開 API ────────────────────────────────────────────────

/**
 * 指定シートから全商品データを取得する
 * @param sheetName スプレッドシートのタブ名
 */
export async function fetchAllItems(sheetName: string): Promise<AuctionItem[]> {
  const doc = await getDoc();
  const sheet = getSheetByName(doc, sheetName);
  return fetchItemsFromSheet(sheet);
}

/**
 * 複数シートから並列でデータを取得する（Doc 接続は1回のみ）
 * 分析ページでの全カテゴリー取得に使用する。
 * @param sheetNames タブ名の配列
 * @returns 各シートのアイテム配列（入力順と同じ順序）
 */
export async function fetchAllItemsMultiple(
  sheetNames: string[]
): Promise<AuctionItem[][]> {
  const doc = await getDoc();
  return Promise.all(
    sheetNames.map((name) => {
      const sheet = getSheetByName(doc, name);
      return fetchItemsFromSheet(sheet);
    })
  );
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
 * @param sheetName スプレッドシートのタブ名
 * @param rowNumber スプレッドシートの実際の行番号（1始まり）
 */
export async function updateItem(
  sheetName: string,
  rowNumber: number,
  payload: UpdatePayload
): Promise<void> {
  const doc = await getDoc();
  const sheet = getSheetByName(doc, sheetName);

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

/**
 * 新規行をスプレッドシートに追記する
 * @param sheetName スプレッドシートのタブ名
 */
export async function appendItem(
  sheetName: string,
  data: Omit<AuctionItem, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const doc = await getDoc();
  const sheet = getSheetByName(doc, sheetName);

  // A〜Y（25列）の配列を用意し、対応するインデックスに値を入れる（X・Y は読み取り専用のため空のまま）
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
