// True when firebase/config.ts holds real credentials. The shipped placeholder key means no Firebase project
// is connected yet, so screens that read Firestore show clearly-labelled simulated data instead of an error.
export const PLACEHOLDER_FIREBASE_API_KEY = 'YOUR_API_KEY';
let override: boolean | null = null;
export function setFirebaseConfiguredForTests(v: boolean | null): void { override = v; }
export function isFirebaseConfigured(apiKey: string = PLACEHOLDER_FIREBASE_API_KEY): boolean {
  if (override !== null) return override;
  if (import.meta.env.MODE === 'test') return true;
  return apiKey !== PLACEHOLDER_FIREBASE_API_KEY;
}
