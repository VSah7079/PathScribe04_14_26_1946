// src/hooks/useConsultLinkToken.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 522 (PS-290): the bearer token of an outside consult link, read once
// from the page address, and two protections while the page is open:
//
//   - The token is taken from after `#` (or from the path, for links issued
//     before Batch 522), then removed from the address bar, so it isn't left
//     in the browser's history or shown over the consultant's shoulder.
//   - The page sends no Referer header (<meta name="referrer"
//     content="no-referrer">), so following any link from it can't pass the
//     address on.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { consultTokenFromLocation } from '@/services/consultAccess/consultLinkRules';

export function useConsultLinkToken(): string | null {
  const { token: pathToken } = useParams<{ token: string }>();
  const [token] = useState(() => consultTokenFromLocation(pathToken, window.location.hash));

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  return token;
}
