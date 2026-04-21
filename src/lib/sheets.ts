/**
 * Google スプレッドシート連携モジュール
 *
 * 列マッピング（スプレッドシートの列インデックス、0始まり）:
 *   A(0)  : 商品URL
 *   C(2)  : 管理番号（読み取りのみ）
 *   E(4)  : ブランド名
 *   F(5)  : check
 *   G(6)  : 入札対象（チェックボックス）
 *   H(7)  : 担当者
 *   I(8)  : 修正相場（代表が入力）
 *   J(9)  : 相場価格
 *   M(12) : 入札価格
 *   N(13) : 卸価格
 *   O(14) : 参考URL①
 *   P(15) : 参考URL②
 *   Q(16) : 参考URL③
 *   R(17) : 参考URL④
 *   S(18) : 参考URL⑤
 *   T(19) : 補足メモ
 *   U(20) : 代表チェック
 *   V(21) : 相場正誤チェック（チェックボックス）
 *   W(22) : フィードバック
 *   X(23) : フィードバック確認完了
 *   Z(25) : 落札成功（読み取り専用）
 *   AA(26): 開催日
 *
 * すべての商材シートで同じ列定義を使用します。
 */

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import type { AuctionItem, Assignee } from "./types";

// ── 列インデックス定義 ──────────────────────────────────────
const COL = {
  productUrl: 0,              // A
  managementNumber: 2,        // C（読み取りのみ）
  brandName: 4,               // E（旧D）
  check: 5,                   // F（旧E）
  bidTarget: 6,               // G（旧F）
  assignee: 7,                // H（旧G）
  revisedMarketPrice: 8,      // I（新規）
  marketPrice: 9,             // J（旧H）
  bidPrice: 12,               // M（旧K）
  wholesalePrice: 13,         // N（旧L）
  referenceUrl1: 14,          // O（旧M）
  referenceUrl2: 15,          // P（旧N）
  referenceUrl3: 16,          // Q（旧O）
  referenceUrl4: 17,          // R（旧P）
  referenceUrl5: 18,          // S（旧Q）
  notes: 19,                  // T（旧R）
  representativeCheck: 20,    // U（旧S）
  judgmentResult: 21,         // V（旧T）
  feedback: 22,               // W（旧U）
  feedbackConfirmed: 23,      // X（旧V）
  winningSuccess: 25,         // Z（旧X、読み取り専用）
  auctionDate: 26,            // AA（旧Y）
} as const;

const MAX_COL_INDEX = 26; // AA 列

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
    revisedMarketPrice: toNum(sheet.getCell(rowIndex, COL.revisedMarketPrice).value),
    marketPrice: toNum(sheet.getCell(rowIndex, COL.marketPrice).value),
    bidPrice: readPriceCell(sheet.getCell(rowIndex, COL.bidPrice), `行${rowIndex + 1} M列(入札価格)`),
    wholesalePrice: readPriceCell(sheet.getCell(rowIndex, COL.wholesalePrice), `行${rowIndex + 1} N列(卸価格)`),
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

  // Step 1: A列のみ読み込んでデータがある最終行を特定する
  // （空白行が大量に追加されても全列読み込みを回避できる）
  await sheet.loadCells({
    startRowIndex: 0,
    endRowIndex: totalRows,
    startColumnIndex: 0,
    endColumnIndex: 1,
  });

  let lastDataRowIndex = 0;
  for (let r = 1; r < totalRows; r++) {
    if (toStr(sheet.getCell(r, 0).value) !== "") {
      lastDataRowIndex = r;
    }
  }

  if (lastDataRowIndex === 0) return [];

  // Step 2: データがある行のみ全列を読み込む
  await sheet.loadCells({
    startRowIndex: 0,
    endRowIndex: lastDataRowIndex + 1,
    startColumnIndex: 0,
    endColumnIndex: MAX_COL_INDEX + 1,
  });

  const items: AuctionItem[] = [];
  for (let row = 1; row <= lastDataRowIndex; row++) {
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
  productUrl: string;
  check: boolean;
  bidTarget: boolean;
  assignee: string;
  revisedMarketPrice: number | null;
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

  if (payload.productUrl !== undefined)           set(COL.productUrl, payload.productUrl);
  if (payload.check !== undefined)               set(COL.check, payload.check);
  if (payload.bidTarget !== undefined)            set(COL.bidTarget, payload.bidTarget);
  if (payload.assignee !== undefined)             set(COL.assignee, payload.assignee);
  if (payload.revisedMarketPrice !== undefined)   set(COL.revisedMarketPrice, payload.revisedMarketPrice);
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
 *
 * ⚠️ sheet.addRow() は内部でヘッダー行を読み込むため、
 *    見出しに重複がある場合に "Duplicate header detected" エラーが発生する。
 *    そのため loadCells + getCell + saveUpdatedCells によるセル直接指定方式を使用し、
 *    ヘッダー名に一切依存しない実装にしている。
 *
 * @param sheetName スプレッドシートのタブ名
 */
export async function appendItem(
  sheetName: string,
  data: Omit<AuctionItem, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const doc = await getDoc();
  const sheet = getSheetByName(doc, sheetName);

  // ── Step 1: A列だけを読み込み、データが入っている最終行を探す ──
  // addRow() を使わないことで "Duplicate header detected" を完全回避する。
  const totalRows = sheet.rowCount;
  await sheet.loadCells({
    startRowIndex: 0,
    endRowIndex: totalRows,
    startColumnIndex: 0,       // A列のみ（最小限のデータ転送）
    endColumnIndex: 1,
  });

  let lastDataRowIndex = 0;    // 0 = ヘッダー行
  for (let r = 1; r < totalRows; r++) {
    if (toStr(sheet.getCell(r, 0).value) !== "") {
      lastDataRowIndex = r;
    }
  }

  const appendRowIndex = lastDataRowIndex + 1;

  // ── Step 2: 追記先の行を全列幅で読み込む ──
  await sheet.loadCells({
    startRowIndex: appendRowIndex,
    endRowIndex: appendRowIndex + 1,
    startColumnIndex: 0,
    endColumnIndex: MAX_COL_INDEX + 1,
  });

  // ── Step 3: 各セルに値を直接書き込む（列インデックス指定のみ・ヘッダー不使用） ──
  const set = (col: number, value: string | number | boolean | null) => {
    sheet.getCell(appendRowIndex, col).value = value ?? "";
  };

  set(COL.productUrl,          data.productUrl);
  set(COL.brandName,           data.brandName);
  set(COL.check,               data.check);
  set(COL.bidTarget,           data.bidTarget);
  set(COL.assignee,            data.assignee);
  set(COL.revisedMarketPrice,  data.revisedMarketPrice ?? "");
  set(COL.marketPrice,         data.marketPrice ?? "");
  set(COL.bidPrice,            data.bidPrice ?? "");
  set(COL.wholesalePrice,      data.wholesalePrice ?? "");
  set(COL.referenceUrl1,       data.referenceUrl1);
  set(COL.referenceUrl2,       data.referenceUrl2);
  set(COL.referenceUrl3,       data.referenceUrl3);
  set(COL.referenceUrl4,       data.referenceUrl4);
  set(COL.referenceUrl5,       data.referenceUrl5);
  set(COL.notes,               data.notes);
  set(COL.representativeCheck, data.representativeCheck);
  set(COL.judgmentResult,      data.judgmentResult);
  set(COL.feedback,            data.feedback);
  set(COL.feedbackConfirmed,   data.feedbackConfirmed);

  await sheet.saveUpdatedCells();
}
