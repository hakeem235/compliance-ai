/**
 * Client-side text extraction for document upload, so the AI Contract Review
 * Engine has something to analyze without a server-side OCR/parsing pipeline
 * (no S3 storage or document service is provisioned — see review/page.tsx).
 */

export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Served as a static asset from /public (see scripts/copy-pdf-worker.mjs,
  // run via the "postinstall" npm script) rather than bundled via
  // `new URL(..., import.meta.url)` — Next's production build runs Terser
  // over webpack-bundled assets, which can't parse the worker's ESM syntax
  // (`import.meta`) and fails the build. A plain static file sidesteps that.
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n\n").trim();
}

export async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.trim();
}
