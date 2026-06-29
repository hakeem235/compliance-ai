"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth";
import { Loader2, AlertTriangle, Settings2, CheckCircle2, X, Mail } from "lucide-react";
import { api, ApiError, type EmailConfigInput } from "@/lib/api";

/**
 * Self-contained Email (SMTP) configuration control: a button + status badge
 * that opens a modal to save and test the org's outbound mail server. Used on
 * the Admin page. All state, data loading, and i18n (the `EmailConfig`
 * namespace) live here so it can be dropped in anywhere.
 */
export function EmailConfigCard() {
  const t = useTranslations("EmailConfig");
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken(), [getToken]);

  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EmailConfigInput & { has_password?: boolean }>({
    host: "",
    port: 587,
    username: "",
    from_email: "",
    use_tls: true,
    password: "",
  });

  useEffect(() => {
    api.emailConfig
      .get(tokenFn)
      .then((cfg) => {
        setConfigured(cfg.configured);
        if (cfg.configured) {
          setForm({
            host: cfg.host ?? "",
            port: cfg.port ?? 587,
            username: cfg.username ?? "",
            from_email: cfg.from_email ?? "",
            use_tls: cfg.use_tls ?? true,
            password: "",
            has_password: cfg.has_password,
          });
        }
      })
      .catch(() => {
        /* non-fatal: config is optional */
      });
  }, [tokenFn]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setNote(null);
    try {
      const body: EmailConfigInput = {
        host: form.host,
        port: form.port,
        username: form.username,
        from_email: form.from_email,
        use_tls: form.use_tls,
      };
      // Only send a password when the user typed one — keeps the stored one otherwise.
      if (form.password) body.password = form.password;
      const saved = await api.emailConfig.save(body, tokenFn);
      setConfigured(saved.configured);
      setForm((f) => ({ ...f, password: "", has_password: saved.has_password }));
      setNote(t("saved"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (testing) return;
    setTesting(true);
    setError(null);
    setNote(null);
    try {
      const res = await api.emailConfig.test(tokenFn);
      setNote(res.detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorTest"));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-border bg-card p-[18px]">
      <div className="mb-3.5 flex items-center gap-2">
        <Mail className="size-[17px] text-primary" strokeWidth={1.7} />
        <div className="text-sm font-bold">{t("title")}</div>
      </div>
      <p className="mb-3.5 text-[11.5px] leading-[1.5] text-muted-foreground">{t("desc")}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setNote(null);
            setError(null);
            setOpen(true);
          }}
          className="flex h-[34px] items-center gap-[6px] rounded-[9px] bg-primary px-[13px] text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38]"
        >
          <Settings2 className="size-[14px]" strokeWidth={2} />
          {t("configureButton")}
        </button>
        {configured && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-accent">
            <CheckCircle2 className="size-[13px]" strokeWidth={2} />
            {t("configured")}
          </span>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !saving && !testing && setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSave}
            className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-[16px] border border-border bg-card p-6 text-start shadow-xl"
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="text-base font-bold">{t("title")}</div>
              <button
                type="button"
                onClick={() => !saving && !testing && setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-[18px]" strokeWidth={1.8} />
              </button>
            </div>
            <p className="mb-4 text-[12px] leading-[1.5] text-muted-foreground">{t("desc")}</p>

            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-[9px] border border-[#F8DADA] bg-[#FDF5F5] px-3 py-2 text-[12px] text-risk-high">
                <AlertTriangle className="size-3.5 flex-none" strokeWidth={1.8} />
                {error}
              </div>
            )}
            {note && (
              <div className="mb-3 flex items-center gap-2 rounded-[9px] border border-[#CDEBDC] bg-[#F4FAF7] px-3 py-2 text-[12px] text-accent">
                <CheckCircle2 className="size-3.5 flex-none" strokeWidth={1.8} />
                {note}
              </div>
            )}

            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-[1fr_110px] gap-3">
                <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-secondary-foreground/80">
                  {t("host")}
                  <input
                    required
                    value={form.host}
                    onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                    placeholder="smtp.gmail.com"
                    className="h-[38px] rounded-[9px] border border-border bg-background px-3 text-[13px] font-normal text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-secondary-foreground/80">
                  {t("port")}
                  <input
                    type="number"
                    required
                    value={form.port}
                    onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))}
                    className="h-[38px] rounded-[9px] border border-border bg-background px-3 text-[13px] font-normal text-foreground"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-secondary-foreground/80">
                {t("username")}
                <input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="h-[38px] rounded-[9px] border border-border bg-background px-3 text-[13px] font-normal text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-secondary-foreground/80">
                {t("password")}
                <input
                  type="password"
                  value={form.password ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={form.has_password ? t("passwordKept") : ""}
                  className="h-[38px] rounded-[9px] border border-border bg-background px-3 text-[13px] font-normal text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-secondary-foreground/80">
                {t("from")}
                <input
                  type="email"
                  required
                  value={form.from_email}
                  onChange={(e) => setForm((f) => ({ ...f, from_email: e.target.value }))}
                  placeholder="compliance@yourcompany.com"
                  className="h-[38px] rounded-[9px] border border-border bg-background px-3 text-[13px] font-normal text-foreground"
                />
              </label>
              <label className="flex items-center gap-2 text-[12.5px] font-semibold text-secondary-foreground/80">
                <input
                  type="checkbox"
                  checked={form.use_tls}
                  onChange={(e) => setForm((f) => ({ ...f, use_tls: e.target.checked }))}
                  className="size-4 accent-[var(--primary)]"
                />
                {t("useTls")}
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !configured}
                title={!configured ? t("testHint") : undefined}
                className="flex h-[38px] items-center gap-[7px] rounded-[10px] border border-border bg-card px-4 text-[13px] font-semibold text-secondary-foreground transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testing && <Loader2 className="size-[15px] animate-spin" strokeWidth={1.8} />}
                {t("sendTest")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex h-[38px] items-center gap-[7px] rounded-[10px] bg-primary px-[18px] text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-[#0E4A38] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 className="size-[15px] animate-spin" strokeWidth={1.8} />}
                {t("save")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
