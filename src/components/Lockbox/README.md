# components/Lockbox/

Batch 645: `LockboxNavigation.tsx`, the "Go to Lockbox Drop-Off" command. The action registry dispatches `PATHSCRIBE_OPEN_LOCKBOX_DROP_OFF` (voice, Alt+Shift+Z, or Alt+J then Shift+Z); this component, mounted once in `SignedInApp.tsx`, opens `/lockbox-drop-off` through the shared unsaved-changes guard (`requestNavigate`). It exists because `AppShell.tsx` (over 1,000 lines) may not grow. It renders nothing. The route is behind `ScreenGate`, so a person without `screen:lockbox-drop-off:open` gets the access message. The screen itself is `pages/LockboxDropOffPage/`.
