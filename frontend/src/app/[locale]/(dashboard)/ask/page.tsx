"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Send, MessagesSquare, BookText, AlertTriangle } from "lucide-react";
import { api, ApiError, type ChatMessage } from "@/lib/api";

const SUGGESTION_KEYS = ["0", "1", "2"] as const;

const SOURCE_KEYS = [
  { key: "saudiLaborLaw", color: "var(--risk-low)" },
  { key: "pdplRegs", color: "var(--risk-low)" },
  { key: "commercialRegs", color: "var(--risk-low)" },
  { key: "yourDocuments", color: "#2A6FDB" },
] as const;

export default function AskPage() {
  const t = useTranslations("Ask");
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [systemNote, setSystemNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const tokenFn = useCallback(() => getToken(), [getToken]);

  // The document the user came from (review detail "Ask Assistant"), if any.
  // Kept for the whole session so follow-up questions stay grounded in it.
  const documentId = searchParams.get("doc") ?? undefined;

  // Pre-fill the input when arriving from a document with ?q=… (e.g. the
  // "Ask Assistant" button on a review detail page). The user reviews and
  // sends it themselves rather than it auto-firing.
  useEffect(() => {
    const initialQuery = searchParams.get("q");
    if (initialQuery) setInput(initialQuery);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setInitializing(true);
    api.chatSessions
      .create({}, tokenFn)
      .then((session) => {
        if (!active) return;
        setSessionId(session.id);
        setMessages(session.messages ?? []);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : t("errorStartSession"));
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, [tokenFn]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !sessionId) return;
    setMessages((m) => [
      ...m,
      { id: `local-${Date.now()}`, role: "user", content: trimmed, citations: [], created_at: new Date().toISOString() },
    ]);
    setInput("");
    setTyping(true);
    setSystemNote(null);
    setError(null);
    try {
      const reply = await api.chatSessions.ask(sessionId, trimmed, tokenFn, documentId);
      setMessages((m) => [...m, reply]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setSystemNote(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : t("errorSendMessage"));
      }
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* chat column */}
      <div className="flex min-w-0 flex-1 flex-col border-e border-border">
        <div className="ca-scroll flex-1 overflow-y-auto px-7 py-[26px]">
          <div className="mx-auto max-w-[720px]">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#F8DADA] bg-[#FDF5F5] px-4 py-3 text-[13px] text-risk-high">
                <AlertTriangle className="size-4 flex-none" strokeWidth={1.8} />
                {error}
              </div>
            )}

            {messages.length === 0 && !initializing && (
              <div className="px-0 py-[30px] pb-[26px] text-center">
                <div
                  className="mx-auto mb-4 flex size-14 items-center justify-center rounded-[15px]"
                  style={{ background: "linear-gradient(150deg,#1F8A5B,#34D399)", boxShadow: "0 6px 18px rgba(31,138,91,0.3)" }}
                >
                  <MessagesSquare className="size-7 text-white" strokeWidth={1.8} />
                </div>
                <div className="text-xl font-bold tracking-tight">{t("heroTitle")}</div>
                <div className="mt-[7px] text-[13.5px] leading-[1.5] text-muted-foreground">
                  {t("heroSubtitleLine1")}
                  <br />
                  {t("heroSubtitleLine2")}
                </div>
                <div className="mx-auto mt-6 flex max-w-[480px] flex-col gap-2.5">
                  {SUGGESTION_KEYS.map((key) => {
                    const q = t(`suggestions.${key}`);
                    return (
                      <button
                        key={key}
                        onClick={() => send(q)}
                        disabled={!sessionId}
                        className="flex items-center gap-[11px] rounded-xl border border-border bg-card px-4 py-[13px] text-start text-[13px] font-medium text-secondary-foreground transition-colors hover:border-accent hover:bg-muted/30 disabled:opacity-50"
                      >
                        <BookText className="size-4 flex-none text-accent" strokeWidth={1.7} />
                        {q}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="mb-5 flex justify-end">
                  <div className="max-w-[80%] rounded-[14px_14px_4px_14px] bg-primary px-[15px] py-[11px] text-[13.5px] leading-[1.55] text-primary-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="mb-5 flex gap-[11px]">
                  <div
                    className="flex size-[30px] flex-none items-center justify-center rounded-lg"
                    style={{ background: "linear-gradient(150deg,#1F8A5B,#34D399)" }}
                  >
                    <MessagesSquare className="size-4 text-white" strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] leading-[1.65]">{m.content}</div>
                    {m.citations.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">{t("sources")}</span>
                        {m.citations.map((c) => (
                          <span
                            key={c.index}
                            title={`${c.source_ref}${c.is_synthetic ? " · " + t("synthetic") : ""}`}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground/80"
                          >
                            <span className="font-mono-data text-[10px] text-muted-foreground">[{c.index}]</span>
                            {c.source_title}
                            {c.is_synthetic && <span className="text-[9.5px] uppercase text-risk-medium">{t("synthetic")}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {systemNote && (
              <div className="mb-5 flex justify-center">
                <div className="max-w-[90%] rounded-[12px] border border-border bg-muted/40 px-4 py-2.5 text-center text-[12.5px] text-muted-foreground">
                  {systemNote}
                </div>
              </div>
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
              disabled={!sessionId}
              placeholder={t("inputPlaceholder")}
              className="flex-1 border-0 bg-transparent text-[13.5px] outline-none disabled:opacity-60"
            />
            <button
              onClick={() => send(input)}
              disabled={!sessionId}
              className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-primary transition-colors hover:bg-[#0E4A38] disabled:opacity-60"
            >
              <Send className="size-[18px] text-primary-foreground" strokeWidth={1.8} />
            </button>
          </div>
          <div className="mx-auto mt-2 max-w-[720px] text-center text-[10.5px] text-muted-foreground">
            {t("footerDisclaimer")}
          </div>
        </div>
      </div>

      {/* sources panel */}
      <div className="ca-scroll w-[280px] flex-none overflow-y-auto bg-muted/40 px-5 py-[22px]">
        <div className="mb-3.5 text-[11px] font-bold tracking-wide text-muted-foreground">{t("knowledgeSources")}</div>
        <div className="flex flex-col gap-2.5">
          {SOURCE_KEYS.map((s) => (
            <div key={s.key} className="rounded-[11px] border border-border bg-card p-3">
              <div className="mb-0.5 flex items-center gap-[7px]">
                <span className="size-[7px] rounded-full" style={{ background: s.color }} />
                <span className="text-xs font-bold">{t(`sources.${s.key}.name`)}</span>
              </div>
              <div className="text-[11px] leading-[1.4] text-muted-foreground">{t(`sources.${s.key}.meta`)}</div>
            </div>
          ))}
        </div>
        <div className="mt-[18px] rounded-[11px] border border-[#D7EEE3] bg-risk-low-bg p-[13px]">
          <div className="mb-1 text-[11.5px] font-bold text-primary">{t("ragTitle")}</div>
          <div className="text-[11px] leading-[1.5] text-secondary-foreground/80">
            {t("ragDesc")}
          </div>
        </div>
      </div>
    </div>
  );
}
