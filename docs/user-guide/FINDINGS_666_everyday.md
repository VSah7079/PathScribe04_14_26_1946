# Findings: everyday group (Messaging, Notifications, Personal Settings, Case Flags and extras)

Behaviour described in the articles as it is today. No source code was changed.

| # | Where | Finding |
|---|---|---|
| 1 | Messaging | A person's own sent messages appear in their list, shown unread and counted in their unread badge. — Fixed in Batch 669. Refined in Batch 669f: unread is decided only through `isUnreadFor(message, currentUserId)`; Mark as unread is disabled when you wrote last. |
| 2 | Messaging | Inbox mixes sent and received; the row title shows the sender name. |
| 3 | Messaging | A reply overwrites the message body and preview; the other party's message is not set unread again (one shared read flag on the demonstration record). — Fixed in Batch 669. Refined in Batch 669f: a reply moves its conversation to the top of the list. |
| 4 | Messaging | On the compose form the Secure Email button needs recipient, subject and body filled to be enabled, while the footer button opens it directly. |
| 5 | Messaging | Message search does not cover the subject. |
| 6 | Messaging | The case link from a message asks for the Internal Notes drawer, but only the full report route (/report/:caseId) honours it; the synoptic route does not. |
| 7 | Messaging | Automatic system notices have no reply route. |
| 8 | Messaging | Secure email is simulated (no gateway); System Information lists it as "Not wired (stub)". |
| 9 | Messaging | The recipient directory is a demonstration list. |
| 10 | Notifications | There is no bell or notification centre; signals are spread across the top bar. |
| 11 | Notifications | Automatic critical-alert channels (secure email, SMS, EHR push) are stubs labelled Simulated. |
| 12 | Personal Settings | Learned dictation corrections are stored per person but there is no screen to view or remove them. |
| 13 | Personal Settings | No personal signature setting and no app-wide theme toggle exist. |
| 14 | Personal Settings | Compact report header and editor light/dark are per browser, not per person. |
| 15 | Personal Settings | Personal macros live in Configuration, which pathologist and accessioner roles do not open by default, so many users cannot reach My Macros. |
| 16 | Personal Settings | Admin Guide menu item is labelled "all users in demo". |
| 17 | Case Flags | Audit events flag_applied / flag_removed are written when a chip is added or removed in the draft, so Cancel leaves audit entries for changes never saved. — Fixed in Batch 669. |
| 18 | Case Flags | The "Applied by LIS — cannot be removed" lock is dead code (the LIS marker is always false). |
| 19 | Case Flags | Flag cards give no visible disabled state or message without the apply permission; Remove does show a tooltip. |
| 20 | Case Flags | Every Worklist flag chip is the same grey (no colour field in the catalogue); severity colour shows only in the manager. |
| 21 | Case Flags | Alt+F is Open Flag Manager on the report but Open Search elsewhere; Alt+Shift+R is Reply in Messages but Read Flags on the Worklist. |
| 22 | Case Flags | "Apply STAT Flag" (Alt+S) only opens the Flag Manager; it does not apply STAT. — Fixed in Batch 669. |
| 23 | Case Flags | The Worklist has no tile or filter for flags. |
| 24 | Clinical Links | The Quick Links (Resources) window has no visible button; it opens only by Alt+Q or voice on Worklist, Search and Audit Log. |
| 25 | Personal Settings | Language list shows eight entries (six languages plus two Belgian variants); Korean and others are machine translated and need native review. |
