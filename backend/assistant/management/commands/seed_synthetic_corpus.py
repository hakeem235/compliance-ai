"""
Seed a small, clearly-labelled SYNTHETIC knowledge corpus so the RAG pipeline
is exercisable end-to-end without ingesting any real (copyright-uncertain)
legal text. Every chunk is marked is_synthetic=True.

Real corpus ingestion is intentionally NOT here — it is blocked on an
Advisor-sanctioned, authoritative source (see CHANNEL Question 2026-06-26).
"""

from django.core.management.base import BaseCommand

from assistant import rag
from assistant.models import KnowledgeChunk

# Paraphrased, non-authoritative placeholders — NOT quotations of real statutes.
SYNTHETIC_SOURCES = [
    {
        "source_title": "Synthetic PDPL Primer",
        "source_ref": "Synthetic — Data Protection §1",
        "content": (
            "Personal data must be processed lawfully and for a clear purpose. "
            "Organizations should obtain consent before collecting personal data "
            "and should let individuals access and correct their information. "
            "Cross-border transfers of personal data require appropriate safeguards."
        ),
    },
    {
        "source_title": "Synthetic Labor Law Primer",
        "source_ref": "Synthetic — Employment §1",
        "content": (
            "Employment contracts should state the wage, working hours, and notice "
            "period. Termination without a valid reason may entitle the employee to "
            "compensation. End-of-service benefits accrue based on length of service."
        ),
    },
    {
        "source_title": "Synthetic Commercial Law Primer",
        "source_ref": "Synthetic — Contracts §1",
        "content": (
            "Commercial contracts are binding when there is offer, acceptance, and "
            "lawful consideration. Penalty clauses must be reasonable. A party may "
            "claim damages for breach, subject to the duty to mitigate losses."
        ),
    },
    {
        "source_title": "Synthetic VAT Primer",
        "source_ref": "Synthetic — Tax §1",
        "content": (
            "Value Added Tax applies to most goods and services at the standard "
            "rate. Registered businesses must issue tax invoices and file periodic "
            "VAT returns. Input VAT on business purchases may generally be recovered."
        ),
    },
]


class Command(BaseCommand):
    help = "Seed a synthetic (placeholder) knowledge corpus for the RAG pipeline."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing synthetic chunks before seeding.",
        )

    def handle(self, *args, **options):
        embedder = rag.active_embedder()
        if options["reset"]:
            deleted, _ = KnowledgeChunk.objects.filter(is_synthetic=True).delete()
            self.stdout.write(f"Removed {deleted} existing synthetic chunk(s).")

        created = 0
        for source in SYNTHETIC_SOURCES:
            for chunk in rag.chunk_text(source["content"]):
                KnowledgeChunk.objects.create(
                    source_title=source["source_title"],
                    source_ref=source["source_ref"],
                    content=chunk,
                    embedding=rag.embed_text(chunk),
                    embedder=embedder,
                    is_synthetic=True,
                )
                created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Seeded {created} synthetic knowledge chunk(s) using embedder '{embedder}'.")
        )
