import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { VoiceProfileId } from "../constants/voiceProfiles";
import { getBiometricPolicy, getCredentialForUser } from "../services/biometric/mockBiometricService";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "pathologist" | "admin";
  initials: string;
  voiceProfile: VoiceProfileId;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  loading: boolean;
  showBiometricWizard: boolean;
  setShowBiometricWizard: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showBiometricWizard, setShowBiometricWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = "pathscribe-user";

  const saveUser = (userData: User | null) => {
    if (userData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setUser(userData);
  };

  const shouldShowBiometricWizard = (userId: string): boolean => {
    try {
      const policy = getBiometricPolicy();
      if (!policy.enabled) return false;
      const credential = getCredentialForUser(userId);
      return credential === null;
    } catch {
      return false;
    }
  };

  // Resolve extra fields from userService (canViewPediatric, credentials)
  // Option C: canViewPediatric lives on the StaffUser record, not the role
  const resolveStaffFields = async (userId: string): Promise<{ canViewPediatric: boolean; credentials?: string }> => {
    try {
      const { userService } = await import('../services');
      const res = await userService.getAll();
      if (res.ok) {
        const staffUser = res.data.find((u: any) => u.id === userId);
        if (staffUser) {
          return {
            canViewPediatric: staffUser.canViewPediatric ?? false,
            credentials: staffUser.credentials ?? undefined,
          };
        }
      }
    } catch { /* non-critical — fail safe */ }
    return { canViewPediatric: false };
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      let authenticatedUser: User | null = null;

      // Normalize input - trim whitespace and lowercase email
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      // Hardcoded credentials for demo/testing (fallback)
      const credentials = [
        { email: "demo@pathscribe.ai", password: "xyxRnJrIu64nsi0KqPn-", id: "PATH-001", name: "Dr. Sarah Johnson", role: "pathologist", initials: "SJ", voiceProfile: "EN-US" },
        { email: "admin@pathscribe.ai", password: "ZBs=inBiC6^N*XYwH3v^", id: "u3", name: "System Admin", role: "admin", initials: "SA", voiceProfile: "EN-US" },
        { email: "paul.carter@mft.nhs.uk", password: "Pathscribe_TempPass2026!", id: "PATH-UK-001", name: "Paul Carter", role: "pathologist", initials: "PC", voiceProfile: "EN-GB" },
        { email: "oliver.pemberton@mft.nhs.uk", password: "xyxRnJrIu64nsi0KqPn-", id: "PATH-UK-002", name: "Dr. Oliver Pemberton", role: undefined, initials: "OP", voiceProfile: "EN-GB" },
        { email: "amber.fehrs@demo.pathscribe.ai", password: "One_Amazing_Person!", id: "PATH-US-001", name: "Amber Fehrs-Battey", role: "pathologist", initials: "AF", voiceProfile: "EN-US" },
        { email: "mark.tuthill@hfhs-demo.pathscribe.ai", password: "One_Amazing_Doctor!", id: "PATH-US-002", name: "Dr. J. Mark Tuthill", role: "pathologist", initials: "MT", voiceProfile: "EN-US" },
      ];

      // Find matching credential
      const cred = credentials.find(c => c.email.toLowerCase() === normalizedEmail && c.password === normalizedPassword);
      
      if (cred) {
        authenticatedUser = {
          id: cred.id,
          name: cred.name,
          email: email,
          role: cred.role || "pathologist",
          initials: cred.initials,
          voiceProfile: cred.voiceProfile as any,
        };
      }

      // Debug
      console.log('[Auth Login]', { email: normalizedEmail, passwordLen: normalizedPassword.length, found: !!cred });

      if (!authenticatedUser) return false;

      // Resolve canViewPediatric and credentials from StaffUser record (Option C)
      const staffFields = await resolveStaffFields(authenticatedUser.id);
      Object.assign(authenticatedUser, staffFields);

      saveUser(authenticatedUser);

      if (shouldShowBiometricWizard(authenticatedUser.id)) {
        setTimeout(() => setShowBiometricWizard(true), 800);
      }

      return true;
    } catch (e) {
      console.error("Login error:", e);
      return false;
    }
  };

  const logout = () => saveUser(null);

  const updateUserProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      saveUser(updatedUser);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      // No stored session — show login immediately
      setLoading(false);
      return;
    }

    const restoreSession = async () => {
      try {
        const parsed = JSON.parse(stored);

        // Ensure voiceProfile always has a fallback
        if (!parsed.voiceProfile) parsed.voiceProfile = 'EN-US';

        // Resolve canViewPediatric if missing from stored session
        if (parsed.canViewPediatric === undefined) {
          const fields = await resolveStaffFields(parsed.id);
          Object.assign(parsed, fields);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }

        setUser({ ...parsed });
      } catch (e) {
        console.error('Failed to restore session:', e);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        // Always clear loading — whether restore succeeded or failed
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        showBiometricWizard,
        setShowBiometricWizard,
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
