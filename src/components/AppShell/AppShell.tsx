/**
 * components/AppShell/AppShell.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global layout shell — wraps all authenticated pages.
 * Contains the shared nav bar so individual pages don't duplicate it.
 *
 * Renders:
 *   - Logo → navigates home
 *   - Breadcrumb slot (driven by current route)
 *   - 💡 Enhancement Request button
 *   - User initials badge
 *   - Quick Links button
 *   - Logout button
 *   - <Outlet /> for the active page content
 *
 * Drop-in path: src/components/AppShell/AppShell.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { OPEN_USER_GUIDE_EVENT } from '@/services/help/helpTargets';
import { useOpenCase } from '@/hooks/useOpenCase';
import { useDeliveryBackgroundWork } from '@/hooks/useDeliveryBackgroundWork';
import { useSimulatedAssistSchedule } from '@/hooks/useSimulatedAssistSchedule';
import { useReleaseBackgroundWork } from '@/hooks/useReleaseBackgroundWork';
import { SecureEmailModal } from '@/components/SecureEmail/SecureEmailModal';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import { useAuditLog } from '@/components/Audit/useAuditLog';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useLogout';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { messageService, actionRegistryService, newMessageMissing, replyMissing, messagingFieldRequired, searchRecipients, findRecipientByName, MESSAGE_NOT_PERMITTED, type MessageRecipient } from '../../services';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { formatList } from '@/utils/formatList';
import { extractCaseReferencesFromText } from '../../utils/extractCaseReferencesFromText';
import { useMessaging } from '../../contexts/MessagingContext';
import { caseRouter } from '@/services/cases/CaseRouter';
import NavBar, { SystemInfoModal } from '../NavBar/NavBar';
import ScanStationPrompt from '../ScanStationPrompt';
import StationSwitchGuardModal from '../StationSwitchGuardModal';

// Real fix, per direct report: the real Sign Out button (below) used to
// call handleLogout() directly, with no unsaved-changes check at all —
// while Home.tsx separately carried its own copy of this exact modal,
// wired to a showWarning flag nothing ever set to true. That old
// Home.tsx copy is now deleted; this is the one, real, live instance,
// gated by the same DirtyStateContext.isDirty this file's own
// guardedNavigate() already uses for breadcrumb/logo navigation.
import LogoutWarningModal from '../Common/LogoutWarningModal';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';
import { useDirtyState } from '../../contexts/DirtyStateContext';
import '../../pathscribe.css';
import './ThreadMenu.css';
import { formatDate } from '../../utils/formatDate';
import ConfirmModal from '../Common/ConfirmModal';
import { safeInternalPath } from '@/utils/safeInternalPath';
import { markReturnToSearch } from '@/utils/search/searchSession';
import { setSessionFlag, clearSessionFlag } from '@/utils/uiPreferences';
import { usePersonalLanguage } from '@/hooks/usePersonalLanguage';
import MyDictionaryModal from '@/components/Profile/MyDictionaryModal';
import MyVoiceCommandsModal from '@/components/Profile/MyVoiceCommandsModal';
import BiometricSigningModal from '@/components/Profile/BiometricSigningModal';
import { biometricFlow } from '@/services';
import { RouteErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import { clickableContainer, pressable } from '@/utils/a11y/pressable';
import { useFocusAfterRemoval } from '@/hooks/useFocusAfterRemoval';
import { LoadingState } from '@/components/Common/LoadingState';
import { canMarkUnread, compareMessageListOrder, isUnreadFor } from '@/services/messages/messageUnread';

/** Batch 396: a stable empty list, so the link memo doesn't rerun on every render. */
const NO_ACCESSIONS: string[] = [];

// ─── Internal user directory ─────────────────────────────────────────────────
// Batch 385: who a message can be addressed to comes from messageService.listRecipients()
// (it was a hard-coded list here); the searching is in services/messages/messageRecipients.ts.
type InternalUser = MessageRecipient;

const avatarInitials = (name: string) => {
  const parts = name.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').split(' ').filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0]?.[0]?.toUpperCase() ?? '?';
};


// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS — defined in this file so AppShell stays self-contained
// ═══════════════════════════════════════════════════════════════════════════

// ── Helpers shared by sub-components ────────────────────────────────────────
// Real fix, found by this app's own inline-CSS/business-logic sweep:
// this deliberately reimplements most of utils/formatDate.ts's
// formatRelative() rather than delegating to it wholesale — for a
// messaging inbox, today's messages genuinely need their actual
// time-of-day (e.g. "2:45 PM"), not formatRelative()'s generic
// "Today", so a straight swap would be a real regression here. The
// one real gap this file's own copy had was narrower: it lacked
// formatRelative()'s own >365-day fallback to a full, year-bearing
// date, so a message over a year old rendered as e.g. "Sep 12" with
// no year at all — genuinely ambiguous once a mailbox has messages
// spanning more than one year. Fixed with the same real fallback
// formatRelative() itself uses (formatDate.ts's own formatDate()),
// not a hand-rolled second copy of "how to show a full date."
export const relTime = (ts: Date | string): string => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return d.toLocaleDateString([], { weekday: 'short' });
  if (diffDays < 365) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return formatDate(d.toISOString());
};

// ── UserSearchOverlay ────────────────────────────────────────────────────────
interface UserSearchOverlayProps {
  directory: InternalUser[];
  alreadyAdded: string[];
  onSelect: (u: InternalUser) => void;
  onClose: () => void;
}
const UserSearchOverlay: React.FC<UserSearchOverlayProps> = ({ directory, alreadyAdded, onSelect, onClose }) => {
  const { t } = useTranslation();
  const [q,        setQ]        = React.useState('');
  const [pending,  setPending]  = React.useState<InternalUser[]>([]);
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { ref.current?.focus(); }, []);

  const pendingIds = pending.map(u => u.id);
  const results = searchRecipients(directory, q, alreadyAdded);

  const toggle = (u: InternalUser) => {
    setPending(prev =>
      prev.find(p => p.id === u.id) ? prev.filter(p => p.id !== u.id) : [...prev, u]
    );
  };

  const handleDone = () => {
    pending.forEach(u => onSelect(u));
    onClose();
  };

  return (
    <div className="ps-user-search-modal">
      <div className="ps-user-search-header">
        <span className="ps-user-search-title">{t('appShell.userSearch.title')}</span>
        <button className="ps-user-search-close" onClick={onClose} aria-label={t('appShell.userSearch.closeAriaLabel')}>×</button>
      </div>

      {/* Selected chips */}
      {pending.length > 0 && (
        <div className="ps-user-search-chips">
          {pending.map(u => (
            <span key={u.id} className="ps-user-search-chip">
              {u.name}
              <span {...pressable(() => toggle(u))} className="ps-user-search-chip-remove">×</span>
            </span>
          ))}
        </div>
      )}

      <div className="ps-user-search-input-wrap">
        <div className="ps-user-search-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref={ref} className="ps-user-search-input" type="text" placeholder={t('appShell.userSearch.searchPlaceholder')} value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      <div className="ps-user-search-results">
        {results.length === 0
          ? <div className="ps-user-search-empty">{t('appShell.userSearch.noResults')}</div>
          : results.map(u => {
              const sel = pendingIds.includes(u.id);
              return (
                <div key={u.id}
                  className={`ps-user-search-item${sel ? ' ps-user-search-item--selected' : ''}`}
                  {...pressable(() => toggle(u))}>
                  <div className={`ps-user-search-avatar${sel ? ' ps-user-search-avatar--selected' : ''}`}>
                    {sel ? '✓' : avatarInitials(u.name)}
                  </div>
                  <div className="ps-flex-1">
                    <div className="ps-user-search-name">{u.name}</div>
                    <div className="ps-user-search-role">{u.role}</div>
                  </div>
                  {sel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              );
            })
        }
      </div>

      <div className="ps-user-search-footer">
        <button className="ps-user-search-cancel" onClick={onClose}>{t('appShell.userSearch.cancelButton')}</button>
        <button
          className="ps-user-search-add-btn"
          onClick={handleDone}
          disabled={pending.length === 0}>
          {pending.length > 0 ? t('appShell.userSearch.addButton', { count: pending.length }) : t('appShell.userSearch.addButtonEmpty')}
        </button>
      </div>
    </div>
  );
};

// ── ComposePanel ─────────────────────────────────────────────────────────────
interface ComposePanelProps {
  directory: InternalUser[];
  /** Why the last send failed, already translated (kept so the draft isn't lost). */
  sendError?: string | null;
  recipients: InternalUser[];
  toInput: string;
  subject: string;
  body: string;
  isUrgent: boolean;
  showUserSearch: boolean;
  toDropdownOpen: boolean;
  toHighlightIdx: number;
  toInputRef: React.RefObject<HTMLInputElement>;
  onRecipientsChange: React.Dispatch<React.SetStateAction<InternalUser[]>>;
  onToInputChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onUrgentToggle: () => void;
  onToDropdownOpenChange: (v: boolean) => void;
  onToHighlightIdxChange: (v: number) => void;
  onShowUserSearch: (v: boolean) => void;
  onCancel: () => void;
  onSend: () => void;
  onSecureEmail: () => void;
}

export const ComposePanel: React.FC<ComposePanelProps> = ({
  directory, sendError, recipients, toInput, subject, body, isUrgent,
  toDropdownOpen, toHighlightIdx, toInputRef,
  onRecipientsChange, onToInputChange, onSubjectChange, onBodyChange,
  onUrgentToggle, onToDropdownOpenChange, onToHighlightIdxChange, onShowUserSearch,
  onCancel, onSend, onSecureEmail,
}) => {
  const { t, i18n } = useTranslation();
  const requirements = useFieldRequirements('messaging');
  const suggestions = React.useMemo(() => {
    const q = toInput.toLowerCase().trim();
    if (!q) return [];
    const addedIds = recipients.map(r => r.id);
    return searchRecipients(directory, q, addedIds);
  }, [toInput, recipients, directory]);

  React.useEffect(() => {
    onToDropdownOpenChange(suggestions.length > 0 && toInput.trim().length > 0);
    onToHighlightIdxChange(0);
  }, [suggestions.length, toInput, onToDropdownOpenChange, onToHighlightIdxChange]);

  const addRecipient = (u: InternalUser) => {
    onRecipientsChange(prev => [...prev, u]);
    onToInputChange('');
    onToDropdownOpenChange(false);
    toInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (toDropdownOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); onToHighlightIdxChange(Math.min(toHighlightIdx + 1, suggestions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); onToHighlightIdxChange(Math.max(toHighlightIdx - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (suggestions[toHighlightIdx]) addRecipient(suggestions[toHighlightIdx]); return; }
      if (e.key === 'Escape') { onToDropdownOpenChange(false); return; }
    }
    if (e.key === 'Backspace' && !toInput && recipients.length > 0) {
      onRecipientsChange(prev => prev.slice(0, -1));
    }
  };

  const handleBlur = () => {
    const exact = findRecipientByName(directory, toInput, recipients.map(r => r.id));
    if (exact) addRecipient(exact);
    setTimeout(() => onToDropdownOpenChange(false), 150);
  };

  // Batch 384 (PS-359): what a message needs comes from the organisation's Field Requirements.
  const missing = newMessageMissing(recipients.length, subject, body, requirements);
  // Batch 385: sending also needs message:internal:send, and a secure email message:secure-email:send (greyed out here; the service checks again).
  const { has, loading } = useCapabilities();
  const maySend = has('message:internal:send');
  const mayEmail = has('message:secure-email:send');
  const canSend = missing.length === 0 && maySend;
  const canSecureEmail = missing.length === 0 && mayEmail;
  const star = (id: string) => messagingFieldRequired(requirements, id) && <span className="ps-conf-required">*</span>;

  return (
    <div className="ps-compose-panel">
      <div className="ps-compose-body">

        {/* To: row */}
        <div className="ps-compose-row ps-compose-row--to">
          <span className="ps-compose-label">{t('appShell.compose.toLabel')} {star('messageRecipient')}</span>
          <div className="ps-compose-to-field">
            {recipients.map(r => (
              <span key={r.id} className="ps-compose-chip">
                {r.name}
                <button className="ps-compose-chip-remove" onMouseDown={e => e.preventDefault()} onClick={() => onRecipientsChange(prev => prev.filter(u => u.id !== r.id))}>×</button>
              </span>
            ))}
            <input
              ref={toInputRef}
              className="ps-compose-to-input"
              type="text"
              placeholder={recipients.length === 0 ? t('appShell.compose.toPlaceholder') : ''}
              value={toInput}
              onChange={e => onToInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              autoComplete="off"
            />
            <button className="ps-compose-search-btn" onMouseDown={e => e.preventDefault()} onClick={() => onShowUserSearch(true)} title={t('appShell.compose.browseUsersTitle')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {toDropdownOpen && (
              <div className="ps-compose-dropdown">
                {suggestions.map((u, i) => (
                  <div key={u.id} className={`ps-compose-dropdown-item${i === toHighlightIdx ? ' highlighted' : ''}`} onMouseDown={e => e.preventDefault()} {...pressable(() => addRecipient(u))}>
                    <div className="ps-compose-dropdown-avatar">{avatarInitials(u.name)}</div>
                    <div>
                      <div className="ps-compose-dropdown-name">{u.name}</div>
                      <div className="ps-compose-dropdown-role">{u.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subject */}
        <div className="ps-compose-row">
          <span className="ps-compose-label">{t('appShell.compose.subjectLabel')} {star('messageSubject')}</span>
          <input aria-label={t('appShell.compose.subjectLabel')} className="ps-compose-field-input" type="text" placeholder={t('appShell.compose.subjectPlaceholder')} value={subject} onChange={e => onSubjectChange(e.target.value)} />
        </div>

        {/* Options bar */}
        <div className="ps-compose-options">
          <button className={`ps-compose-urgent-btn${isUrgent ? ' active' : ''}`} onClick={onUrgentToggle}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill={isUrgent ? '#EF4444' : 'none'} stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {t('appShell.compose.urgentButton')}
          </button>
          <div className="ps-compose-actions">
            <button className="ps-compose-cancel-btn" onClick={onCancel}>{t('appShell.compose.cancelButton')}</button>
            <button className={`ps-compose-secure-btn${canSecureEmail ? '' : ' disabled'}`} disabled={!canSecureEmail} onClick={onSecureEmail} title={t('appShell.compose.secureEmailTitle')}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              {t('appShell.compose.secureEmailButton')}
            </button>
            <button className={`ps-compose-send-btn${canSend ? '' : ' disabled'}`} disabled={!canSend} onClick={onSend}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              {t('appShell.compose.sendButton')}
            </button>
          </div>
        </div>

        {/* Body */}
        <textarea className="ps-compose-textarea" placeholder={t('appShell.compose.bodyPlaceholder')} value={body} onChange={e => onBodyChange(e.target.value)} />
        {missing.length > 0 && (
          <p className="ps-field-still-required" role="status">
            {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.messaging.${id}`)), i18n.language) })}
          </p>
        )}
        {!maySend && !loading && <p className="ps-field-still-required" role="status">{t('appShell.messaging.notPermitted')}</p>}
        {sendError && <p className="ps-field-still-required" role="alert">{sendError}</p>}
      </div>
    </div>
  );
};

// ── MessageListPanel ─────────────────────────────────────────────────────────
interface MessageListPanelProps {
  messages: any[];
  selectedMsgId: string | null;
  hoveredMsgId: string | null;
  isEditing: boolean;
  selectedIds: string[];
  filterType: 'all' | 'deleted';
  loading: boolean;
  isComposing: boolean;
  searchText: string;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onSoftDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onSearchChange: (v: string) => void;
  onBulkMarkRead: () => void;
  onBulkDelete: () => void;
  onEmptyDeleted: () => void;
  onCompose: () => void;
  onSecureEmail: () => void;
  userId?: string;
}

/** Exported for its tests (Batch 567). */
export const MessageListPanel: React.FC<MessageListPanelProps> = ({
  messages, selectedMsgId, hoveredMsgId, isEditing, selectedIds,
  filterType, loading, isComposing, searchText,
  onHover, onSelect, onToggleCheck, onSoftDelete, onRestore, onPermanentDelete,
  onSearchChange, onBulkMarkRead, onBulkDelete, onEmptyDeleted, onCompose, onSecureEmail, userId = '',
}) => {
  const { t } = useTranslation();
  const [focusedMsgId, setFocusedMsgId] = useState<string | null>(null); // Batch 567: row with keyboard focus inside (shows its actions)
  // Batch 569: after a row's own Delete / Restore removes it with focus on it, focus goes to the next message
  // (or the one before; the list itself when none is left), not to the page.
  const listRef = useRef<HTMLDivElement>(null);
  const rememberFocus = useFocusAfterRemoval(messages.map(x => x.id), listRef, 'data-msg-open', [filterType, searchText]);
  const removeWithFocus = (e: React.MouseEvent<HTMLButtonElement>, id: string, action: (id: string) => void) => {
    e.stopPropagation();
    rememberFocus(e, id);
    action(id);
  };
  return (
  <div className="ps-msg-sidebar">
    <div ref={listRef} className="ps-msg-list" tabIndex={0} role="region" aria-label={t('appShell.messageList.regionLabel')}>
      {loading ? (
        <LoadingState variant="inline" className="ps-msg-list-status" label={t('appShell.messageList.loading')} />
      ) : messages.length === 0 ? (
        <div className="ps-msg-list-status">
          {filterType === 'deleted' ? t('appShell.messageList.emptyDeleted') : t('appShell.messageList.emptyInbox')}
        </div>
      ) : messages.map(m => {
        const isChecked  = selectedIds.includes(m.id);
        const isSelected = selectedMsgId === m.id;
        const rowClass = [
          'ps-msg-row',
          isSelected && 'selected',
          isUnreadFor(m, userId) && 'unread',
          !isSelected && m.isUrgent && 'urgent-row',
        ].filter(Boolean).join(' ');
        return (
          <div key={m.id}
            className={rowClass}
            onMouseEnter={() => onHover(m.id)}
            onMouseLeave={() => onHover(null)}
            // Batch 567 (axe nested-interactive): the row holds buttons (delete, restore), so it isn't a button
            // itself. Clicking anywhere on it still opens (or, editing, ticks) the message; the sender's name is
            // the button keyboard and screen-reader users use. Focus inside the row shows its actions, as hover does
            // (its own state, so the pointer leaving the row doesn't remove a button that has focus).
            {...clickableContainer(() => isEditing ? onToggleCheck(m.id) : onSelect(m.id))}
            onFocus={() => setFocusedMsgId(m.id)}
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusedMsgId(id => (id === m.id ? null : id)); }}
          >
            {/* Checkbox in edit mode */}
            {isEditing && (
              <div className={`ps-msg-row-checkbox${isChecked ? ' checked' : ''}`}>
                {isChecked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,6 5,9 10,3"/></svg>}
              </div>
            )}
            {/* Avatar */}
            <div className={`ps-msg-avatar${m.isUrgent ? ' urgent-avatar' : ''}`}>
              {avatarInitials(m.senderName)}
            </div>
            {/* Body */}
            <div className="ps-msg-row-body">
              <div className="ps-msg-row-top">
                <button type="button" className="ps-row-open-btn ps-msg-row-sender" data-msg-open={m.id}
                  aria-describedby={`ps-msg-subject-${m.id}`}
                  {...(isEditing ? { 'aria-pressed': isChecked } : {})}
                  onClick={e => { e.stopPropagation(); if (isEditing) onToggleCheck(m.id); else onSelect(m.id); }}>
                  {m.senderName}
                </button>
                {!isEditing && (
                  hoveredMsgId === m.id || focusedMsgId === m.id ? (
                    filterType === 'deleted' ? (
                      <div className="ps-msg-row-hover-actions" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={e => removeWithFocus(e, m.id, onRestore)} className="ps-msg-row-restore-btn">{t('appShell.messageList.restoreButton')}</button>
                        <button type="button" onClick={e => removeWithFocus(e, m.id, onPermanentDelete)} className="ps-msg-row-delete-link">{t('appShell.messageList.deleteButton')}</button>
                      </div>
                    ) : (
                      <button type="button" aria-label={t('appShell.messageList.deleteButton')} title={t('appShell.messageList.deleteButton')} onClick={e => removeWithFocus(e, m.id, onSoftDelete)} className="ps-msg-row-delete-icon-btn">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    )
                  ) : (
                    <div className="ps-msg-row-meta">
                      {m.isUrgent && <span className="ps-msg-urgent-pill">{t('appShell.messageList.urgentPill')}</span>}
                      <span className="ps-msg-row-time">{relTime(m.timestamp)}</span>
                    </div>
                  )
                )}
              </div>
              <div className="ps-msg-row-subject" id={`ps-msg-subject-${m.id}`}>{m.subject || t('appShell.messageList.noSubject')}</div>
              <div className="ps-msg-row-preview">{m.body}</div>
            </div>
            {isUnreadFor(m, userId) && !isEditing && <div className="ps-msg-unread-dot" />}
          </div>
        );
      })}
    </div>

    {/* Footer */}
    <div className="ps-msg-sidebar-footer">
      {isEditing ? (
        <div className="ps-msg-footer-edit-row">
          <button onClick={onBulkMarkRead} className="ps-msg-footer-readall-btn">{t('appShell.messageList.readAllButton')}</button>
          <button onClick={onBulkDelete} className="ps-msg-footer-deleteall-btn">{t('appShell.messageList.deleteAllButton')}</button>
        </div>
      ) : filterType === 'deleted' ? (
        <div className="ps-msg-footer-empty-row">
          <button onClick={onEmptyDeleted} disabled={messages.length === 0} className="ps-msg-footer-deleteall-btn ps-msg-footer-deleteall-btn--centered">{t('appShell.messageList.deleteAllConfirmButton')}</button>
        </div>
      ) : (
        <div className="ps-msg-footer-normal-row">
          {/* Search */}
          <div className="ps-msg-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8aaccc" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="ps-msg-search-input" placeholder={t('appShell.messageList.searchPlaceholder')} value={searchText} onChange={e => onSearchChange(e.target.value)} />
          </div>
          {/* Compose */}
          <button onClick={onCompose} disabled={isComposing} title={t('appShell.messageList.composeTitle')} className="ps-msg-compose-icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          {/* Secure email */}
          <button onClick={onSecureEmail} title={t('appShell.messageList.secureEmailTitle')} className="ps-msg-footer-secure-btn">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </button>
        </div>
      )}
    </div>
  </div>
  );
};

// ── ThreadPanel ───────────────────────────────────────────────────────────────
interface ThreadPanelProps {
  /** Why the last reply failed, already translated (kept so the draft isn't lost). */
  sendError?: string | null;
  message: any;
  userId: string;
  inputText: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onSoftDelete: () => void;
  onMarkUnread: () => void;
  onCreateTemplate?: (messageId: string) => void;
}

const ThreadPanel: React.FC<ThreadPanelProps> = ({ sendError, message, userId, inputText, onInputChange, onSend, onSoftDelete, onMarkUnread, onCreateTemplate }) => {
  const { t } = useTranslation();
  const requirements = useFieldRequirements('messaging');
  const { has, loading } = useCapabilities();
  const mayReply = has('message:internal:send');
  const canReply = replyMissing(inputText, requirements).length === 0 && mayReply;
  // Detect template requests — body contains embedded metadata marker
  const isTemplateRequest = typeof message.body === 'string' && message.body.includes('<!-- TEMPLATE_REQUEST_META:');
  const templateMeta = React.useMemo(() => {
    if (!isTemplateRequest) return null;
    try {
      const match = message.body.match(/<!-- TEMPLATE_REQUEST_META:(.*?) -->/s);
      return match ? JSON.parse(match[1]) : null;
    } catch { return null; }
  }, [message.body, isTemplateRequest]);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const bubbleEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { bubbleEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [message.thread]);

  const thread = message.thread?.length
    ? message.thread
    : [{ senderId: message.senderId, sender: message.senderName, text: message.body, timestamp: message.timestamp }];

  return (
    <>
      <div className="ps-thread-body ps-msg-thread">
        {thread.map((msg: any, idx: number) => {
          const isMe = msg.senderId === userId;
          return (
            <div key={idx} className={`ps-thread-bubble-wrap${isMe ? ' ps-thread-bubble-wrap--me' : ''}`}>
              <div className="ps-thread-bubble-meta">
                <span>{msg.sender}</span><span>·</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={`ps-thread-bubble${isMe ? ' ps-thread-bubble--me' : ''}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bubbleEndRef} />

        {/* ── Template Request Action Banner ── */}
        {isTemplateRequest && templateMeta && (
          <div className="ps-thread-template-banner">
            <span className="ps-thread-template-icon">📋</span>
            <div className="ps-thread-template-text">
              <strong className="ps-thread-template-title">
                {t('appShell.thread.templateRequestTitle')}
              </strong>
              {templateMeta.standard} {templateMeta.organ} — {templateMeta.procedure}
              {templateMeta.baseTemplateName && (
                <span className="ps-thread-template-base">{t('appShell.thread.baseTemplateLabel', { name: templateMeta.baseTemplateName })}</span>
              )}
            </div>
            {onCreateTemplate && (
              <button
                onClick={() => onCreateTemplate(message.id)}
                className="ps-thread-create-template-btn"
              >
                {t('appShell.thread.createTemplateButton')}
              </button>
            )}
          </div>
        )}

        {/* ⋯ menu */}
        <div className="ps-thread-menu-wrap">
          <button onClick={() => setMenuOpen(v => !v)} className="ps-thread-menu-trigger">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
          </button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} className="ps-thread-menu-backdrop" />
              <div className="ps-thread-menu-panel">
                {[
                  { label: t('appShell.thread.markUnread'), action: () => { onMarkUnread(); setMenuOpen(false); }, danger: false, disabled: !canMarkUnread(message, userId) },
                  { label: t('appShell.thread.deleteMessage'),  action: () => { onSoftDelete(); setMenuOpen(false); }, danger: true, disabled: false },
                ].map(item => (
                  <button key={item.label} onClick={item.action} disabled={item.disabled} title={item.disabled ? t('appShell.thread.markUnreadOwnLatest') : undefined}
                    className={`ps-thread-menu-item${item.danger ? ' ps-thread-menu-item--danger' : ''}`}
                  >{item.label}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reply bar */}
      <div className="ps-thread-reply-bar">
        <div className="ps-thread-reply-input-wrap">
          <input className="ps-input ps-thread-reply-input" type="text" placeholder={t('appShell.thread.replyPlaceholder')} value={inputText}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          />
          <button onClick={onSend} disabled={!canReply}
            className={`ps-thread-reply-send-btn${canReply ? ' ps-thread-reply-send-btn--active' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        {!mayReply && !loading && <p className="ps-field-still-required" role="status">{t('appShell.messaging.notPermitted')}</p>}
        {sendError && <p className="ps-field-still-required" role="alert">{sendError}</p>}
      </div>
    </>
  );
};

// ── SecureEmailModal ──────────────────────────────────────────────────────────
// Batch 517 (PS-143): moved to components/SecureEmail/SecureEmailModal.tsx so
// the critical-findings flow can open it too.

interface AppShellProps { hideNav?: boolean; }

const AppShell: React.FC<AppShellProps> = ({ hideNav: hideNavRequested = false }) => {
  // PS-472: a page that hides the nav bar (the case report draws its own inside the route) loses it
  // when it crashes, so the nav bar comes back while the recovery screen shows.
  const [routeCrashed, setRouteCrashed] = useState(false);
  const hideNav = hideNavRequested && !routeCrashed;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openCasePage = useOpenCase();

  const { user, showBiometricWizard, setShowBiometricWizard } = useAuth();
  // Batch 431: the screen language follows the signed-in person.
  usePersonalLanguage(user?.id);
  // Batch 521 (PS-281): failed automatic deliveries are retried on schedule while someone is signed in.
  useDeliveryBackgroundWork(!!user);
  useSimulatedAssistSchedule(!!user);
  // Batch 534: held reports go out when their release delay ends, whichever screen is open.
  useReleaseBackgroundWork(!!user);
  const userInitials = user?.name ? (() => { const p = user.name.split(' ').filter(Boolean); return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0]?.[0]?.toUpperCase() ?? '?'; })() : 'DR';
  const handleLogout = useLogout();
  const location = useLocation();
  const { crumbs, pushCrumb } = useBreadcrumb();
  // Real, aliased on the way in — this file already has its own,
  // unrelated local `isDirty` further below (the messaging drawer's own
  // unsaved-draft flag, a genuinely separate concern), so the shared
  // DirtyStateContext's real isDirty (case/report unsaved changes) is
  // renamed here to avoid colliding with it.
  const { requestNavigate, isDirty: hasUnsavedCaseData } = useDirtyState();
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  // Real fix, per direct report: the Sign Out button used to call
  // handleLogout() unconditionally — no check at all against real,
  // in-progress unsaved case/report data (AccessionPage.tsx/
  // SynopticReportPage.tsx, the only two real setDirty(true) callers).
  // Same real isDirty this file's own guardedNavigate() already checks
  // for breadcrumb/logo navigation, applied here too.
  const handleLogoutClick = React.useCallback(() => {
    if (hasUnsavedCaseData) { setShowLogoutWarning(true); return; }
    handleLogout();
  }, [hasUnsavedCaseData, handleLogout]);

  const guardedNavigate = React.useCallback((path: string) => {
    // Tell SearchPage to restore its previous results/filters when
    // navigating back to it — mirrors the exact same one-line pattern
    // SynopticReportPage.tsx's own guard() function already uses for its
    // internal "back to search" actions. Without this, only those
    // specific in-page actions set the flag; breadcrumb clicks, nav-bar
    // buttons, and the logo (which all route through this one shared
    // guardedNavigate) bypassed it entirely, silently dropping the
    // search session every time.
    if (path === '/search') markReturnToSearch();
    requestNavigate(path, (p) => navigate(p));
  }, [navigate, requestNavigate]);
  const PAGE_LABELS: Record<string, string> = {
    '/':              t('appShell.pageLabels.home'),
    '/worklist':      t('appShell.pageLabels.worklist'),
    '/search':        t('appShell.pageLabels.caseSearch'),
    '/audit':         t('appShell.pageLabels.auditLog'),
    '/configuration': t('appShell.pageLabels.configuration'),
    '/contribution':  t('appShell.pageLabels.contributions'),
    '/intraop-queue': t('appShell.pageLabels.intraopQueue'),
  };
  React.useEffect(() => {
    const label = PAGE_LABELS[location.pathname];
    if (label) pushCrumb(label, location.pathname);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const {
    messages, setMessages,
    unreadCount,
    hasUrgent,
    portalOpen, setPortalOpen,
  } = useMessaging();

  // Real, per direct follow-up ("the actions list is out of sync...
  // voice control is one of its central pillars. It has to be
  // flawless"): 24 real messaging voice/keyboard actions (Reply,
  // Delete, Compose, Send, Mark Urgent, and more) used
  // category: VOICE_CONTEXT.MESSAGES, but confirmed directly — zero
  // real components anywhere ever called
  // setCurrentContext(VOICE_CONTEXT.MESSAGES), the same real bug
  // class SynopticReportPage.tsx's own equivalent fix already
  // resolved for the REPORTING/SYNOPTIC mismatch. The drawer's own
  // real visibility state (portalOpen, from useMessaging() above) is
  // exactly the right, existing signal — no new state needed, just
  // the same one-line setCurrentContext pattern every other page
  // already uses, applied to this drawer's own real open/close state
  // instead of a page mount/unmount.
  useEffect(() => {
    if (portalOpen) {
      actionRegistryService.setCurrentContext(VOICE_CONTEXT.MESSAGES);
      return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
    }
  }, [portalOpen]);

  // Real fix (PS-299 — "Messages referencing a case should show a link
  // to that case at the top"): loaded once, lazily, the first time the
  // drawer is actually opened — never on every page's AppShell mount,
  // since this data exists purely to scan message text a real user is
  // about to read. See extractCaseReferencesFromText.ts for why this
  // matches against real, known accession numbers rather than guessing
  // from a generic pattern.
  //
  // Batch 396 (Pete's privacy model, rule 4): only cases this reader can
  // open become links (caseRouter.listLinkableAccessions). This used to scan
  // every case in every organisation, which confirmed that a case existed
  // to a reader who couldn't open it. Reloaded when the signed-in user changes.
  const [linkable, setLinkable] = useState<{ userId: string; accessions: string[] } | null>(null);
  const linkableUserId = user?.id ?? '';
  useEffect(() => {
    if (!portalOpen || !linkableUserId || linkable?.userId === linkableUserId) return;
    let cancelled = false;
    void caseRouter.listLinkableAccessions().then(accessions => {
      if (!cancelled) setLinkable({ userId: linkableUserId, accessions });
    });
    return () => { cancelled = true; };
  }, [portalOpen, linkableUserId, linkable?.userId]);
  const knownAccessions = linkable?.userId === linkableUserId ? linkable.accessions : NO_ACCESSIONS;

// ─── Drawers & Modals ──────────────────────────────────────────────────────
  const [aboutOpen, setAboutOpen]             = useState(false);
  const [myDictionaryOpen, setMyDictionaryOpen] = useState(false);
  const [myVoiceCommandsOpen, setMyVoiceCommandsOpen] = useState(false);
  // Batch 433: biometric signing (profile menu, and the invitation after sign-in).
  const [biometricOpen, setBiometricOpen] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  useEffect(() => { void biometricFlow.getPolicy().then(p => setBiometricEnabled(p.enabled)); }, []);
  const [systemInfoOpen, setSystemInfoOpen]   = useState(false);
  const [newRecipients, setNewRecipients]     = useState<InternalUser[]>([]);
  const [newToInput,    setNewToInput]        = useState('');
  const messagingRequirements = useFieldRequirements('messaging');
  const [newSubject,    setNewSubject]        = useState('');
  const [newBody,       setNewBody]           = useState('');
  const [showUserSearch,   setShowUserSearch]   = useState(false);
  const [toDropdownOpen,   setToDropdownOpen]   = useState(false);
  const [toHighlightIdx,   setToHighlightIdx]   = useState(0);
  const [secureEmailOpen,  setSecureEmailOpen]  = useState(false);
  // Batch 385: who a message can go to (messageService.listRecipients), and why the last send failed.
  const [directory, setDirectory] = useState<InternalUser[]>([]);
  const directoryRef = useRef<InternalUser[]>([]);
  directoryRef.current = directory;
  const [sendError, setSendError] = useState<string | null>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  // ─── Edit / selection ───────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ─── Messaging ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [previousMsgId, setPreviousMsgId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [isUrgentNew, setIsUrgentNew] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'deleted'>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // Batch 396: no stand-in id. With nobody signed in there is no inbox.
  const userId = user?.id ?? '';
  const { log } = useAuditLog();

  useEffect(() => {
    let cancelled = false;
    void messageService.listRecipients().then(r => { if (!cancelled && r.ok) setDirectory(r.data); });
    return () => { cancelled = true; };
  }, []);

  // ─── Load inbox ─────────────────────────────────────────────────────────────
  // A reply for someone who has since signed out is dropped.
  const inboxUserRef = useRef(userId);
  inboxUserRef.current = userId;
  const loadInbox = useCallback(async () => {
    if (!userId) { setMessages([]); setSelectedMsgId(null); return; }
    setLoading(true);
    const result = await messageService.getInbox(userId);
    if (inboxUserRef.current !== userId) return;
    if (result.ok) {
      setMessages(result.data);
      setSelectedMsgId(null);
    }
    setLoading(false);
  }, [userId, setMessages]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const displayMessages = messages
    .filter(m => filterType === 'deleted' ? m.isDeleted : !m.isDeleted)
    .filter(m =>
      m.senderName.toLowerCase().includes(searchText.toLowerCase()) ||
      m.body.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort(compareMessageListOrder); // urgent first, then latest thread activity (a reply moves it up)

  const currentMsg = messages.find(m => m.id === selectedMsgId);

  // Real fix (PS-299) — real accession numbers found in the open
  // message's own subject/body that AREN'T already the one structured
  // currentMsg.caseNumber (never double-link the same real case).
  const detectedCaseRefs = React.useMemo(() => {
    if (!currentMsg) return [];
    const refs = extractCaseReferencesFromText(`${currentMsg.subject ?? ''} ${currentMsg.body ?? ''}`, knownAccessions);
    const already = currentMsg.caseNumber?.toUpperCase();
    return already ? refs.filter(r => r !== already) : refs;
  }, [currentMsg, knownAccessions]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleMarkRead = async (id: string) => {
    await messageService.markRead(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
  };

  const handleSoftDelete = async (id: string) => {
    await messageService.softDelete(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true } : m));
    if (selectedMsgId === id) setSelectedMsgId(null);
  };

  const handleRestore = async (id: string) => {
    await messageService.restore(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: false } : m));
  };

  // Real fix: was window.confirm() in all 4 places below — replaced with
  // the shared ConfirmModal. Each needs its own pending-state variable
  // since ConfirmModal is async/UI-driven rather than a blocking call;
  // rendered as 4 separate ConfirmModal instances at the end of this
  // component, since each has a different message and trigger.
  const [pendingPermanentDeleteId, setPendingPermanentDeleteId] = useState<string | null>(null);

  const handlePermanentDelete = (id: string) => {
    setPendingPermanentDeleteId(id);
  };

  const confirmPermanentDelete = async () => {
    if (!pendingPermanentDeleteId) return;
    const id = pendingPermanentDeleteId;
    setPendingPermanentDeleteId(null);
    await messageService.permanentDelete(id);
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selectedMsgId === id) setSelectedMsgId(null);
  };

  const [pendingEmptyDeletedCount, setPendingEmptyDeletedCount] = useState<number | null>(null);

  const handleEmptyDeleted = () => {
    setPendingEmptyDeletedCount(messages.filter(m => m.isDeleted).length);
  };

  const confirmEmptyDeleted = async () => {
    setPendingEmptyDeletedCount(null);
    await messageService.emptyDeleted(userId);
    setMessages(prev => prev.filter(m => !m.isDeleted));
    setSelectedMsgId(null);
  };

  const handleSend = async () => {
    if (replyMissing(inputText, messagingRequirements).length > 0 || !selectedMsgId) return;
    setSendError(null);
    const result = await messageService.reply(selectedMsgId, userId, user?.name ?? 'Dr. Sarah Johnson', inputText, { composedByPerson: true });
    if (result.ok === false) {
      setSendError(result.error === MESSAGE_NOT_PERMITTED ? t('appShell.messaging.notPermitted') : t('appShell.messaging.sendFailed'));
      return;
    }
    if (result.ok) {
      setMessages(prev => prev.map(m => m.id === selectedMsgId ? result.data : m));
      const msg = messages.find(m => m.id === selectedMsgId);
      if (msg) log('message_sent', { recipientId: msg.senderId ?? '', recipientName: msg.senderName ?? '', isUrgent: false });
    }
    setInputText('');
    setIsDirty(false);
  };

  const handleSendNew = async () => {
    // Batch 384: the same check as the Send button (the voice "send" used to skip the subject).
    if (newMessageMissing(newRecipients.length, newSubject, newBody, messagingRequirements).length > 0) return;
    setSendError(null);
    let failed: string | null = null;
    for (const recipient of newRecipients) {
      const result = await messageService.send({
        senderId:      userId,
        senderName:    user?.name ?? 'Dr. Sarah Johnson',
        recipientId:   recipient.id,
        recipientName: recipient.name,
        subject:       newSubject,
        body:          newBody,
        timestamp:     new Date(),
        isUrgent:      isUrgentNew,
      }, { composedByPerson: true });
      if (result.ok === true) {
        setMessages(prev => [result.data, ...prev]);
        log('message_sent', { recipientId: recipient.id, recipientName: recipient.name, isUrgent: isUrgentNew });
      } else {
        failed = result.error === MESSAGE_NOT_PERMITTED ? t('appShell.messaging.notPermitted') : t('appShell.messaging.sendFailed');
        break;
      }
    }
    // A refused or failed send keeps the draft (it used to be cleared either way).
    if (failed) { setSendError(failed); return; }
    setNewRecipients([]); setNewToInput(''); setNewSubject(''); setNewBody('');
    setIsUrgentNew(false); setIsDirty(false); setIsComposing(false);
  };

  const handleSecureEmail = () => {
    setSecureEmailOpen(true);
  };

  const [pendingBulkDeleteCount, setPendingBulkDeleteCount] = useState<number | null>(null);

  const handleBulkDelete = async () => {
    if (filterType === 'deleted') {
      setPendingBulkDeleteCount(selectedIds.length);
      return;
    }
    await Promise.all(selectedIds.map(id => messageService.softDelete(id)));
    setMessages(prev => prev.map(m => selectedIds.includes(m.id) ? { ...m, isDeleted: true } : m));
    setSelectedIds([]);
    setIsEditing(false);
  };

  const confirmBulkDelete = async () => {
    setPendingBulkDeleteCount(null);
    await Promise.all(selectedIds.map(id => messageService.permanentDelete(id)));
    setMessages(prev => prev.filter(m => !selectedIds.includes(m.id)));
    setSelectedIds([]);
    setIsEditing(false);
  };

  const handleBulkMarkRead = async () => {
    await Promise.all(selectedIds.map(id => messageService.markRead(id)));
    setMessages(prev => prev.map(m => selectedIds.includes(m.id) ? { ...m, isRead: true } : m));
    setSelectedIds([]);
  };

  const resetDrawerState = () => {
    setSelectedMsgId(null);
    setFilterType('all');
    setSearchText('');
    setIsEditing(false);
    setSelectedIds([]);
    setIsFilterMenuOpen(false);
    setHoveredMsgId(null);
    setInputText('');
    setIsDirty(false);
    setIsUrgentNew(false);
    setIsComposing(false);
    setNewRecipients([]); setNewToInput(''); setNewSubject(''); setNewBody('');
    setToDropdownOpen(false); setShowUserSearch(false);
  };

  const [pendingCloseDrawer, setPendingCloseDrawer] = useState(false);

  const handleCloseDrawer = () => {
    if (isDirty) {
      setPendingCloseDrawer(true);
      return;
    }
    setPortalOpen(false);
    clearSessionFlag('ps_drawer_open');
    resetDrawerState();
  };

  const confirmCloseDrawer = () => {
    setPendingCloseDrawer(false);
    setPortalOpen(false);
    clearSessionFlag('ps_drawer_open');
    resetDrawerState();
  };

  // ─── Voice command listeners ───────────────────────────────────────────────
  // Placed after all handlers and derived values so every closure is in scope.
  useEffect(() => {
    // ── Page navigation ──────────────────────────────────────────────────────
    const openHome               = () => guardedNavigate('/');
    const openMessages           = () => setPortalOpen(true);
    const openWorklist           = () => guardedNavigate('/worklist');
    const openIntraopQueue       = () => guardedNavigate('/intraop-queue');
    const openConfig             = () => guardedNavigate('/configuration');
    const openSearch             = () => guardedNavigate('/search');
    const openAudit              = () => guardedNavigate('/audit');
    const openContribution       = () => guardedNavigate('/contribution');
    const goBack                 = () => navigate(-1);
    const goForward              = () => navigate(1);
    const nextCase               = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_NAV_NEXT_CASE'));
    const previousCase           = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_NAV_PREVIOUS_CASE'));

    // ── Home page actions ────────────────────────────────────────────────────
    const openEnhancementRequest = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_HOME_OPEN_ENHANCEMENT_REQUEST'));
    const openTestingFeedback    = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_HOME_OPEN_TESTING_FEEDBACK'));
    const viewHelp               = () => window.dispatchEvent(new CustomEvent(OPEN_USER_GUIDE_EVENT));
    const openResources          = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_PAGE_OPEN_RESOURCES'));
    const systemLogout           = () => handleLogoutClick();

    // ── Messages: navigation ─────────────────────────────────────────────────
    const msgNext = () => {
      setSelectedMsgId(current => {
        const idx = displayMessages.findIndex(m => m.id === current);
        return displayMessages[idx + 1]?.id ?? current;
      });
    };
    const msgPrevious = () => {
      setSelectedMsgId(current => {
        const idx = displayMessages.findIndex(m => m.id === current);
        return idx > 0 ? displayMessages[idx - 1].id : current;
      });
    };

    // ── Messages: actions ────────────────────────────────────────────────────
    const msgReply = () => {
      if (selectedMsgId) {
        setPreviousMsgId(selectedMsgId);
        setSelectedMsgId(null);
        setIsComposing(true);
        setInputText('');
      }
    };
    const msgDelete = () => {
      if (!selectedMsgId) return;
      if (filterType === 'deleted') handlePermanentDelete(selectedMsgId);
      else handleSoftDelete(selectedMsgId);
    };
    const msgMarkRead    = () => { if (selectedMsgId) handleMarkRead(selectedMsgId); };
    const msgMarkReadAll  = () => handleBulkMarkRead();
    const msgMarkUnread   = () => {
      if (selectedMsgId) setMessages(prev => prev.map(m => m.id === selectedMsgId && canMarkUnread(m, userId) ? { ...m, isRead: false } : m));
    };
    const msgSecureEmail  = () => handleSecureEmail();
    const msgRecipientAdd = () => {
      // Confirms the highlighted inline To: suggestion — same as pressing Enter in the input
      toInputRef.current?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    };
    const msgCompose      = () => {
      setPreviousMsgId(selectedMsgId);
      setSelectedMsgId(null);
      setIsComposing(true);
      setInputText('');
    };
    // Real fix (PS-304) — see utils/openComposeTo.ts for the full
    // reasoning. Opens the drawer already addressed and subjected,
    // same real compose state any other path into compose uses, so
    // Send/Urgent/etc. all keep working unchanged from here.
    const msgComposeTo = (e: Event) => {
      const { staffId, subject } = (e as CustomEvent<{ staffId: string; subject: string }>).detail ?? {};
      const recipient = directoryRef.current.find(u => u.id === staffId);
      setPortalOpen(true);
      setPreviousMsgId(selectedMsgId);
      setSelectedMsgId(null);
      setIsComposing(true);
      setInputText('');
      setNewRecipients(recipient ? [recipient] : []);
      setNewToInput(recipient ? '' : (staffId ?? ''));
      setNewSubject(subject ?? '');
    };
    const msgSend        = () => { if (isComposing) void handleSendNew(); else void handleSend(); };
    const msgClose       = () => handleCloseDrawer();
    const msgEdit        = () => { setIsEditing(e => !e); if (isEditing) setSelectedIds([]); };
    const msgSearch      = () => {
      const input = document.querySelector<HTMLInputElement>('.ps-msg-drawer .ps-msg-search-input');
      input?.focus();
    };
    const msgViewDeleted  = () => setFilterType('deleted');
    const msgViewMessages = () => setFilterType('all');
    const msgRestore      = () => { if (selectedMsgId) void handleRestore(selectedMsgId); };
    const msgDeleteAll    = () => {
      if (filterType === 'deleted') void handleEmptyDeleted();
      else void handleBulkDelete();
    };

    // ── Messages compose: field helpers ──────────────────────────────────────
    const msgGotoSubject     = () => {
      document.querySelector<HTMLInputElement>('.ps-msg-drawer .ps-compose-field-input')?.focus();
    };
    const msgGotoBody        = () => {
      document.querySelector<HTMLTextAreaElement>('.ps-msg-drawer textarea')?.focus();
    };
    const msgClearSubject    = () => setNewSubject('');
    const msgClearBody       = () => { setNewBody(''); setIsDirty(false); };
    const msgUrgent          = () => setIsUrgentNew(u => !u);
    const msgRecipientSearch = () => setShowUserSearch(true);

    window.addEventListener('PATHSCRIBE_OPEN_HOME',               openHome);
    window.addEventListener('PATHSCRIBE_OPEN_MESSAGES',           openMessages);
    window.addEventListener('PATHSCRIBE_OPEN_WORKLIST',           openWorklist);
    window.addEventListener('PATHSCRIBE_OPEN_INTRAOP_QUEUE',      openIntraopQueue);
    window.addEventListener('PATHSCRIBE_OPEN_CONFIGURATION',      openConfig);
    window.addEventListener('PATHSCRIBE_OPEN_SEARCH',             openSearch);
    window.addEventListener('PATHSCRIBE_OPEN_AUDIT',              openAudit);
    window.addEventListener('PATHSCRIBE_OPEN_CONTRIBUTION',       openContribution);
    window.addEventListener('PATHSCRIBE_GO_BACK',                 goBack);
    window.addEventListener('PATHSCRIBE_GO_FORWARD',              goForward);
    window.addEventListener('PATHSCRIBE_NEXT_CASE',               nextCase);
    window.addEventListener('PATHSCRIBE_PREVIOUS_CASE',           previousCase);
    window.addEventListener('PATHSCRIBE_OPEN_ENHANCEMENT_REQUEST',openEnhancementRequest);
    window.addEventListener('PATHSCRIBE_OPEN_TESTING_FEEDBACK',   openTestingFeedback);
    window.addEventListener('PATHSCRIBE_VIEW_HELP',               viewHelp);
    window.addEventListener('PATHSCRIBE_OPEN_RESOURCES',          openResources);
    window.addEventListener('PATHSCRIBE_SYSTEM_LOGOUT',           systemLogout);
    window.addEventListener('PATHSCRIBE_MSG_NEXT',                msgNext);
    window.addEventListener('PATHSCRIBE_MSG_PREVIOUS',            msgPrevious);
    window.addEventListener('PATHSCRIBE_MSG_REPLY',               msgReply);
    window.addEventListener('PATHSCRIBE_MSG_DELETE',              msgDelete);
    window.addEventListener('PATHSCRIBE_MSG_MARK_READ',           msgMarkRead);
    window.addEventListener('PATHSCRIBE_MSG_MARK_READ_ALL',       msgMarkReadAll);
    window.addEventListener('PATHSCRIBE_MSG_MARK_UNREAD',         msgMarkUnread);
    window.addEventListener('PATHSCRIBE_MSG_SECURE_EMAIL',        msgSecureEmail);
    window.addEventListener('PATHSCRIBE_MSG_RECIPIENT_ADD',       msgRecipientAdd);
    window.addEventListener('PATHSCRIBE_MSG_COMPOSE',             msgCompose);
    window.addEventListener('PATHSCRIBE_MSG_COMPOSE_TO',          msgComposeTo);
    window.addEventListener('PATHSCRIBE_MSG_SEND',                msgSend);
    window.addEventListener('PATHSCRIBE_MSG_CLOSE',               msgClose);
    window.addEventListener('PATHSCRIBE_MSG_EDIT',                msgEdit);
    window.addEventListener('PATHSCRIBE_MSG_SEARCH',              msgSearch);
    window.addEventListener('PATHSCRIBE_MSG_VIEW_DELETED',        msgViewDeleted);
    window.addEventListener('PATHSCRIBE_MSG_VIEW_MESSAGES',       msgViewMessages);
    window.addEventListener('PATHSCRIBE_MSG_RESTORE',             msgRestore);
    window.addEventListener('PATHSCRIBE_MSG_DELETE_ALL',          msgDeleteAll);
    window.addEventListener('PATHSCRIBE_MSG_GOTO_SUBJECT',        msgGotoSubject);
    window.addEventListener('PATHSCRIBE_MSG_GOTO_BODY',           msgGotoBody);
    window.addEventListener('PATHSCRIBE_MSG_CLEAR_SUBJECT',       msgClearSubject);
    window.addEventListener('PATHSCRIBE_MSG_CLEAR_BODY',          msgClearBody);
    window.addEventListener('PATHSCRIBE_MSG_URGENT',              msgUrgent);
    window.addEventListener('PATHSCRIBE_MSG_RECIPIENT_SEARCH',    msgRecipientSearch);

    return () => {
      window.removeEventListener('PATHSCRIBE_OPEN_HOME',               openHome);
      window.removeEventListener('PATHSCRIBE_OPEN_MESSAGES',           openMessages);
      window.removeEventListener('PATHSCRIBE_OPEN_WORKLIST',           openWorklist);
      window.removeEventListener('PATHSCRIBE_OPEN_INTRAOP_QUEUE',      openIntraopQueue);
      window.removeEventListener('PATHSCRIBE_OPEN_CONFIGURATION',      openConfig);
      window.removeEventListener('PATHSCRIBE_OPEN_SEARCH',             openSearch);
      window.removeEventListener('PATHSCRIBE_OPEN_AUDIT',              openAudit);
      window.removeEventListener('PATHSCRIBE_OPEN_CONTRIBUTION',       openContribution);
      window.removeEventListener('PATHSCRIBE_GO_BACK',                 goBack);
      window.removeEventListener('PATHSCRIBE_GO_FORWARD',              goForward);
      window.removeEventListener('PATHSCRIBE_NEXT_CASE',               nextCase);
      window.removeEventListener('PATHSCRIBE_PREVIOUS_CASE',           previousCase);
      window.removeEventListener('PATHSCRIBE_OPEN_ENHANCEMENT_REQUEST',openEnhancementRequest);
      window.removeEventListener('PATHSCRIBE_OPEN_TESTING_FEEDBACK',   openTestingFeedback);
      window.removeEventListener('PATHSCRIBE_VIEW_HELP',               viewHelp);
      window.removeEventListener('PATHSCRIBE_OPEN_RESOURCES',          openResources);
      window.removeEventListener('PATHSCRIBE_SYSTEM_LOGOUT',           systemLogout);
      window.removeEventListener('PATHSCRIBE_MSG_NEXT',                msgNext);
      window.removeEventListener('PATHSCRIBE_MSG_PREVIOUS',            msgPrevious);
      window.removeEventListener('PATHSCRIBE_MSG_REPLY',               msgReply);
      window.removeEventListener('PATHSCRIBE_MSG_DELETE',              msgDelete);
      window.removeEventListener('PATHSCRIBE_MSG_MARK_READ',           msgMarkRead);
      window.removeEventListener('PATHSCRIBE_MSG_MARK_READ_ALL',       msgMarkReadAll);
      window.removeEventListener('PATHSCRIBE_MSG_MARK_UNREAD',         msgMarkUnread);
      window.removeEventListener('PATHSCRIBE_MSG_SECURE_EMAIL',        msgSecureEmail);
      window.removeEventListener('PATHSCRIBE_MSG_RECIPIENT_ADD',       msgRecipientAdd);
      window.removeEventListener('PATHSCRIBE_MSG_COMPOSE_TO',          msgComposeTo);
      window.removeEventListener('PATHSCRIBE_MSG_COMPOSE',             msgCompose);
      window.removeEventListener('PATHSCRIBE_MSG_SEND',                msgSend);
      window.removeEventListener('PATHSCRIBE_MSG_CLOSE',               msgClose);
      window.removeEventListener('PATHSCRIBE_MSG_EDIT',                msgEdit);
      window.removeEventListener('PATHSCRIBE_MSG_SEARCH',              msgSearch);
      window.removeEventListener('PATHSCRIBE_MSG_VIEW_DELETED',        msgViewDeleted);
      window.removeEventListener('PATHSCRIBE_MSG_VIEW_MESSAGES',       msgViewMessages);
      window.removeEventListener('PATHSCRIBE_MSG_RESTORE',             msgRestore);
      window.removeEventListener('PATHSCRIBE_MSG_DELETE_ALL',          msgDeleteAll);
      window.removeEventListener('PATHSCRIBE_MSG_GOTO_SUBJECT',        msgGotoSubject);
      window.removeEventListener('PATHSCRIBE_MSG_GOTO_BODY',           msgGotoBody);
      window.removeEventListener('PATHSCRIBE_MSG_CLEAR_SUBJECT',       msgClearSubject);
      window.removeEventListener('PATHSCRIBE_MSG_CLEAR_BODY',          msgClearBody);
      window.removeEventListener('PATHSCRIBE_MSG_URGENT',              msgUrgent);
      window.removeEventListener('PATHSCRIBE_MSG_RECIPIENT_SEARCH',    msgRecipientSearch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Real, honest justification: guardedNavigate and setMessages are genuinely called inside this effect's handlers. This effect's EXISTING deps (handleMarkRead, handleSoftDelete, handleRestore, handlePermanentDelete, handleEmptyDeleted, handleSend, handleSendNew, handleBulkDelete, handleBulkMarkRead, handleCloseDrawer) are themselves already unstable, unmemoized functions - a real, pre-existing condition confirmed directly, not something this fix introduces. Fully resolving this needs wrapping all 10 in useCallback, a significant, separate refactor deserving its own careful pass, not something to rush into this lint sweep.
  }, [
    navigate, setPortalOpen, displayMessages, selectedMsgId,
    filterType, isComposing, isEditing,
    handleMarkRead, handleSoftDelete, handlePermanentDelete, handleRestore,
    handleBulkMarkRead, handleBulkDelete, handleEmptyDeleted,
    handleSend, handleSendNew, handleCloseDrawer, handleLogoutClick,
  ]);

 // Real, per direct UI-review follow-up ("Fix the root"): this
 // element's own real, existing .ps-app-root CSS class already fully
 // defines position/width/height/background/color/font-family — but
 // the inline style previously here was silently overriding three of
 // those five with different, worse values: background #020617 vs
 // the CSS class's own var(--ps-navy-base) (#0b1120, the value
 // several other pages' own competing backgrounds were actually
 // trying to match); color #f1f5f9 vs var(--ps-text-primary)
 // (#e2e8f0); and, most consequentially, a font-family stack that
 // DROPPED 'Inter' entirely — every AppShell-wrapped page has been
 // silently falling back to system fonts instead of this app's own
 // intended typeface. Inline style removed entirely; the
 // already-correct CSS class now genuinely takes effect.
 return (
    <div className="ps-app-root">
      
      {/* ── NAVBAR ── */}
      {!hideNav && (
        <NavBar
          onLogoClick={() => guardedNavigate('/')}
          onLogout={handleLogoutClick}
          onProfileClick={() => setAboutOpen(true)}
        />
      )}

      {/* Real, live "unsaved changes" guard on Sign Out — see
          handleLogoutClick's own comment above for what this replaces. */}
      <LogoutWarningModal
        isOpen={showLogoutWarning}
        onClose={() => setShowLogoutWarning(false)}
        onLogout={handleLogout}
      />

      {/* Real fix, per direct follow-up: "the Current station...
          should be identified at login." Mounted unconditionally
          (not gated by hideNav) — a tech landing directly on a
          clinical route (NavBar hidden there) still needs this real,
          one-time prompt exactly the same as anyone landing on the
          main app shell. */}
      <ScanStationPrompt />
      {/* Real feature, per direct follow-up: "MVP Station-Switching
          via Barcode Label... interrupts standard barcode
          processing, and triggers a station switch event." Mounted
          unconditionally, same as ScanStationPrompt — a station
          barcode scan must work regardless of which page is active,
          NavBar hidden or not. */}
      <StationSwitchGuardModal />

      {/* Breadcrumb bar — dynamic */}
      {!hideNav && crumbs.length > 1 && (
        <div className="ps-crumb-bar">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            const isModal = crumb.path.includes('#');
            return (
              <React.Fragment key={crumb.path + i}>
                {i > 0 && <span className="ps-crumb-sep">{'›'}</span>}
                {isModal ? (
                  <span className="ps-crumb-modal">{PAGE_LABELS[crumb.path] ?? crumb.label}</span>
                ) : isLast ? (
                  <span className="ps-crumb-current">{PAGE_LABELS[crumb.path] ?? crumb.label}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => guardedNavigate(crumb.path)}
                    className="ps-crumb-link"
                  >
                    {PAGE_LABELS[crumb.path] ?? crumb.label}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
      {/* Outlet — flex:1 so it fills remaining height and full width exactly */}
      <div className={`ps-app-outlet-wrap${hideNav ? ' ps-app-outlet-wrap--nav-hidden' : ''}`}>
        {/* Batch 502 (PS-472): a page that crashes shows a recovery screen; the nav bar and drawers keep working. */}
        <RouteErrorBoundary pathname={location.pathname} onErrorChange={setRouteCrashed}>
          <Outlet />
        </RouteErrorBoundary>
      </div>

      {/* ── MESSAGES DRAWER — rendered via portal to escape stacking contexts ── */}
      {portalOpen && ReactDOM.createPortal(
        <>
          <div className="ps-drawer-backdrop" onClick={handleCloseDrawer} />

          {/* ── Unified messaging surface ── */}
          <div className={`ps-msg-drawer${(selectedMsgId || isComposing) ? ' ps-msg-drawer--detail-active' : ''}`} onClick={e => e.stopPropagation()}>

            {/* ── Unified top bar ── */}
            <div className="ps-msg-topbar">

              {/* Left segment: title + controls */}
              <div className="ps-msg-topbar-left">
                <div className="ps-msg-title-row">
                  <h2 className="ps-msg-title">
                    {filterType === 'deleted' ? t('appShell.drawer.titleDeleted') : t('appShell.drawer.titleMessages')}
                  </h2>
                  {unreadCount > 0 && filterType !== 'deleted' && (
                    <span className={`ps-unread-bubble${hasUrgent ? " ps-unread-urgent" : ""}`}>{unreadCount}</span>
                  )}
                </div>
                <div className="ps-msg-header-actions">
                  <button className="ps-msg-edit-btn" onClick={() => { setIsEditing(!isEditing); if (isEditing) setSelectedIds([]); }}>
                    {isEditing ? t('appShell.drawer.doneButton') : t('appShell.drawer.editButton')}
                  </button>
                  <div className="ps-msg-filter-wrap">
                    <button className="ps-msg-filter-btn" onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)} aria-label={t('appShell.drawer.filterAriaLabel')} title={t('appShell.drawer.filterAriaLabel')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="21" y1="7" x2="3" y2="7" /><line x1="18" y1="12" x2="6" y2="12" /><line x1="15" y1="17" x2="9" y2="17" />
                      </svg>
                    </button>
                    {isFilterMenuOpen && (
                      <>
                        <div className="ps-msg-filter-backdrop" onClick={() => setIsFilterMenuOpen(false)} />
                        <div className="ps-msg-filter-menu">
                          {[{ id: 'all', label: t('appShell.drawer.titleMessages') }, { id: 'deleted', label: t('appShell.drawer.titleDeleted') }].map((opt) => (
                            <div
                              key={opt.id}
                              className={`ps-msg-filter-item${filterType === opt.id ? ' ps-msg-filter-item--active' : ''}`}
                              {...pressable(() => { setFilterType(opt.id as any); setIsFilterMenuOpen(false); })}
                            >
                              <span>{opt.label}</span>
                              {filterType === opt.id && <span className="ps-msg-filter-check">✓</span>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right segment: thread context, compose title, or close button */}
              <div className="ps-msg-topbar-right">
                <button
                  type="button"
                  className="ps-msg-mobile-back"
                  onClick={() => { setSelectedMsgId(null); setIsComposing(false); }}
                  aria-label={t('appShell.drawer.backAriaLabel')}
                  title={t('appShell.drawer.backAriaLabel')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                {selectedMsgId && currentMsg ? (
                  <>
                    <div className="ps-msg-thread-header">
                      <div className="ps-msg-thread-name-row">
                        <span className="ps-msg-thread-name">{currentMsg.senderName}</span>
                        {currentMsg.isUrgent && (
                          <span className="ps-msg-urgent-badge">{t('appShell.drawer.urgentBadge')}</span>
                        )}
                      </div>
                      <div className="ps-msg-thread-meta-row">
                        {currentMsg.subject && (
                          <span className="ps-msg-thread-subject">{currentMsg.subject}</span>
                        )}
                        {currentMsg.caseNumber && (
                          <button className="ps-msg-case-link" data-phi="accession" onClick={() => {
                            // Only rendered when caseNumber is set; re-checked for the closure.
                            if (!currentMsg.caseNumber) return;
                            setPortalOpen(false);
                            setSessionFlag('ps_reopen_messages', '1');
                            // Real fix, per direct follow-up: "I assume
                            // we will launch the Internal Notes Drawer
                            // when the case gets selected from the
                            // worklist or the message." Also finally,
                            // genuinely sets fromMessages - previously
                            // FullReportPage.tsx read this flag but
                            // nothing ever actually set it (confirmed
                            // directly), so its own "Back" handling for
                            // messages was real code with no real path
                            // reaching it. Now it does.
                            void openCasePage(currentMsg.caseNumber, 'report', { state: { fromMessages: true, openInternalNotes: true } });
                          }}>
                            {t('appShell.thread.caseLinkLabel', { caseNumber: currentMsg.caseNumber })}
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          </button>
                        )}
                        {/* Real fix (PS-299) — links for real cases this
                            message's own subject/body mentions in free
                            text, same UI/navigation as the structured
                            caseNumber link above, just detected rather
                            than pre-set. */}
                        {detectedCaseRefs.map(ref => (
                          <button key={ref} className="ps-msg-case-link" data-phi="accession" onClick={() => {
                            setPortalOpen(false);
                            setSessionFlag('ps_reopen_messages', '1');
                            void openCasePage(ref, 'report', { state: { fromMessages: true, openInternalNotes: true } });
                          }}>
                            {t('appShell.thread.caseLinkLabel', { caseNumber: ref })}
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          </button>
                        ))}
                        {(currentMsg as any).configLink && (
                          <button
                            className="ps-msg-config-link"
                            title={t('appShell.thread.openConfigTitle')}
                            onClick={() => {
                              // PS-344: the link comes from stored message data, so only a
                              // same-site path is followed (utils/safeInternalPath.ts).
                              const link = safeInternalPath((currentMsg as any).configLink);
                              if (!link) return;
                              setPortalOpen(false);
                              navigate(link);
                              // If the link targets a system section, fire the nav event after a tick
                              const params = new URLSearchParams(link.split('?')[1] ?? '');
                              const section = params.get('section');
                              if (section) {
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent('PATHSCRIBE_SYSTEM_NAVIGATE', { detail: { section } }));
                                }, 150);
                              }
                            }}
                          >
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            {t('appShell.thread.openConfigButton')}
                          </button>
                        )}
                      </div>
                    </div>
                    <button className="ps-msg-close-btn ps-msg-close-btn--thread" onClick={handleCloseDrawer} aria-label={t('appShell.drawer.closeAriaLabel')} title={t('appShell.drawer.closeAriaLabel')}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </>
                ) : isComposing ? (
                  <>
                    <span className="ps-msg-compose-title">{t('appShell.drawer.composeTitle')}</span>
                    <button className="ps-msg-close-btn" onClick={handleCloseDrawer} aria-label={t('appShell.drawer.closeAriaLabel')} title={t('appShell.drawer.closeAriaLabel')}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </>
                ) : (
                  <button className="ps-msg-close-btn ps-msg-close-btn--empty" onClick={handleCloseDrawer} aria-label={t('appShell.drawer.closeAriaLabel')} title={t('appShell.drawer.closeAriaLabel')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* ── Body ── */}
            <div className="ps-msg-body">

              {/* LEFT SIDEBAR */}
              <MessageListPanel
                messages={displayMessages} userId={userId}
                selectedMsgId={selectedMsgId}
                hoveredMsgId={hoveredMsgId}
                isEditing={isEditing}
                selectedIds={selectedIds}
                filterType={filterType}
                loading={loading}
                isComposing={isComposing}
                searchText={searchText}
                onHover={setHoveredMsgId}
                onSelect={(id) => { setSelectedMsgId(id); handleMarkRead(id); }}
                onToggleCheck={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                onSoftDelete={handleSoftDelete}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
                onSearchChange={setSearchText}
                onBulkMarkRead={handleBulkMarkRead}
                onBulkDelete={handleBulkDelete}
                onEmptyDeleted={handleEmptyDeleted}
                onCompose={() => { setPreviousMsgId(selectedMsgId); setSelectedMsgId(null); setIsComposing(true); setInputText(''); }}
                onSecureEmail={handleSecureEmail}
              />

              {/* RIGHT CONTENT */}
              <div className="ps-msg-content">
                {isComposing ? (
                  <ComposePanel
                    directory={directory}
                    sendError={sendError}
                    recipients={newRecipients}
                    toInput={newToInput}
                    subject={newSubject}
                    body={newBody}
                    isUrgent={isUrgentNew}
                    showUserSearch={showUserSearch}
                    toDropdownOpen={toDropdownOpen}
                    toHighlightIdx={toHighlightIdx}
                    toInputRef={toInputRef}
                    onRecipientsChange={setNewRecipients}
                    onToInputChange={setNewToInput}
                    onSubjectChange={setNewSubject}
                    onBodyChange={(v) => { setNewBody(v); setIsDirty(v.length > 0); }}
                    onUrgentToggle={() => setIsUrgentNew(p => !p)}
                    onToDropdownOpenChange={setToDropdownOpen}
                    onToHighlightIdxChange={setToHighlightIdx}
                    onShowUserSearch={setShowUserSearch}
                    onCancel={() => { setIsComposing(false); setSelectedMsgId(previousMsgId); }}
                    onSend={handleSendNew}
                    onSecureEmail={handleSecureEmail}
                  />
                ) : selectedMsgId && currentMsg ? (
                  <ThreadPanel
                    sendError={sendError}
                    message={currentMsg}
                    userId={userId}
                    inputText={inputText}
                    onInputChange={(v) => { setInputText(v); setIsDirty(v.length > 0); }}
                    onSend={handleSend}
                    onSoftDelete={() => handleSoftDelete(selectedMsgId)}
                    onMarkUnread={() => setMessages(prev => prev.map(m => m.id === selectedMsgId ? { ...m, isRead: false } : m))}
                    onCreateTemplate={(msgId) => {
                      setPortalOpen(false);
                      navigate(`/template-editor/new?from=request&requestId=${msgId}`);
                    }}
                  />
                ) : (
                  <div className="ps-msg-empty-state">
                    <svg className="ps-msg-empty-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p className="ps-msg-empty-text">{t('appShell.drawer.emptyStateText')}</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </>,
        document.body
      )}
      {/* Secure Email Modal */}
      <SecureEmailModal
        isOpen={secureEmailOpen}
        fromName={user?.name ?? 'Dr. Paul Carter'}
        fromEmail={user?.id === 'PATH-UK-001' ? 'paul.carter@mft.nhs.uk' : 'pathscribe@hospital.org'}
        prefillSubject={newSubject}
        prefillBody={newBody}
        onClose={() => setSecureEmailOpen(false)}
      />
      {/* User search modal for compose To: field */}
      {showUserSearch && (
        <div className="ps-user-search-overlay">
          <UserSearchOverlay
            directory={directory}
            alreadyAdded={newRecipients.map(r => r.id)}
            onSelect={(u) => { setNewRecipients(prev => [...prev, u]); setShowUserSearch(false); toInputRef.current?.focus(); }}
            onClose={() => setShowUserSearch(false)}
          />
        </div>
      )}



      {/* MODALS */}
      {systemInfoOpen && <SystemInfoModal onClose={() => setSystemInfoOpen(false)} />}
      {myDictionaryOpen && <MyDictionaryModal onClose={() => setMyDictionaryOpen(false)} />}
      {myVoiceCommandsOpen && <MyVoiceCommandsModal onClose={() => setMyVoiceCommandsOpen(false)} />}
      {biometricOpen && <BiometricSigningModal mode="manage" onClose={() => setBiometricOpen(false)} />}
      {/* Batch 433: invited to enrol after sign-in when the lab has turned biometric signing on. */}
      {showBiometricWizard && !biometricOpen && <BiometricSigningModal mode="invite" onClose={() => setShowBiometricWizard(false)} />}

      {aboutOpen && (
        <div className="ps-overlay" onClick={() => setAboutOpen(false)}>
          <div className="ps-modal-dark ps-modal-dark--about" onClick={e => e.stopPropagation()}>
            <div className="ps-about-avatar">{userInitials}</div>
            <h2 className="ps-about-name">{user?.name || 'Dr. Sarah Johnson'}</h2>
            <div className="ps-about-role">{user?.role ?? t('appShell.aboutModal.roleFallback')}</div>

            <div className="ps-about-menu">
              {/* Batch 669c (Pete, Oct 24, 2026): the guides open from the top-bar Help buttons only; the old embedded PDFs are gone. */}
              {/* Batch 432: the person's own spelling dictionary and learned voice commands. */}
              <button onClick={() => { setAboutOpen(false); setMyDictionaryOpen(true); }} className="ps-about-menu-item">
                {t('profileMenu.myDictionary.title')}
              </button>
              <div className="ps-about-menu-divider" />
              <button onClick={() => { setAboutOpen(false); setMyVoiceCommandsOpen(true); }} className="ps-about-menu-item">
                {t('profileMenu.myVoiceCommands.title')}
              </button>
              {biometricEnabled && (
                <>
                  <div className="ps-about-menu-divider" />
                  <button onClick={() => { setAboutOpen(false); setBiometricOpen(true); }} className="ps-about-menu-item">
                    {t('profileMenu.biometric.title')}
                  </button>
                </>
              )}
              <div className="ps-about-menu-divider" />
              <button
                onClick={() => { setAboutOpen(false); setSystemInfoOpen(true); }}
                className="ps-about-menu-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
                {t('appShell.aboutModal.systemInformation')}
              </button>
            </div>

            <button
              onClick={() => setAboutOpen(false)}
              className="ps-btn-ghost-teal ps-btn-ghost-teal--full"
            >
              {t('appShell.aboutModal.closeButton')}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        show={!!pendingPermanentDeleteId}
        title={t('appShell.confirmModals.permanentDeleteTitle')}
        message={t('appShell.confirmModals.permanentDeleteMessage')}
        confirmLabel={t('common.delete')}
        onConfirm={confirmPermanentDelete}
        onCancel={() => setPendingPermanentDeleteId(null)}
      />
      <ConfirmModal
        show={pendingEmptyDeletedCount !== null}
        title={t('appShell.confirmModals.emptyDeletedTitle')}
        message={t('appShell.confirmModals.emptyDeletedMessage', { count: pendingEmptyDeletedCount ?? 0 })}
        confirmLabel={t('appShell.confirmModals.deleteAllButton')}
        onConfirm={confirmEmptyDeleted}
        onCancel={() => setPendingEmptyDeletedCount(null)}
      />
      <ConfirmModal
        show={pendingBulkDeleteCount !== null}
        title={t('appShell.confirmModals.bulkDeleteTitle')}
        message={t('appShell.confirmModals.bulkDeleteMessage', { count: pendingBulkDeleteCount ?? 0 })}
        confirmLabel={t('common.delete')}
        onConfirm={confirmBulkDelete}
        onCancel={() => setPendingBulkDeleteCount(null)}
      />
      <ConfirmModal
        show={pendingCloseDrawer}
        title={t('appShell.confirmModals.unsentTitle')}
        message={t('appShell.confirmModals.unsentMessage')}
        confirmLabel={t('common.close')}
        onConfirm={confirmCloseDrawer}
        onCancel={() => setPendingCloseDrawer(false)}
      />
    </div>
  );
};

export default AppShell;
