import type { ImportCandidate } from "./csv";
import { parseMoney } from "@/lib/finance/money";

export interface PdfExtractionResult {
  candidates: ImportCandidate[];
  usedOcr: boolean;
  pageCount: number;
  text: string;
}

export async function extractStatementPdf(
  file: File,
  onProgress?: (message: string, progress: number) => void,
): Promise<PdfExtractionResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pageTexts: string[] = [];
  let usedOcr = false;
  let ocrWorker: Awaited<
    ReturnType<(typeof import("tesseract.js"))["createWorker"]>
  > | null = null;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress?.(
        `Reading page ${pageNumber} of ${pdf.numPages}`,
        Math.round(((pageNumber - 1) / pdf.numPages) * 100),
      );
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = groupTextItems(
        content.items as Array<{ str?: string; transform?: number[] }>,
      );
      let text = lines.join("\n");

      if (text.replace(/\s/g, "").length < 30) {
        usedOcr = true;
        onProgress?.(
          `Scanning image text on page ${pageNumber}`,
          Math.round(((pageNumber - 0.5) / pdf.numPages) * 100),
        );
        if (!ocrWorker) {
          const { createWorker } = await import("tesseract.js");
          ocrWorker = await createWorker("eng", 1, {
            workerPath: "/ocr/worker.min.js",
            corePath: "/ocr/tesseract-core-simd-lstm.js",
            langPath: "/ocr",
          });
        }
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context)
          throw new Error(
            "Your browser could not prepare this PDF page for OCR.",
          );
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const result = await ocrWorker.recognize(canvas);
        text = result.data.text;
      }
      pageTexts.push(text);
    }
  } finally {
    await ocrWorker?.terminate();
  }

  const text = pageTexts.join("\n");
  onProgress?.("Preparing rows for review", 100);
  return {
    candidates: candidatesFromStatementText(text),
    usedOcr,
    pageCount: pdf.numPages,
    text,
  };
}

function groupTextItems(items: Array<{ str?: string; transform?: number[] }>) {
  const rows = new Map<number, Array<{ x: number; value: string }>>();
  for (const item of items) {
    if (!item.str?.trim() || !item.transform) continue;
    const y = Math.round(item.transform[5] / 3) * 3;
    const row = rows.get(y) ?? [];
    row.push({ x: item.transform[4], value: item.str.trim() });
    rows.set(y, row);
  }
  return [...rows.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, row]) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((item) => item.value)
        .join(" "),
    );
}

export function candidatesFromStatementText(text: string): ImportCandidate[] {
  const datePattern = /(?:^|\s)(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)/;
  const amountPattern = /(?:\(?-?\$?\d{1,3}(?:,\d{3})*\.\d{2}\)?)(?!.*\d)/;
  const candidates: ImportCandidate[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const dateMatch = line.match(datePattern);
    const amountMatch = line.match(amountPattern);
    if (!dateMatch || !amountMatch) return;
    const amount = parseMoney(amountMatch[0]);
    if (amount === null) return;
    const currentYear = new Date().getFullYear();
    const dateParts = dateMatch[1].split(/[\/-]/);
    const yearValue = dateParts[2] ? Number(dateParts[2]) : currentYear;
    const year = yearValue < 100 ? 2000 + yearValue : yearValue;
    const date = `${year}-${dateParts[0].padStart(2, "0")}-${dateParts[1].padStart(2, "0")}`;
    const description = line
      .replace(dateMatch[0], " ")
      .replace(amountMatch[0], " ")
      .replace(/\s+/g, " ")
      .trim();
    const errors = description ? [] : ["Add description"];
    candidates.push({
      rowNumber: index + 1,
      date,
      description,
      amountCents: amount,
      confidence: errors.length ? 55 : 78,
      raw: { line },
      errors,
    });
  });
  return candidates;
}
