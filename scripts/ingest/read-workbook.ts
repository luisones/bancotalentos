import { spawnSync } from "node:child_process";
import path from "node:path";
import type { SheetRow, WorkbookData } from "./types";

const SHEET_NAMES = [
  "CANDIDATOS",
  "CANDIDATURAS",
  "DOCUMENTOS",
  "RESPOSTAS",
  "PRATICAS",
  "AULAS_TESTE",
  "SCORES_DIMENSAO",
  "PROVAS",
  "SEGUNDA_FASE",
  "FLAGS_TAGS",
  "REJEITADOS",
  "LEGENDA",
  "DISCIPLINAS_DE_PARA",
] as const;

export function readWorkbook(filePath: string): WorkbookData {
  const absPath = path.resolve(filePath);
  const python = `
import json, openpyxl, sys
from datetime import date, datetime

def serialize(v):
    if v is None:
        return None
    if isinstance(v, float) and v != v:
        return None
    if isinstance(v, bool):
        return "SIM" if v else "NAO"
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v

path = sys.argv[1]
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
sheet_names = ${JSON.stringify([...SHEET_NAMES])}
result = {}

for name in sheet_names:
    if name not in wb.sheetnames:
        result[name] = []
        continue
    ws = wb[name]
    rows_iter = ws.iter_rows(values_only=True)
    try:
        header_row = next(rows_iter)
    except StopIteration:
        result[name] = []
        continue
    headers = [str(h).strip() if h is not None else "" for h in header_row]
    rows = []
    for row in rows_iter:
        cells = [serialize(c) for c in row]
        if all(c is None or c == "" for c in cells):
            continue
        obj = {}
        for i, key in enumerate(headers):
            if not key:
                continue
            obj[key] = cells[i] if i < len(cells) else None
        rows.append(obj)
    result[name] = rows

print(json.dumps(result))
`;

  const result = spawnSync("python3", ["-c", python, absPath], {
    encoding: "utf-8",
    maxBuffer: 100 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || `python exited with ${result.status}`);
  }

  return JSON.parse(result.stdout) as WorkbookData;
}

export function cellText(row: SheetRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

export function cellNumber(row: SheetRow, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined || value === "") return null;
  const n =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseAppliedAt(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function normalizeEmail(email: string | null): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}
