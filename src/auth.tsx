import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, setUnauthorizedHandler } from './api';
import { ApiError } from './errors';
import { useLanguage } from './i18n';
import type { AuthUser, SessionResponse } from './types';

/** A signed-in session issued by the Rfoof API. `expires_at` is a Unix time in milliseconds. */
export type Session = {
  access_token: string;
  expires_at: number;
  user: AuthUser;
};

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (response: SessionResponse) => void;
  signOut: () => void;
};

const STORAGE_KEY = 'rfoof.session';
const MAX_TIMEOUT_MS = 2_147_483_647;

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  signIn: () => undefined,
  signOut: () => undefined,
});

function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.access_token || !parsed.user?.id || typeof parsed.expires_at !== 'number') return null;
    return parsed.expires_at > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Storage can be unavailable (private mode); the session then lasts for this tab only. */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateSession = useCallback((next: Session | null) => {
    writeStoredSession(next);
    setSession(next);
  }, []);

  const signIn = useCallback((response: SessionResponse) => {
    updateSession({
      access_token: response.access_token,
      expires_at: Date.now() + response.expires_in * 1000,
      user: response.user,
    });
  }, [updateSession]);

  const signOut = useCallback(() => updateSession(null), [updateSession]);

  // Restore the saved session, then confirm with the API that it is still valid.
  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) writeStoredSession(null);
    setSession(stored);
    setIsLoading(false);
    if (!stored) return;

    let active = true;
    api.auth.me(stored.access_token)
      .then((user) => { if (active) updateSession({ ...stored, user }); })
      .catch((reason) => { if (active && reason instanceof ApiError && reason.status === 401) updateSession(null); });
    return () => { active = false; };
  }, [updateSession]);

  // Any authenticated API call rejected with 401 means the session is no longer valid.
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Sign out locally when the token expires.
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(signOut, Math.min(Math.max(session.expires_at - Date.now(), 0), MAX_TIMEOUT_MS));
    return () => window.clearTimeout(timer);
  }, [session, signOut]);

  // Keep tabs in sync when the user signs in or out elsewhere.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setSession(readStoredSession());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ session, isLoading, signIn, signOut }), [session, isLoading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="px-4 py-24 text-center text-ink-3" aria-live="polite">
        <span>{t('loadingSession')}</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return children;
}
