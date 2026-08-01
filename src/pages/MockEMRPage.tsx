import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { caseRouter } from '@/services/cases/CaseRouter';
import { fromLegacyName, formatIdentificationName } from '@/utils/personName';

interface MockEMRPageProps {
  /** Optional — when provided (embedded modal use), takes priority over
   *  the URL search param. Falls back to the ?patientId= query param so
   *  this still works standalone at the real /mock-emr route. */
  patientId?: string;
}

// Real fix, found via a direct bug report: this used to hardcode exactly
// one recognized patientId ('100004' -> "MARTINEZ, DAVID") and silently
// show a completely unrelated patient ("THOMPSON, GRACE") for literally
// every other value — meaning any real case's actual patient MRN would
// show the wrong name. The launch itself was never broken
// (BottomActionBar.tsx already correctly passes the real
// caseData.patient.mrn) — this page just never looked it up. Per Pete's
// own principle: showing a wrong patient is worse than showing nothing,
// so a genuine "No Patient Found" state now replaces the second
// hardcoded guess rather than trading one wrong default for another.
const MockEMRPage: React.FC<MockEMRPageProps> = ({ patientId: patientIdProp }) => {
  const [searchParams] = useSearchParams();
  const patientId = patientIdProp ?? searchParams.get('patientId') ?? '';

  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [dob, setDob] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    caseRouter.getAll(undefined, { includeOrchestration: true, bypassAccessControl: true } as any)
      .then(res => {
        if (cancelled || !res.ok) { setLoading(false); return; }
        const match = (res.data as any[]).find(c => c?.patient?.mrn === patientId);
        if (match?.patient) {
          const p = match.patient;
          const name = p.givenNames && p.familyNames
            ? formatIdentificationName({ givenNames: p.givenNames, familyNames: p.familyNames })
            : formatIdentificationName(fromLegacyName(p.firstName ?? '', p.lastName ?? ''));
          setPatientName(name || null);
          setDob(p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('en-GB') : null);
          setGender(p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : p.sex === 'U' ? 'Unknown' : null);
        }
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId]);

  const systemFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  if (loading) {
    return (
      <div style={{ background: '#f3f4f6', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: systemFont, color: '#6b7280' }}>
        Looking up patient…
      </div>
    );
  }

  if (!patientName) {
    return (
      <div style={{ background: '#f3f4f6', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: systemFont, color: '#111827' }}>
        <div style={{ background: '#005eb8', color: 'white', padding: '12px 24px', flexShrink: 0 }}>
          <div style={{ background: '#fff', color: '#005eb8', padding: '2px 8px', borderRadius: '2px', fontWeight: 900, display: 'inline-block' }}>NHS</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#374151' }}>No Patient Found</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            {patientId ? `No record matches MRN ${patientId}` : 'No patient identifier was provided'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f3f4f6', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: systemFont, color: '#111827' }}>

      {/* NHS BANNER */}
      <div style={{ background: '#005eb8', color: 'white', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: '#fff', color: '#005eb8', padding: '2px 8px', borderRadius: '2px', fontWeight: '900' }}>NHS</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{patientName}</h1>
            <span style={{ fontSize: '14px' }}>
              {dob ? `DOB: ${dob}` : 'DOB: not recorded'}{gender ? ` (${gender})` : ''} • MRN: {patientId}
            </span>
          </div>
        </div>
        <div style={{ background: '#ffcc00', color: '#000', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
          DEMO: SYNTHETIC DATA
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'auto' }}>
        {/* LEFT COLUMN */}
        <div style={{ width: '280px', background: '#fff', borderRight: '1px solid #d1d5db', padding: '20px', flexShrink: 0 }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', marginBottom: '15px' }}>Encounter</h3>
          <p style={{ fontSize: '14px' }}><strong>Status:</strong> Admitted</p>
          <p style={{ fontSize: '14px' }}><strong>Ward:</strong> 4B (Urology)</p>

          <div style={{ marginTop: '30px', padding: '12px', background: '#eff6ff', borderRadius: '6px', fontSize: '12px', color: '#1e40af' }}>
            <strong>Integration Note:</strong> Production uses FHIR R4 API to sync with LIS.
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ flex: 1, padding: '24px', background: '#f8fafc' }}>
          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>Clinical Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Active Problems</h4>
                <ul style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <li>Elevated PSA (8.4 ng/mL)</li>
                  <li>Prostate PI-RADS 4 Lesion</li>
                </ul>
              </div>
              <div style={{ border: '1px solid #e5e7eb', padding: '15px', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Medications</h4>
                <ul style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <li>Metformin 500mg</li>
                  <li>Lisinopril 10mg</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockEMRPage;
