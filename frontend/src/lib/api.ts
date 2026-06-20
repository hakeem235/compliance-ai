/**
 * Typed fetch wrapper for the ComplianceAI Django/DRF backend.
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: unknown[];
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
  members: {
    list: (getToken: GetTokenFn) => apiGet<OrgUser[]>("/api/members/", getToken),
  },
};
