import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

export const PROFILE_LOGO_STORAGE_KEY = 'dashboard-profile-logo';
const STORAGE_KEY = PROFILE_LOGO_STORAGE_KEY;

interface ProfileLogoContextValue {
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
}

const ProfileLogoContext = createContext<ProfileLogoContextValue | null>(null);

export function getStoredProfileLogo(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && stored.startsWith('data:') ? stored : null;
  } catch {
    return null;
  }
}

export function ProfileLogoProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrlState] = useState<string | null>(getStoredProfileLogo);

  const setLogoUrl = useMemo(
    () => (url: string | null) => {
      setLogoUrlState(url);
      try {
        if (url) localStorage.setItem(STORAGE_KEY, url);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    },
    []
  );

  const value = useMemo(() => ({ logoUrl, setLogoUrl }), [logoUrl, setLogoUrl]);

  return (
    <ProfileLogoContext.Provider value={value}>
      {children}
    </ProfileLogoContext.Provider>
  );
}

export function useProfileLogo(): ProfileLogoContextValue {
  const ctx = useContext(ProfileLogoContext);
  if (!ctx) throw new Error('useProfileLogo must be used within ProfileLogoProvider');
  return ctx;
}
