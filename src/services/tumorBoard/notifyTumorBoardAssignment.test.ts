// @vitest-environment happy-dom
// src/services/tumorBoard/notifyTumorBoardAssignment.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TumorBoardListing } from './ITumorBoardService';

const { getByIdMock, sendMessageMock, sendEmailMock } = vi.hoisted(() => ({
  // Loosely typed (vitest mocks don't need to match the real service
  // signature exactly) — each test supplies its own mockImplementation.
  getByIdMock: vi.fn((_id: string): Promise<{ ok: boolean; data?: unknown; error?: string }> => Promise.resolve({ ok: true, data: {} })),
  sendMessageMock: vi.fn((_message: Record<string, unknown>) => Promise.resolve({ ok: true as const, data: {} as never })),
  sendEmailMock: vi.fn((_payload: Record<string, unknown>) => Promise.resolve(true)),
}));

vi.mock('../users/mockUserService', () => ({
  mockUserService: { getById: getByIdMock },
}));
vi.mock('../messages/mockMessageService', () => ({
  mockMessageService: { send: sendMessageMock },
}));
vi.mock('../communications/notificationService', () => ({
  sendEmail: sendEmailMock,
}));

const { shouldNotifyTumorBoardAssignment, notifyTumorBoardAssignment } = await import('./notifyTumorBoardAssignment');

function listing(overrides: Partial<TumorBoardListing> = {}): TumorBoardListing {
  return {
    id: 'tbl-1',
    caseId: 'case-1',
    caseAccession: 'S26-1000',
    board: 'Breast MDT',
    status: 'Pending Presentation',
    source: 'Manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: 'u1',
    createdByUserName: 'Dr A',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedByUserId: 'u1',
    updatedByUserName: 'Dr A',
    ...overrides,
  };
}

const NOW = new Date('2026-10-08T12:00:00.000Z');

describe('shouldNotifyTumorBoardAssignment', () => {
  it('is false with no presenter', () => {
    expect(shouldNotifyTumorBoardAssignment(undefined, listing({ meetingDate: '2026-12-01' }), NOW, 'UTC')).toBe(false);
  });

  it('is false with no meeting date', () => {
    expect(shouldNotifyTumorBoardAssignment(undefined, listing({ presenterUserId: 'u2' }), NOW, 'UTC')).toBe(false);
  });

  it('is false when the meeting date/time has already passed', () => {
    const updated = listing({ presenterUserId: 'u2', meetingDate: '2026-10-01', meetingTime: '09:00' });
    expect(shouldNotifyTumorBoardAssignment(undefined, updated, NOW, 'UTC')).toBe(false);
  });

  it('is true for a new future assignment (no previous listing)', () => {
    const updated = listing({ presenterUserId: 'u2', meetingDate: '2026-12-01', meetingTime: '09:00' });
    expect(shouldNotifyTumorBoardAssignment(undefined, updated, NOW, 'UTC')).toBe(true);
  });

  it('is false when re-saved with nothing about the presenter or schedule actually changed', () => {
    const previous = listing({ presenterUserId: 'u2', meetingDate: '2026-12-01', meetingTime: '09:00', status: 'Pending Presentation' });
    const updated = { ...previous, status: 'Deferred' as const };
    expect(shouldNotifyTumorBoardAssignment(previous, updated, NOW, 'UTC')).toBe(false);
  });

  it('is true on a reschedule (meeting time changed) even with the same presenter', () => {
    const previous = listing({ presenterUserId: 'u2', meetingDate: '2026-12-01', meetingTime: '09:00' });
    const updated = { ...previous, meetingTime: '14:00' };
    expect(shouldNotifyTumorBoardAssignment(previous, updated, NOW, 'UTC')).toBe(true);
  });

  it('is true when the presenter changes on an already-scheduled listing', () => {
    const previous = listing({ presenterUserId: 'u2', meetingDate: '2026-12-01', meetingTime: '09:00' });
    const updated = { ...previous, presenterUserId: 'u3' };
    expect(shouldNotifyTumorBoardAssignment(previous, updated, NOW, 'UTC')).toBe(true);
  });

  it('treats a date-only (no time) future meeting as not-yet-passed through end of that day', () => {
    // "Today" at noon UTC; meeting today with no time set defaults to 23:59 for this check.
    const updated = listing({ presenterUserId: 'u2', meetingDate: '2026-10-08' });
    expect(shouldNotifyTumorBoardAssignment(undefined, updated, NOW, 'UTC')).toBe(true);
  });
});

describe('notifyTumorBoardAssignment', () => {
  beforeEach(() => {
    getByIdMock.mockReset();
    sendMessageMock.mockClear();
    sendEmailMock.mockClear();
  });

  it('sends the in-app message and an email with an .ics attachment when the presenter has an email', async () => {
    getByIdMock.mockImplementation(async (id: string) => {
      if (id === 'u2') return { ok: true, data: { id: 'u2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' } };
      return { ok: true, data: { id: 'u1', firstName: 'A', lastName: 'Smith', email: 'a.smith@example.com' } };
    });
    const updated = listing({ presenterUserId: 'u2', meetingDate: '2026-12-01', meetingTime: '09:00' });

    await notifyTumorBoardAssignment(updated, 'u1', 'Dr A. Smith', 'America/Phoenix');

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock.mock.calls[0][0]).toMatchObject({ recipientId: 'u2', caseNumber: 'S26-1000' });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const emailPayload = sendEmailMock.mock.calls[0][0] as {
      to: string[];
      attachments: { filename: string; contentType: string }[];
    };
    expect(emailPayload.to).toEqual(['jane@example.com']);
    expect(emailPayload.attachments).toHaveLength(1);
    expect(emailPayload.attachments[0].filename).toBe('tumor-board-meeting.ics');
    expect(emailPayload.attachments[0].contentType).toContain('text/calendar');
  });

  it('still sends the in-app message, but skips the email, when the presenter has no email on file', async () => {
    getByIdMock.mockImplementation(async (id: string) => {
      if (id === 'u2') return { ok: true, data: { id: 'u2', firstName: 'Jane', lastName: 'Doe', email: '' } };
      return { ok: true, data: { id: 'u1', firstName: 'A', lastName: 'Smith', email: 'a.smith@example.com' } };
    });
    const updated = listing({ presenterUserId: 'u2', meetingDate: '2026-12-01', meetingTime: '09:00' });

    await notifyTumorBoardAssignment(updated, 'u1', 'Dr A. Smith', 'America/Phoenix');

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('never throws when the presenter lookup fails — fire-and-forget-safe, same contract as sendEmail()', async () => {
    getByIdMock.mockResolvedValue({ ok: false, error: 'not found' });
    const updated = listing({ presenterUserId: 'u2', meetingDate: '2026-12-01', meetingTime: '09:00' });

    await expect(notifyTumorBoardAssignment(updated, 'u1', 'Dr A. Smith', 'America/Phoenix')).resolves.toBeUndefined();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
