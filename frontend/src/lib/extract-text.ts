/**
 * Client-side text extraction for document upload, so the AI Contract Review
 * Engine has something to analyze without a server-side OCR/parsing pipeline
 * (no S3 storage or document service is provisioned — see review/page.tsx).
 */

export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Served as a static asset from /public (see scripts/copy-vendor-assets.mjs,
  // run via the "postinstall" npm script) rather than bundled via
  // `new URL(..., import.meta.url)` — Next's production build runs Terser
  // over webpack-bundled assets, which can't parse the worker's ESM syntax
  // (`import.meta`) and fails the build. A plain static file sidesteps that.
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  const scannedPageIndices: number[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ").trim();
    pages.push(text);
    if (!text) scannedPageIndices.push(i - 1);
  }

  // No text layer on some/all pages (a scanned PDF) — fall back to OCR on
  // just those pages rather than the whole document, so a mixed text+scan
  // PDF doesn't pay the (much slower) OCR cost for pages that didn't need it.
  if (scannedPageIndices.length > 0) {
    const { recognizeImage } = await import("./ocr");
    for (const idx of scannedPageIndices) {
      const page = await pdf.getPage(idx + 1);
      const dataUrl = await renderPageToImage(page);
      pages[idx] = await recognizeImage(dataUrl);
    }
  }

  return pages.join("\n\n").trim();
}

async function renderPageToImage(page: import("pdfjs-dist").PDFPageProxy): Promise<string> {
  // Render at 2x scale — OCR accuracy degrades noticeably on low-resolution
  // renders of typical 72dpi PDF page geometry.
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  await page.render({ canvasContext: context, viewport, canvas }).promise;
  return canvas.toDataURL("image/png");
}

export async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.trim();
}
