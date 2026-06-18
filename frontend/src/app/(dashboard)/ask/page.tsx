"use client";

import { useState } from "react";
import { Send, MessagesSquare, BookText } from "lucide-react";

type Citation = { title: string; source: string };
type Message = { role: "user" | "ai"; text: string; citations?: Citation[] };

const SUGGESTIONS = [
  "Is a non-compete clause enforceable under Saudi Labor Law?",
  "What must a PDPL-compliant privacy notice include?",
  "Summarize the key risks in my CloudServe MSA.",
];

const SOURCES = [
  { name: "Saudi Labor Law", meta: "245 articles indexed · updated 2024", color: "var(--risk-low)" },
  { name: "PDPL & SDAIA Regs", meta: "Personal Data Protection Law + implementing regs", color: "var(--risk-low)" },
  { name: "Commercial Regulations", meta: "Companies Law, CR & SME rules", color: "var(--risk-low)" },
  { name: "Your documents", meta: "148 contracts · embedded & searchable", color: "#2A6FDB" },
];

function cannedReply(): Message {
  return {
    role: "ai",
    text: "Under the Saudi Labor Law, post-employment non-compete clauses are enforceable only if they are reasonable in duration, geography, and scope of work — and necessary to protect a legitimate business interest. A common safe limit is a maximum of two (2) years from the end of the contract. Overly broad clauses are routinely struck down by labor courts. I recommend narrowing the clause to specific competitors and a defined region.",
    citations: [
      { title: "Saudi Labor Law — Article 83", source: "Non-compete: max 2 years, must be limited in time, place & work" },
      { title: "Ministerial Resolution 4904", source: "Reasonableness test for restrictive covenants" },
    ],
  };
}

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, cannedReply()]);
      setTyping(false);
    }, 900);
  }

  return (
    <div className="flex h-full">
      {/* chat column */}
      <div className="flex min-w-0 flex-1 flex-col border-e border-border">
        <div className="ca-scroll flex-1 overflow-y-auto px-7 py-[26px]">
          <div className="mx-auto max-w-[720px]">
            {messages.length === 0 && (
              <div className="px-0 py-[30px] pb-[26px] text-center">
                <div
                  className="mx-auto mb-4 flex size-14 items-center justify-center rounded-[15px]"
                  style={{ background: "linear-gradient(150deg,#1F8A5B,#34D399)", boxShadow: "0 6px 18px rgba(31,138,91,0.3)" }}
                >
                  <MessagesSquare className="size-7 text-white" strokeWidth={1.8} />
                </div>
                <div className="text-xl font-bold tracking-tight">How can I help with your compliance today?</div>
                <div className="mt-[7px] text-[13.5px] leading-[1.5] text-muted-foreground">
                  Ask about contracts, Saudi regulations, or your uploaded documents.
                  <br />
                  Every answer is grounded in source regulations with citations.
                </div>
                <div className="mx-auto mt-6 flex max-w-[480px] flex-col gap-2.5">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="flex items-center gap-[11px] rounded-xl border border-border bg-card px-4 py-[13px] text-start text-[13px] font-medium text-secondary-foreground transition-colors hover:border-accent hover:bg-muted/30"
                    >
                      <BookText className="size-4 flex-none text-accent" strokeWidth={1.7} />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="mb-5 flex justify-end">
                  <div className="max-w-[80%] rounded-[14px_14px_4px_14px] bg-primary px-[15px] py-[11px] text-[13.5px] leading-[1.55] text-primary-foreground">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="mb-5 flex gap-[11px]">
                  <div
                    className="flex size-[30px] flex-none items-center justify-center rounded-lg"
                    style={{ background: "linear-gradient(150deg,#1F8A5B,#34D399)" }}
                  >
                    <MessagesSquare className="size-4 text-white" strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] leading-[1.65]">{m.text}</div>
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-[11px] flex flex-col gap-[7px]">
                        {m.citations.map((c) => (
                          <div
                            key={c.title}
                            className="flex items-start gap-2.5 rounded-[10px] border border-citation-border bg-citation px-3 py-2.5"
                          >
                            <BookText className="mt-px size-3.5 flex-none text-citation-foreground" strokeWidth={1.8} />
                            <div>
                              <div className="text-xs font-bold text-citation-foreground">{c.title}</div>
                              <div className="mt-px text-[11px] text-muted-foreground">{c.source}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {typing && (
              <div className="mb-5 flex gap-[11px]">
                <div
                  className="flex size-[30px] flex-none items-center justify-center rounded-lg"
                  style={{ background: "linear-gradient(150deg,#1F8A5B,#34D399)" }}
                >
                  <MessagesSquare className="size-4 text-white" strokeWidth={1.7} />
                </div>
                <div className="flex items-center gap-[5px] rounded-[14px] bg-muted px-4 py-[13px]">
                  <span className="size-[7px] animate-pulse rounded-full bg-muted-foreground" />
                  <span className="size-[7px] animate-pulse rounded-full bg-muted-foreground/60" />
                  <span className="size-[7px] animate-pulse rounded-full bg-muted-foreground/30" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* input */}
        <div className="border-t border-border bg-card px-7 py-3.5">
          <div className="mx-auto flex max-w-[720px] items-center gap-2.5 rounded-[13px] border border-border py-1.5 ps-4 pe-1.5 focus-within:border-accent">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send(input);
              }}
              placeholder="Ask about a clause, regulation, or document…"
              className="flex-1 border-0 bg-transparent text-[13.5px] outline-none"
            />
            <button
              onClick={() => send(input)}
              className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-primary transition-colors hover:bg-[#0E4A38]"
            >
              <Send className="size-[18px] text-primary-foreground" strokeWidth={1.8} />
            </button>
          </div>
          <div className="mx-auto mt-2 max-w-[720px] text-center text-[10.5px] text-muted-foreground">
            AI-assisted guidance with source citations · not a substitute for licensed legal counsel
          </div>
        </div>
      </div>

      {/* sources panel */}
      <div className="ca-scroll w-[280px] flex-none overflow-y-auto bg-muted/40 px-5 py-[22px]">
        <div className="mb-3.5 text-[11px] font-bold tracking-wide text-muted-foreground">KNOWLEDGE SOURCES</div>
        <div className="flex flex-col gap-2.5">
          {SOURCES.map((s) => (
            <div key={s.name} className="rounded-[11px] border border-border bg-card p-3">
              <div className="mb-0.5 flex items-center gap-[7px]">
                <span className="size-[7px] rounded-full" style={{ background: s.color }} />
                <span className="text-xs font-bold">{s.name}</span>
              </div>
              <div className="text-[11px] leading-[1.4] text-muted-foreground">{s.meta}</div>
            </div>
          ))}
        </div>
        <div className="mt-[18px] rounded-[11px] border border-[#D7EEE3] bg-risk-low-bg p-[13px]">
          <div className="mb-1 text-[11.5px] font-bold text-primary">RAG retrieval</div>
          <div className="text-[11px] leading-[1.5] text-secondary-foreground/80">
            Answers are generated only from retrieved passages above. Citations link to the exact source article.
          </div>
        </div>
      </div>
    </div>
  );
}
