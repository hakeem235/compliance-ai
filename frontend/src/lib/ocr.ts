/**
 * OCR fallback for scanned PDF pages with no embedded text layer (see
 * extract-text.ts). Uses tesseract.js — pure client-side, no server-side
 * OCR service or cloud API required.
 */

import type { Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(({ createWorker }) => createWorker("eng+ara"));
  }
  return workerPromise;
}

export async function recognizeImage(imageDataUrl: string): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(imageDataUrl);
  return data.text.trim();
}
