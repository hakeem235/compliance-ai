"use client";

/**
 * App auth — email/password + app-issued JWT (replaces Clerk).
 *
 * Exposes a Clerk-compatible surface (useAuth/useUser/useClerk, SignedIn/
 * SignedOut, SignInButton/SignUpButton, UserButton) so the rest of the app
 * keeps its existing call sites; only the import source changed from
 * "@clerk/nextjs" to "@/components/auth". The token lives in localStorage and is
 * attached as a Bearer header by lib/api via the injected getToken().
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

const TOKEN_KEY = "moutabaq_token";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member" | "legal_reviewer";
  organization: string;
  organization_name: string;
  is_platform_admin: boolean;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name: string; organizationName: string }) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export class AuthError extends Error {}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const applyToken = useCallback((next: string | null) => {
    tokenRef.current = next;
    setToken(next);
    if (typeof window !== "undefined") {
      if (next) window.localStorage.setItem(TOKEN_KEY, next);
      else window.localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  // On mount: restore a stored token and hydrate the user from /api/me.
  useEffect(() => {
    const stored = readToken();
    if (!stored) {
      setIsLoaded(true);
      return;
    }
    tokenRef.current = stored;
    setToken(stored);
    fetch(`${API_BASE_URL}/api/me/`, { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((u: AuthUser) => setUser(u))
      .catch(() => {
        // Stale/invalid token — clear it so the user is treated as signed out.
        tokenRef.current = null;
        setToken(null);
        if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const getToken = useCallback(async () => tokenRef.current ?? readToken(), []);

  const handleAuthResponse = useCallback(
    async (res: Response) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new AuthError(body?.detail || "Authentication failed.");
      }
      applyToken(body.token);
      setUser(body.user);
    },
    [applyToken]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      await handleAuthResponse(res);
    },
    [handleAuthResponse]
  );

  const register = useCallback(
    async (input: { email: string; password: string; name: string; organizationName: string }) => {
      const res = await fetch(`${API_BASE_URL}/api/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          name: input.name,
          organization_name: input.organizationName,
        }),
      });
      await handleAuthResponse(res);
    },
    [handleAuthResponse]
  );

  const signOut = useCallback(() => {
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isLoaded,
      isSignedIn: Boolean(token),
      getToken,
      login,
      register,
      signOut,
    }),
    [token, user, isLoaded, getToken, login, register, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>.");
  return ctx;
}

// --- Clerk-compatible hooks -------------------------------------------------

export function useAuth() {
  const { getToken, isLoaded, isSignedIn, user, login, register, signOut } = useAuthContext();
  return { getToken, isLoaded, isSignedIn, userId: user?.id ?? null, login, register, signOut };
}

export function useUser() {
  const { user, isLoaded, isSignedIn } = useAuthContext();
  const mapped = user
    ? {
        fullName: user.name,
        primaryEmailAddress: { emailAddress: user.email },
        imageUrl: null as string | null,
        ...user,
      }
    : null;
  return { user: mapped, isLoaded, isSignedIn };
}

export function useClerk() {
  const { signOut } = useAuthContext();
  // openUserProfile/openOrganizationProfile existed on Clerk; kept as no-ops so
  // legacy call sites don't throw (in-app profile management replaces them).
  return { signOut, openUserProfile: () => {}, openOrganizationProfile: () => {} };
}

// --- Clerk-compatible components --------------------------------------------

export function SignedIn({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuthContext();
  return isLoaded && isSignedIn ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuthContext();
  return isLoaded && !isSignedIn ? <>{children}</> : null;
}

export function SignInButton({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <span onClick={() => router.push("/login")} style={{ display: "contents", cursor: "pointer" }}>
      {children}
    </span>
  );
}

export function SignUpButton({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <span onClick={() => router.push("/register")} style={{ display: "contents", cursor: "pointer" }}>
      {children}
    </span>
  );
}

export function UserButton() {
  const { user, signOut } = useAuthContext();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initials = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  function handleSignOut() {
    setOpen(false);
    signOut();
    router.push("/");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground"
        aria-label="Account menu"
      >
        {initials}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-50 mt-2 w-44 rounded-[10px] border border-border bg-popover p-1 shadow-lg">
            <div className="px-3 py-2 text-[12px] text-muted-foreground">{user?.email}</div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2 text-[13px] text-foreground hover:bg-muted"
            >
              <LogOut className="size-[15px]" />
              Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Client guard for protected (dashboard) routes — redirects to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/login");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  return <>{children}</>;
}
