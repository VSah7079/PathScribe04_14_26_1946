/**
 * contexts/MessagingContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides global messaging state (unread count, urgent flag, drawer open)
 * so any page can show the messaging button and badge without duplicating logic.
 *
 * Usage:
 *   1. Wrap your app in <MessagingProvider> (inside AuthProvider in App.tsx)
 *   2. Call useMessaging() in any component to get/set messaging state
 *
 * Batch 560: the inbox is kept current by the live-update hub (topic
 * `messages`, hooks/useLiveData.ts). Because this provider is mounted for the
 * whole app, every signed-in (SSO) user's window holds one hub connection while
 * the hub is configured (one connection per window, LIVE_UPDATES_SIGNALR.md
 * §14), and the connection banner reflects the hub's state for everyone.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { messageService } from '../services';
import { useAuth } from './AuthContext';
import type { Message } from '../services';
import { isUnreadFor } from '../services/messages/messageUnread';
import { getSessionFlag, setSessionFlag } from '@/utils/uiPreferences';
import { playAlertTone } from '@/utils/alertTone';
import { useLiveData } from '@/hooks/useLiveData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessagingContextType {
  messages:       Message[];
  unreadCount:    number;
  hasUrgent:      boolean;
  portalOpen:     boolean;
  setPortalOpen:  (open: boolean) => void;
  reloadInbox:    () => Promise<void>;
  setMessages:    React.Dispatch<React.SetStateAction<Message[]>>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId   = user?.id ?? '';

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [portalOpen,  setPortalOpenRaw] = useState(
    () => getSessionFlag('ps_drawer_open') === 'true'
  );

  // Batch 669f (everyday-1): a person's own sent message or reply is never unread for them.
  const unreadCount = messages.filter(m => isUnreadFor(m, userId)).length;
  const hasUrgent   = messages.some(m => m.isUrgent && isUnreadFor(m, userId));

  const setPortalOpen = (open: boolean) => {
    setSessionFlag('ps_drawer_open', String(open));
    setPortalOpenRaw(open);
  };

  // Batch 396: the inbox belongs to whoever is signed in now. On sign-out
  // (or a switch to another account) the previous person's messages are
  // cleared at once, and a reply that arrives for an account no longer
  // signed in is dropped. Before this, signing out left the last inbox in
  // place, so the next person could briefly see it.
  const currentUserRef = useRef(userId);
  currentUserRef.current = userId;
  useEffect(() => { setMessages([]); }, [userId]);

  const reloadInbox = useCallback(async () => {
    if (!userId) return;
    const result = await messageService.getInbox(userId);
    if (currentUserRef.current !== userId) return;
    if (result.ok) setMessages(result.data);
  }, [userId]);

  // Load on mount and when user changes
  useEffect(() => { reloadInbox(); }, [reloadInbox]);

  // New messages from other users. Batch 560: pushed by the live-update hub (topic `messages`, sent to
  // the recipient only) with a minute's safety poll; without a live connection, every 20 seconds as before.
  useLiveData(reloadInbox, { topic: 'messages', pollMs: 20_000, enabled: !!userId });

  // Also reload when the tab becomes visible again (user switches back to PathScribe)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') reloadInbox(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reloadInbox]);

  // Urgent audio alert. Batch 503 (PS-474): made in the browser (utils/alertTone.ts),
  // no longer downloaded from actions.google.com.
  useEffect(() => {
    if (hasUrgent) playAlertTone();
  }, [hasUrgent]);

  return (
    <MessagingContext.Provider value={{
      messages,
      unreadCount,
      hasUrgent,
      portalOpen,
      setPortalOpen,
      reloadInbox,
      setMessages,
    }}>
      {children}
    </MessagingContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used within MessagingProvider');
  return ctx;
}
