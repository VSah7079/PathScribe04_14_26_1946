import React from 'react';
import { useSearchParams } from 'react-router-dom';

interface MockEMRPageProps {
  /** Optional — when provided (embedded modal use), takes priority over
   *  the URL search param. Falls back to the ?patientId= query param so
   *  this still works standalone at the real /mock-emr route. */
  patientId?: string;
}

const MockEMRPage: React.FC<MockEMRPageProps> = ({ patientId: patientIdProp }) => {
  const [searchParams] = useSearchParams();
  const patientId = patientIdProp ?? searchParams.get('patientId') ?? '100004';

  const isMartinez = patientId === '100004';
  const patientName = isMartinez ? 'MARTINEZ, DAVID' : 'THOMPSON, GRACE';
  const dob = isMartinez ? '05/30/1955' : '11/12/1982';
  const gender = isMartinez ? 'Male' : 'Female';

  const systemFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  return (
    <div style={{ background: '#f3f4f6', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: systemFont, color: '#111827' }}>

      {/* NHS BANNER */}
      <div style={{ background: '#005eb8', color: 'white', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: '#fff', color: '#005eb8', padding: '2px 8px', borderRadius: '2px', fontWeight: '900' }}>NHS</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{patientName}</h1>
            <span style={{ fontSize: '14px' }}>DOB: {dob} ({gender}) • MRN: {patientId}</span>
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
