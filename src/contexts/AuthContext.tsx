import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { VoiceProfileId } from "../constants/voiceProfiles";

// 1. Defined the User with the new linguistic property
export interface User {
  id: string;
  name: string;
  email: string;
  role: "pathologist" | "admin" | "SystemAdmin";
  initials: string;
  voiceProfile: VoiceProfileId; // Required to ensure the VoiceProvider always has a value
  roles?: string[];
  locale?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => void; // New: update state without logout
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FALLBACK_DEMO_EMAIL = "demo@pathscribe.ai";
const FALLBACK_DEMO_PASS = "xyxRnJrIu64nsi0KqPn-";
const FALLBACK_ADMIN_EMAIL = "admin@pathscribe.ai";
const FALLBACK_ADMIN_PASS = "ZBs=inBiC6^N*XYwH3v^";
const FALLBACK_UK_DEMO_EMAIL = "paul.carter@mft.nhs.uk";
const FALLBACK_UK_DEMO_PASS = "Pathscribe_TempPass2026!";

const resolveCredential = (value: string | undefined, fallback: string) => (value?.trim() || fallback);

const normalizeUser = (userData: User): User => ({
  ...userData,
  roles:
    userData.roles ??
    (userData.role === "admin" || userData.role === "SystemAdmin"
      ? ["SystemAdmin"]
      : userData.role === "pathologist"
      ? ["Pathologist"]
      : []),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = "pathscribe-user";

  // Helper to sync state and storage
  const saveUser = (userData: User | null) => {
    if (userData) {
      const normalized = normalizeUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      setUser(normalized);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let authenticatedUser: User | null = null;
        const enteredEmail = email.trim();
        const enteredPassword = password.trim();
        const demoEmail = resolveCredential(import.meta.env.VITE_DEMO_EMAIL, FALLBACK_DEMO_EMAIL);
        const demoPass = resolveCredential(import.meta.env.VITE_DEMO_PASS, FALLBACK_DEMO_PASS);
        const adminEmail = resolveCredential(import.meta.env.VITE_ADMIN_EMAIL, FALLBACK_ADMIN_EMAIL);
        const adminPass = resolveCredential(import.meta.env.VITE_ADMIN_PASS, FALLBACK_ADMIN_PASS);
        const ukDemoEmail = resolveCredential(import.meta.env.VITE_UK_DEMO_EMAIL, FALLBACK_UK_DEMO_EMAIL);
        const ukDemoPass = resolveCredential(import.meta.env.VITE_UK_DEMO_PASS, FALLBACK_UK_DEMO_PASS);

        // Mock Login Data with Voice Profiles
        if (enteredEmail === demoEmail && enteredPassword === demoPass) {
          authenticatedUser = {
            id: "PATH-001",
            name: "Dr. Sarah Johnson",
            email: demoEmail,
            role: "pathologist",
            initials: "SJ",
            voiceProfile: "EN-US",
            roles: ["Pathologist"],
          };
        } else if (enteredEmail === adminEmail && enteredPassword === adminPass) {
          authenticatedUser = {
            id: "u3",
            name: "System Admin",
            email: adminEmail,
            role: "admin",
            initials: "SA",
            voiceProfile: "EN-US",
            roles: ["SystemAdmin"],
          };
        } else if (enteredEmail === ukDemoEmail && enteredPassword === ukDemoPass) {
          authenticatedUser = {
            id: "PATH-UK-001",
            name: "Paul Carter",
            email: ukDemoEmail,
            role: "pathologist",
            initials: "PC",
            voiceProfile: "EN-GB",
            locale: "en-GB",
            roles: ["Pathologist"],
          } as any;
        } else if (enteredEmail === "oliver.pemberton@mft.nhs.uk" && enteredPassword === demoPass) {
          // UK Demo — Dr. Oliver Pemberton, no role assigned (security testing)
          authenticatedUser = {
            id: "PATH-UK-002",
            name: "Dr. Oliver Pemberton",
            email: "oliver.pemberton@mft.nhs.uk",
            role: undefined,
            initials: "OP",
            voiceProfile: "EN-GB",
            locale: "en-GB",
            roles: [],
          } as any;
        }

        if (authenticatedUser) {
          saveUser(authenticatedUser);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 500);
    });
  };

  const logout = () => saveUser(null);

  // Allow the UI (like StaffModal) to push updates to the current session
  const updateUserProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      saveUser(updatedUser);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migration check: ensure old sessions get a default profile
        if (parsed && !parsed.voiceProfile) {
          parsed.voiceProfile = "EN-US";
        }
        if (parsed && !parsed.roles && parsed.role) {
          parsed.roles =
            parsed.role === "admin" || parsed.role === "SystemAdmin"
              ? ["SystemAdmin"]
              : parsed.role === "pathologist"
              ? ["Pathologist"]
              : [];
        }
        setUser(normalizeUser(parsed));
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUserProfile,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
