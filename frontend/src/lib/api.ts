/**
 * Typed fetch wrapper for the SaudiGRC Django/DRF backend.
 *
 * - Reads NEXT_PUBLIC_API_BASE_URL from env.
 * - Attaches the Clerk session JWT as a Bearer header (client-side only —
 *   call sites in this app are "use client" pages, so we use Clerk's
 *   useAuth().getToken() pattern via the `getToken` param injected by callers).
 * - Parses JSON responses and surfaces errors in a consistent ApiError shape
 *   instead of swallowing them, so calling code can render loading/error/empty
 *   states explicitly.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export type GetTokenFn = () => Promise<string | null>;

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  getToken: GetTokenFn;
};

/**
 * Core request function. `getToken` should be the function returned by
 * Clerk's `useAuth()` hook (`const { getToken } = useAuth()`), passed in by
 * the calling component — this module has no React/Clerk dependency itself.
 */
async function request<T>(path: string, { getToken, body, headers, ...init }: RequestOptions): Promise<T> {
  const token = await getToken();

  const finalHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      `Network error contacting ${API_BASE_URL}${path}: ${err instanceof Error ? err.message : String(err)}`,
      0,
      null
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "detail" in parsed && typeof (parsed as { detail?: unknown }).detail === "string"
        ? (parsed as { detail: string }).detail
        : undefined) ?? `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}

export function apiGet<T>(path: string, getToken: GetTokenFn): Promise<T> {
  return request<T>(path, { method: "GET", getToken });
}

export function apiPost<T>(path: string, body: unknown, getToken: GetTokenFn): Promise<T> {
  return request<T>(path, { method: "POST", body, getToken });
}

export function apiPatch<T>(path: string, body: unknown, getToken: GetTokenFn): Promise<T> {
  return request<T>(path, { method: "PATCH", body, getToken });
}

export function apiPut<T>(path: string, body: unknown, getToken: GetTokenFn): Promise<T> {
  return request<T>(path, { method: "PUT", body, getToken });
}

export function apiDelete<T>(path: string, getToken: GetTokenFn): Promise<T> {
  return request<T>(path, { method: "DELETE", getToken });
}

// ---------------------------------------------------------------------------
// Domain types — mirrored from backend serializers (see backend/*/serializers.py).
// Keep these in sync manually; there is no codegen in this repo.
// ---------------------------------------------------------------------------

export type DocumentStatus = "uploaded" | "processing" | "analyzed" | "failed";
export type FileType = "pdf" | "docx" | "txt";
export type RiskLevelApi = "high" | "medium" | "low";

export interface ClauseFinding {
  id: string;
  clause_text: string;
  risk_level: RiskLevelApi;
  category: "liability" | "termination" | "confidentiality" | "ip" | "dispute_resolution" | "other";
  recommendation: string;
  citation_source: string | null;
}

export interface DocumentAnalysis {
  id: string;
  document: string;
  risk_score: number | null;
  risk_summary: string;
  status: string;
  model_version: string;
  created_at: string;
  findings: ClauseFinding[];
}

export interface Document {
  id: string;
  filename: string;
  file_type: FileType;
  s3_key: string;
  status: DocumentStatus;
  version: number;
  parent_document: string | null;
  created_at: string;
  updated_at: string;
  latest_analysis: DocumentAnalysis | null;
  // Extracted document text. Only returned by the detail endpoint
  // (omitted from the list response to keep payloads small).
  content_text?: string;
}

export type ComplianceEventType = "license_renewal" | "contract_expiry" | "tax_deadline" | "hr_obligation";
export type ComplianceEventStatus = "upcoming" | "due" | "overdue" | "resolved";

export interface ComplianceEvent {
  id: string;
  type: ComplianceEventType;
  category: string;
  related_document: string | null;
  due_date: string; // YYYY-MM-DD
  status: ComplianceEventStatus;
  notify_emails: string[];
  created_at: string;
}

export interface EmailConfig {
  configured: boolean;
  host?: string;
  port?: number;
  username?: string;
  from_email?: string;
  use_tls?: boolean;
  has_password?: boolean;
  updated_at?: string;
}

export interface EmailConfigInput {
  host: string;
  port: number;
  username: string;
  from_email: string;
  use_tls: boolean;
  password?: string;
}

export type PlanKey = "starter" | "growth" | "enterprise";

export interface Subscription {
  plan: string; // "" = no paid plan
  status: "none" | "active" | "past_due" | "canceled";
  current_period_end: string | null;
  updated_at: string | null;
}

export interface PlanCatalogItem {
  key: PlanKey;
  name: string;
  price_sar: number | null;
  checkout: boolean;
}

export interface BillingState {
  subscription: Subscription;
  plans: PlanCatalogItem[];
  stripe_enabled: boolean;
}

export interface Usage {
  reviews_used: number;
  reviews_limit: number | null; // null = unlimited
  plan: string;
}

export interface Citation {
  index: number;
  source_title: string;
  source_ref: string;
  score: number;
  is_synthetic: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  messages: ChatMessage[];
}

export type GeneratedDocType =
  | "nda"
  | "employment"
  | "freelance"
  | "vendor"
  | "service"
  | "non_compete"
  | "warning_letter"
  | "termination_letter";

export interface GeneratedDocument {
  id: string;
  doc_type: GeneratedDocType;
  questionnaire_answers: Record<string, unknown>;
  draft_content: string;
  exported_pdf_s3_key: string;
  exported_docx_s3_key: string;
  created_at: string;
}

export interface OrgUser {
  id: string;
  organization: string;
  role: "admin" | "owner" | "member" | "legal_reviewer";
  email: string;
  name: string;
  created_at: string;
}

export interface CurrentUser extends OrgUser {
  organization_name: string;
  is_platform_admin: boolean;
}

// --- Platform back-office (cross-tenant; platform staff only) ---------------
export interface PlatformStats {
  total_clients: number;
  total_users: number;
  active_subscriptions: number;
  past_due: number;
  mrr_sar: number;
  docs_analyzed: number;
}

export interface ClientSummary {
  id: string;
  name: string;
  jurisdiction: string;
  created_at: string;
  members: number;
  plan: string;
  plan_name: string;
  subscription_status: "none" | "active" | "past_due" | "canceled";
  current_period_end: string | null;
}

export interface ClientDetail {
  id: string;
  name: string;
  jurisdiction: string;
  created_at: string;
  members: { id: string; email: string; name: string; role: string; created_at: string }[];
  subscription: {
    plan: string;
    plan_name: string;
    status: "none" | "active" | "past_due" | "canceled";
    current_period_end: string | null;
    stripe_customer_id: string;
    has_stripe_subscription: boolean;
  };
  usage: { used: number; limit: number | null; plan: string };
  docs_analyzed: number;
}

export interface ClientPayment {
  id: string;
  number: string | null;
  amount_paid: number;
  currency: string;
  status: string | null;
  created: number | null;
  hosted_invoice_url: string | null;
  payment_intent: string | null;
}

export interface AdminStats {
  active_users: number;
  docs_analyzed: number;
  ai_calls: number;
  storage_bytes: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  actor_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Endpoint helpers
// ---------------------------------------------------------------------------

export const api = {
  documents: {
    list: (getToken: GetTokenFn) => apiGet<Document[]>("/api/documents/", getToken),
    get: (id: string, getToken: GetTokenFn) => apiGet<Document>(`/api/documents/${id}/`, getToken),
    create: (body: { filename: string; file_type: FileType; s3_key: string; content_text?: string }, getToken: GetTokenFn) =>
      apiPost<Document>("/api/documents/", body, getToken),
    analyze: (id: string, getToken: GetTokenFn) =>
      apiPost<{ detail: string; document_id: string }>(`/api/documents/${id}/analyze/`, {}, getToken),
    sendEmail: (
      id: string,
      body: { subject: string; body: string; recipients: string[] },
      getToken: GetTokenFn
    ) => apiPost<{ detail: string; sent: number; recipients: string[] }>(`/api/documents/${id}/send-email/`, body, getToken),
    // Presigned S3 upload: ask the backend for a PUT URL, upload the file to it
    // directly, then create the Document with the returned `key` as s3_key.
    // Returns 503 (ApiError) until S3 storage is configured server-side.
    uploadUrl: (
      body: { filename: string; content_type: string },
      getToken: GetTokenFn
    ) => apiPost<{ url: string; key: string; content_type: string; expires_in: number }>(
      "/api/documents/upload-url/",
      body,
      getToken
    ),
    downloadUrl: (id: string, getToken: GetTokenFn) =>
      apiGet<{ url: string }>(`/api/documents/${id}/download-url/`, getToken),
  },
  generatedDocuments: {
    list: (getToken: GetTokenFn) => apiGet<GeneratedDocument[]>("/api/generated-documents/", getToken),
    create: (body: { doc_type: GeneratedDocType; questionnaire_answers: Record<string, unknown> }, getToken: GetTokenFn) =>
      apiPost<GeneratedDocument>("/api/generated-documents/", body, getToken),
  },
  complianceEvents: {
    list: (getToken: GetTokenFn) => apiGet<ComplianceEvent[]>("/api/compliance-events/", getToken),
    create: (
      body: { type: ComplianceEventType; category?: string; related_document?: string | null; due_date: string; status?: ComplianceEventStatus; notify_emails?: string[] },
      getToken: GetTokenFn
    ) => apiPost<ComplianceEvent>("/api/compliance-events/", body, getToken),
  },
  emailConfig: {
    get: (getToken: GetTokenFn) => apiGet<EmailConfig>("/api/email-config/", getToken),
    save: (body: EmailConfigInput, getToken: GetTokenFn) => apiPut<EmailConfig>("/api/email-config/", body, getToken),
    test: (getToken: GetTokenFn, to?: string) => apiPost<{ detail: string }>("/api/email-config/test/", { to }, getToken),
  },
  chatSessions: {
    list: (getToken: GetTokenFn) => apiGet<ChatSession[]>("/api/chat-sessions/", getToken),
    create: (body: { title?: string }, getToken: GetTokenFn) => apiPost<ChatSession>("/api/chat-sessions/", body, getToken),
    ask: (id: string, content: string, getToken: GetTokenFn, documentId?: string) =>
      apiPost<ChatMessage>(`/api/chat-sessions/${id}/ask/`, { content, document_id: documentId }, getToken),
  },
  me: {
    get: (getToken: GetTokenFn) => apiGet<CurrentUser>("/api/me/", getToken),
  },
  admin: {
    stats: (getToken: GetTokenFn) => apiGet<AdminStats>("/api/admin/stats/", getToken),
    auditLogs: (getToken: GetTokenFn) => apiGet<AuditLogEntry[]>("/api/audit-logs/", getToken),
  },
  backoffice: {
    stats: (getToken: GetTokenFn) => apiGet<PlatformStats>("/api/backoffice/stats/", getToken),
    clients: (getToken: GetTokenFn, q?: string) =>
      apiGet<ClientSummary[]>(`/api/backoffice/clients/${q ? `?q=${encodeURIComponent(q)}` : ""}`, getToken),
    client: (id: string, getToken: GetTokenFn) => apiGet<ClientDetail>(`/api/backoffice/clients/${id}/`, getToken),
    payments: (id: string, getToken: GetTokenFn) => apiGet<ClientPayment[]>(`/api/backoffice/clients/${id}/payments/`, getToken),
    changePlan: (id: string, plan: string, getToken: GetTokenFn) =>
      apiPost<{ plan: string; status: string }>(`/api/backoffice/clients/${id}/change-plan/`, { plan }, getToken),
    cancel: (id: string, getToken: GetTokenFn, atPeriodEnd = true) =>
      apiPost<{ status: string; cancel_at_period_end: boolean }>(`/api/backoffice/clients/${id}/cancel/`, { at_period_end: atPeriodEnd }, getToken),
    reactivate: (id: string, getToken: GetTokenFn) =>
      apiPost<{ status: string }>(`/api/backoffice/clients/${id}/reactivate/`, {}, getToken),
    refund: (id: string, body: { payment_intent: string; amount?: number }, getToken: GetTokenFn) =>
      apiPost<{ id: string; status: string; amount: number; currency: string }>(`/api/backoffice/clients/${id}/refund/`, body, getToken),
  },
  members: {
    list: (getToken: GetTokenFn) => apiGet<OrgUser[]>("/api/members/", getToken),
  },
  plans: {
    // Public — used by the marketing/landing page (no auth).
    list: () => apiGet<{ plans: PlanCatalogItem[] }>("/api/plans/", () => Promise.resolve(null)),
  },
  usage: {
    get: (getToken: GetTokenFn) => apiGet<Usage>("/api/usage/", getToken),
  },
  billing: {
    get: (getToken: GetTokenFn) => apiGet<BillingState>("/api/billing/", getToken),
    checkout: (plan: PlanKey, getToken: GetTokenFn) => apiPost<{ url: string }>("/api/billing/checkout/", { plan }, getToken),
    portal: (getToken: GetTokenFn) => apiPost<{ url: string }>("/api/billing/portal/", {}, getToken),
  },
};
