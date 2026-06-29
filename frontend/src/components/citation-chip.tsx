import { BookText, Info } from "lucide-react";
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
        "inline-flex items-center gap-1.5 rounded-full border border-citation-border bg-citation px-2.5 py-1 text-xs font-semibold text-citation-foreground",
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
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[11px] border border-border bg-muted/60 px-[15px] py-[11px]",
        className
      )}
    >
      <Info className="size-[15px] flex-none text-muted-foreground" aria-hidden="true" />
      <p className="text-[11.5px] leading-[1.4] text-muted-foreground">
        SaudiGRC provides AI-assisted guidance and does not replace advice from a licensed legal
        professional.
      </p>
    </div>
  );
}
