import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { VoiceProfileId } from "../constants/voiceProfiles";
import { getBiometricPolicy, getCredentialForUser } from "../services/biometric/mockBiometricService";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "pathologist" | "admin" | "pathologist-admin" | "superadmin";
  initials: string;
  voiceProfile: VoiceProfileId;
  // ── Signature block fields ────────────────────────────────────────────────
  // Resolved from the StaffUser record at login (see resolveStaffFields).
  // `name` above is already a combined display string from the credentials
  // table; these additional fields let report signature blocks build a
  // precise formal name + credentials + signature image without needing
  // a separate staff lookup at sign-out time.
  credentials?: string;
  signatureUrl?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  canViewPediatric?: boolean;
  canViewOrchestration?: boolean;
  /** The tenant/organisation boundary — see StaffUser.organisationId's
   *  own doc comment (IUserService.ts) for the full reasoning. Resolved
   *  from StaffUser at login/session-restore, same as the fields above.
   *  Read by services/auth/caseAccessControl.ts directly from
   *  localStorage — the mock services aren't React components and can't
   *  use this context, so they read the same persisted session object. */
  organisationId?: string;
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

  // Resolve extra fields from userService (canViewPediatric, credentials,
  // signatureUrl, and name parts — used by report signature blocks)
  // Option C: canViewPediatric lives on the StaffUser record, not the role
  const resolveStaffFields = async (userId: string): Promise<{
    canViewPediatric: boolean;
    canViewOrchestration: boolean;
    credentials?: string;
    signatureUrl?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    organisationId?: string;
  }> => {
    try {
      const { userService } = await import('../services');
      const res = await userService.getAll();
      if (res.ok) {
        const staffUser = res.data.find((u: any) => u.id === userId);
        if (staffUser) {
          return {
            canViewPediatric:     staffUser.canViewPediatric ?? false,
            canViewOrchestration: (staffUser as any).canViewOrchestration ?? false,
            credentials:      staffUser.credentials ?? undefined,
            signatureUrl:     staffUser.signatureUrl ?? undefined,
            firstName:        staffUser.firstName ?? undefined,
            middleName:       (staffUser as any).middleName ?? undefined,
            lastName:         staffUser.lastName ?? undefined,
            organisationId:   (staffUser as any).organisationId ?? undefined,
          };
        }
      }
    } catch { /* non-critical — fail safe */ }
    // Fail-safe default: no organisationId resolved means no case access
    // (deny by default) rather than silently falling back to some default
    // tenant — matches the same "fail safe, not fail open" posture as
    // canViewPediatric/canViewOrchestration defaulting to false above.
    return { canViewPediatric: false, canViewOrchestration: false };
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      let authenticatedUser: User | null = null;

      // Normalize input - trim whitespace and lowercase email
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      // Hardcoded credentials for demo/testing (fallback)
      // Role guide:
      //   "pathologist"       → clinical cases + reporting only
      //   "admin"             → configuration + user management only
      //   "pathologist-admin" → both (route guards should treat as both)
      const credentials = [
        { email: "pete.nimmo@pathscribe.ai",           password: "xyxRnJrIu64nsi0KqPn-",   id: "PATH-001",    name: "Pete Nimmo",           role: "superadmin"  as const, initials: "PN", voiceProfile: "EN-US" },
        { email: "demo@pathscribe.ai",                 password: "xyxRnJrIu64nsi0KqPn-",   id: "PATH-001",    name: "Pete Nimmo",           role: "superadmin"  as const, initials: "PN", voiceProfile: "EN-US" },
        { email: "sarah.johnson@demo.pathscribe.ai",   password: "xyxRnJrIu64nsi0KqPn-",   id: "PATH-SJ-001", name: "Dr. Sarah Johnson",    role: "superadmin"  as const, initials: "SJ", voiceProfile: "EN-US" },
        { email: "admin@pathscribe.ai",                password: "ZBs=inBiC6^N*XYwH3v^",   id: "u3",          name: "System Admin",         role: "superadmin"  as const, initials: "SA", voiceProfile: "EN-US" },
        { email: "paul.carter@mft.nhs.uk",             password: "Pathscribe_TempPass2026!", id: "PATH-UK-001", name: "Paul Carter",          role: "superadmin"  as const, initials: "PC", voiceProfile: "EN-GB" },
        { email: "bronwyn.prior@mft.nhs.uk",           password: "Pathscribe_Welcome2026!",  id: "PATH-UK-003", name: "Bronwyn Prior",        role: "superadmin"  as const, initials: "BP", voiceProfile: "EN-GB" },
        { email: "oliver.pemberton@mft.nhs.uk",        password: "xyxRnJrIu64nsi0KqPn-",   id: "PATH-UK-002", name: "Dr. Oliver Pemberton", role: "superadmin"  as const, initials: "OP", voiceProfile: "EN-GB" },
        { email: "amber.fehrs@demo.pathscribe.ai",     password: "One_Amazing_Person!",      id: "PATH-US-001", name: "Amber Fehrs-Battey",   role: "superadmin"  as const, initials: "AF", voiceProfile: "EN-US" },
        { email: "mark.tuthill@hfhs-demo.pathscribe.ai", password: "One_Amazing_Doctor!",   id: "PATH-US-002", name: "Dr. J. Mark Tuthill",  role: "superadmin"         as const, initials: "MT", voiceProfile: "EN-US" },
        // ── UX Review account — full pathologist + admin access ──────────────────
        { email: (import.meta.env.VITE_BABAKHANI_EMAIL ?? "rossana.babakhani@pathscribe.ai").toLowerCase(),
                                                            password: "Review_PathScribe_2026!", id: "PATH-RB-001", name: "Rossana Babakhani",     role: "superadmin"        as const, initials: "RB", voiceProfile: "EN-US" },
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

        // Resolve canViewPediatric/canViewOrchestration/organisationId if
        // missing from stored session (covers a brand-new field on an old
        // stored session). organisationId is included here deliberately —
        // without it, a session logged in before this change would keep
        // its old canViewPediatric/canViewOrchestration and never get
        // organisationId backfilled, silently locking that session out of
        // all case access until a fresh login.
        if (parsed.canViewPediatric === undefined || parsed.canViewOrchestration === undefined || parsed.organisationId === undefined) {
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


// ── Role helper — use this in route guards instead of strict equality ─────────
// Handles "pathologist-admin" transparently alongside single roles.
export function roleHas(user: User | null, check: "pathologist" | "admin"): boolean {
  if (!user) return false;
  if (user.role === "pathologist-admin") return true;
  return user.role === check;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
