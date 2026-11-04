import { describe, it, expect, vi, afterEach } from 'vitest';
vi.mock('firebase/firestore', () => ({ getDocs: vi.fn(), query: vi.fn(), collection: vi.fn(), where: vi.fn(), orderBy: vi.fn() }));
vi.mock('@/firebase', () => ({ db: {} }));
import { setFirebaseConfiguredForTests, isFirebaseConfigured } from '@/firebase/isFirebaseConfigured';
import { fetchEngraverDevices, engraversAreSimulated } from './fetchEngraverDevices';
import { fetchDispatchHistoryForCase } from './fetchDispatchHistoryForCase';

afterEach(() => setFirebaseConfiguredForTests(null));

describe('engravers without Firebase', () => {
  it('placeholder key is not configured; real key is', () => {
    setFirebaseConfiguredForTests(null);
    expect(isFirebaseConfigured('YOUR_API_KEY')).toBe(true); // test mode default
    setFirebaseConfiguredForTests(false);
    expect(isFirebaseConfigured()).toBe(false);
  });
  it('seeds devices in all five statuses, across two organisations', async () => {
    setFirebaseConfiguredForTests(false);
    const list = await fetchEngraverDevices();
    expect(engraversAreSimulated()).toBe(true);
    expect(new Set(list.map(d => d.status))).toEqual(new Set(['online', 'engraving', 'warning', 'fault', 'offline']));
    expect(new Set(list.map(d => d.organisationId)).size).toBe(2);
    expect(list.every(d => d.sourceSystem === 'Simulated')).toBe(true);
  });
  it('seeds dispatch history newest-first for the case', async () => {
    setFirebaseConfiguredForTests(false);
    const h = await fetchDispatchHistoryForCase('C-1');
    expect(h.length).toBe(3);
    expect(h[0].eventType).toBe('block-exception');
  });
});
