// Copies pdfjs-dist's worker bundle into /public so it's served as a plain
// static asset instead of being run through webpack/Terser (which can't
// parse its ESM `import.meta` syntax — see src/lib/extract-text.ts).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const destDir = join(root, "public");
const dest = join(destDir, "pdf.worker.min.mjs");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log("Copied pdf.worker.min.mjs to public/");
