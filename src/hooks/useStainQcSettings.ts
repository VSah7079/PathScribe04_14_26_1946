// src/hooks/useStainQcSettings.ts
// Batch 763: the QC defaults (Configuration → System → Stain & scan QC): how a stainer's or scanner's output is signed
// off when the instrument has no mode of its own, and each stainer's and scanner's effective mode.
import { useCallback, useEffect, useState } from 'react';
import { equipmentService, stainQcService, type Equipment, type QcMode, type StainQcSettings } from '@/services';
import { DEFAULT_STAIN_QC_SETTINGS, qcModeFor } from '@/services/stainQc/stainQcRules';

export function useStainQcSettings(service = stainQcService) {
  const [draft, setDraft] = useState<StainQcSettings | null>(null);
  const [instruments, setInstruments] = useState<Equipment[]>([]);
  const [problem, setProblem] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    void service.getSettings().then(r => setDraft(r.ok ? r.data : DEFAULT_STAIN_QC_SETTINGS));
    void equipmentService.getAll().then(r => setInstruments(r.ok ? r.data.filter(e => e.kind === 'stainer' || e.kind === 'slide_scanner') : [])).catch(() => undefined);
  }, [service]);

  const set = useCallback((k: 'defaultStainerMode' | 'defaultScannerMode', v: QcMode) => {
    setSaved(false); setProblem(false); setDirty(true);
    setDraft(d => (d ? { ...d, [k]: v } : d));
  }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    const r = await service.saveSettings(draft);
    if (r.ok) { setDraft(r.data); setSaved(true); setDirty(false); } else setProblem(true);
  }, [draft, service]);

  const rows = draft
    ? instruments.map(e => ({ id: e.id, name: e.name, code: e.code, kind: e.kind, own: e.qcMode ?? null, effective: qcModeFor(e, draft, e.kind === 'stainer' ? 'stainer' : 'scanner') }))
    : [];
  return { draft, set, save, rows, problem, saved, dirty };
}
