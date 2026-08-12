export * from './serviceResult';
<<<<<<< HEAD
=======

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'pathologist' | 'admin' | 'lab-tech';
  initials?: string;
  voiceProfile?: string;
  // This is what's missing and causing the AuthContext errors:
  credentials?: {
    email?: string;
    password?: string;
  };
  participationTypeIds?: string[]; // Adding this here will also fix those other 20+ errors!
}

>>>>>>> upstream/main
export interface VoiceMacro {
  id: string;
  keyword: string;
  expansion: string;
<<<<<<< HEAD
  category?: 'gross' | 'micro' | 'general'; // Optional: helps organize macros later
=======
  category?: 'gross' | 'micro' | 'general';
>>>>>>> upstream/main
}
// As you add more types (like VoiceMacro or AIConfig), add them here:
// export * from './voiceMacros';
