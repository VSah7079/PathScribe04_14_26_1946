// src/components/ValidationStudies/ModelStoreModal.tsx
// ─────────────────────────────────────────────────────────────
// The customer-facing half of the store workflow: browse what
// ForMedrixAI has published, download one into the local catalog.
// Opened from StudyFormModal's "AI Model Being Validated" field —
// per the direct workflow description, this is the point where an
// admin who got the "new model available" email actually goes to get
// it, before continuing the rest of the study form.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import '../../pathscribe.css';
import { mockModelStoreService, type StoreListing } from '../../services/models/mockModelStoreService';
import type { AIModel, ModelVendor } from '../../services/models/IModelService';

const VENDOR_LABEL: Record<ModelVendor, string> = {
  anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', other: 'Other',
};

interface ModelStoreModalProps {
  /** Fired once a download genuinely succeeds, with the new local
   *  AIModel record — caller is responsible for both refreshing its
   *  own models list and selecting the new one, this modal doesn't
   *  assume either. */
  onDownloaded: (model: AIModel) => void;
  onClose: () => void;
}

export const ModelStoreModal: React.FC<ModelStoreModalProps> = ({ onDownloaded, onClose }) => {
  const [listings, setListings] = useState<StoreListing[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Distinct from the general `error` state below — this specifically
   *  means "the org itself isn't entitled to browse the store at
   *  all," gating the whole catalog rather than one failed action.
   *  See mockModelStoreService's checkAuthorization for what a real
   *  implementation of this check would actually verify. */
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    mockModelStoreService.getAvailable().then(res => {
      if (res.ok) { setListings(res.data); }
      else { setAuthError((res as { ok: false; error: string }).error); }
      setLoading(false);
    });
  }, []);

  const handleDownload = async (listing: StoreListing) => {
    setDownloadingId(listing.storeId);
    setError(null);
    const res = await mockModelStoreService.download(listing.storeId);
    setDownloadingId(null);
    if (res.ok === false) { setError((res as { ok: false; error: string }).error); return; }
    onDownloaded((res as { ok: true; data: AIModel }).data);
  };

  return (
    <div className="ps-overlay" onClick={onClose} style={{ zIndex: 9600 }}>
      <div className="ps-modal-dark" style={{ width: 620, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="ps-modal-dark-header">
          <span className="ps-modal-dark-title">ForMedrixAI Store</span>
          <button className="ps-research-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>
          {authError ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Store access unavailable</div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>{authError}</div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
                Models ForMedrixAI has published following their own internal
                regression testing, not yet downloaded into your system. Downloading
                adds it here as <strong style={{ color: '#fbbf24' }}>Beta</strong> — advisory,
                never the default, zero cases processed — until your own Validation
                Study confirms it for your data.
              </p>

              {loading && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Loading store catalog…</div>
              )}

              {!loading && listings.length === 0 && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                  Nothing new right now — every published model is already in your system.
                </div>
              )}

              {error && (
                <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 12 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {listings.map(listing => (
              <div key={listing.storeId} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{listing.name} {listing.version}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 8, background: 'rgba(148,163,184,0.15)', color: '#cbd5e1' }}>
                        {VENDOR_LABEL[listing.vendor]}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                      Published {listing.releaseDate} · ForMedrixAI benchmark {listing.benchmarkAccuracy}%
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{listing.releaseNotes}</div>
                  </div>
                  <button
                    className="ps-conf-btn-primary"
                    style={{ flexShrink: 0, fontSize: 12, padding: '6px 14px' }}
                    disabled={downloadingId === listing.storeId}
                    onClick={() => handleDownload(listing)}
                  >
                    {downloadingId === listing.storeId ? 'Downloading…' : '⬇ Download'}
                  </button>
                </div>
              </div>
            ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
