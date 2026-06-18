import { BookText } from "lucide-react";
import { cn } from "@/lib/utils";

export function CitationChip({
  source,
  className,
}: {
  /** e.g. "Saudi Labor Law, Art. 74" or "Document p. 3" */
  source: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-citation-border bg-citation px-2.5 py-1 text-xs font-medium text-citation-foreground",
        className
      )}
    >
      <BookText className="size-3.5" aria-hidden="true" />
      {source}
    </span>
  );
}

export function AiDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      AI-generated guidance — not legal advice. Verify with a licensed professional before relying on it.
    </p>
  );
}
