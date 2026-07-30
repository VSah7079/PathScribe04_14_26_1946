/**
 * ClientEditorModal.tsx
 * Located at: src/components/ClientDictionary/ClientEditorModal.tsx
 *
 * Add / Edit modal for a single client.
 * Props:
 *   isOpen  -- boolean
 *   onClose -- () => void
 *   client  -- Client | undefined (undefined = add mode, Client = edit mode)
 *   onSave  -- (input: ClientInput) => void — parent owns the actual
 *              clientService.add/update call, same convention as
 *              PhysiciansSection.tsx / SpecimenCategoriesSection.tsx
 */

import React, { useState, useEffect } from "react";
import '../../pathscribe.css';
import type { Client, ClientInput } from "../../services/clients/IClientService";
import { JURISDICTION_LABELS, type Jurisdiction } from "../../types/systemConfig";
import { SUFFIX_PRESETS, isPresetSuffix } from "../../utils/personName";

interface ClientEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Existing client to edit, or undefined to add a new one. Passed
   *  directly rather than a clientId + internal lookup — matches
   *  PhysiciansSection/SpecimenCategoriesSection's convention, and
   *  removes the dependency on the retiring useClientDictionary context. */
  client?: Client;
  onSave: (input: ClientInput) => void;
  /** Full client list, used to populate the Parent Institution dropdown
   *  when Type is set to Internal — e.g. picking which NHS Trust a
   *  hospital is an affiliate of. */
  allClients: Client[];
}

// ─── Static data (extracted to avoid inline type assertions in JSX) ───────────

type ReportingOption = [keyof Client['reporting'], string];

const REPORTING_OPTIONS: ReportingOption[] = [
  ['autoRelease',     'Auto-release reports on finalization'],
  ['copyToReferring', 'Copy report to referring physician'],
];

type EscalationTarget = 'pathGroup' | 'admin' | 'referrer';
type EscalationOption = [EscalationTarget, string];

const ESCALATION_TARGETS: EscalationOption[] = [
  ['pathGroup', 'Pathology Group - all pathologists assigned to this client'],
  ['admin',     'Lab Administrator - the lab admin receives the alert'],
  ['referrer',  'Referring Physician - the requesting clinician is notified'],
];

// ─── Blank form state ─────────────────────────────────────────────────────────

const blank = (): ClientInput => ({
  name: "",
  clientType: "external",
  jurisdiction: "US",
  specimenLabelStyle: "alpha-specimen",
  assigningAuthority: "",
  contactNamePrefix: "",
  contactGivenNames: "",
  contactFamilyNames: "",
  contactPreferredName: "",
  contactNameSuffix: "",
  email: "",
  phone: "",
  fax: "",
  address: "",
  status: "Active",
  hl7: {
    sendingFacility: "pathscribe",
    receivingFacility: "",
    hl7Version: "2.5.1",
    enabled: false,
  },
  reporting: {
    reportFormat: "PDF",
    deliveryMethod: "Portal",
    autoRelease: false,
    copyToReferring: false,
  },
  pediatricAgeThreshold: null,
  authorizedPediatricPathologistIds: [],
  tatFirstTouchHours: null,
  tatTotalHours:      null,
  escalationTargets:  [],
  escalationPriority: 'high',
  internalAiOrchestratorEnabled: null,
  idleTimeoutMinutesOverride: null,
});

// ─── Style constants ──────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: "13px",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "7px",
  outline: "none",
  boxSizing: "border-box",
  color: "#e2e8f0",
  background: "#0f172a",
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  color: "#475569",
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const SECTION: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#0891b2",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: "12px",
  paddingBottom: "6px",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode; span?: boolean }> = ({
  label, children, span,
}) => (
  <div style={span ? { gridColumn: "1 / -1" } : {}}>
    <label style={LABEL}>{label}</label>
    {children}
  </div>
);

const onF = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  (e.currentTarget.style.borderColor = "#0891b2");

const onB = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)");

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "general" | "hl7" | "reporting" | "tat";

// ─── Component ────────────────────────────────────────────────────────────────

export const ClientEditorModal: React.FC<ClientEditorModalProps> = ({
  isOpen,
  onClose,
  client,
  onSave,
  allClients,
}) => {
  const isEdit = !!client;

  const [form, setForm] = useState<ClientInput>(blank);
  const [tab,  setTab]  = useState<Tab>("general");
  const [errors, setErrors] = useState<Partial<Record<keyof ClientInput, string>>>({});
  const [saved, setSaved]   = useState(false);
  const [contactSuffixCustom, setContactSuffixCustom] = useState(!isPresetSuffix(form.contactNameSuffix));

  useEffect(() => {
    if (!isOpen) return;
    if (client) {
      const { id, createdAt, updatedAt, ...input } = client;
      setForm(input);
      setContactSuffixCustom(!isPresetSuffix(client.contactNameSuffix));
    } else {
      setForm(blank());
      setContactSuffixCustom(false);
    }
    setTab("general");
    setErrors({});
    setSaved(false);
  }, [isOpen, client]);

  if (!isOpen) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const set = (key: keyof ClientInput, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setHL7 = (key: keyof Client["hl7"], val: unknown) =>
    setForm((f) => ({ ...f, hl7: { ...f.hl7, [key]: val } }));

  const setReporting = (key: keyof Client["reporting"], val: unknown) =>
    setForm((f) => ({ ...f, reporting: { ...f.reporting, [key]: val } }));

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Client name is required";
    if (!form.assigningAuthority.trim()) e.assigningAuthority = "Assigning Authority is required";
    if (!form.email.trim() || !form.email.includes("@"))
      e.email = "Valid email required";
    if (form.hl7.enabled && !form.hl7.receivingFacility.trim())
      (e as Record<string, string>).hl7 = "Receiving facility is required when HL7 is enabled";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!validate()) return;
    onSave(form);
    setSaved(true);
    setTimeout(() => { onClose(); }, 800);
  };

  // ── Tab styling ─────────────────────────────────────────────────────────────

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    borderBottom: tab === t ? "2px solid #0891b2" : "2px solid transparent",
    color: tab === t ? "#0891b2" : "#64748b",
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
className="ps-overlay" style={{ zIndex: 9000 }}
      onClick={onClose}
    >
      <div
className="ps-client-editor-shell"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header + tab bar ── */}
        <div className="ps-client-editor-header">
          <div className="ps-client-editor-header-row">
            <h2 className="ps-client-editor-title">
              {isEdit ? "Edit Client" : "Add Client"}
            </h2>
            <button
              onClick={onClose}
className="ps-modal-close"
            >&#x2715;</button>
          </div>
          <div className="ps-client-editor-tabs">
            <button style={tabStyle("general")}   onClick={() => setTab("general")}>General</button>
            <button style={tabStyle("hl7")}        onClick={() => setTab("hl7")}>HL7 Integration</button>
            <button style={tabStyle("reporting")}  onClick={() => setTab("reporting")}>Reporting</button>
            <button style={tabStyle("tat")}        onClick={() => setTab("tat")}>TAT &amp; Escalation</button>
          </div>
        </div>

        {/* ── Body — all four tabs live inside this scrollable div ── */}
        <div className="ps-client-editor-body">

          {/* General */}
          {tab === "general" && (
            <div className="ps-client-editor-form">
              <div style={SECTION}>Client Details</div>
              <div style={grid2}>
                <Field label="Client Name *" span>
                  <input
                    className={`ps-modal-dark-input${errors.name ? " ps-modal-dark-input--error" : ""}`}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    onFocus={onF} onBlur={onB}
                    placeholder="e.g. Northwest Oncology Group"
                  />
                  {errors.name && <div className="ps-client-editor-field-error">{errors.name}</div>}
                </Field>
                <Field label="Assigning Authority *">
                  <input
                    className={`ps-modal-dark-input${errors.assigningAuthority ? " ps-modal-dark-input--error" : ""}`} style={{ fontFamily: "monospace", textTransform: "uppercase" as const }}
                    value={form.assigningAuthority}
                    onChange={(e) => set("assigningAuthority", e.target.value.toUpperCase())}
                    onFocus={onF} onBlur={onB}
                    placeholder="e.g. NWOG"
                    maxLength={10}
                  />
                  {errors.assigningAuthority && <div className="ps-client-editor-field-error">{errors.assigningAuthority}</div>}
                </Field>
                <Field label="Status">
                  <select
                    style={INPUT}
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                    onFocus={onF} onBlur={onB}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    {/* Unverified is only ever set by order-intake auto-creation,
                        not a state an admin manually assigns — so it's shown
                        here (read-only-ish, via disabled) only when already set,
                        rather than offered as a normal choice. */}
                    {form.status === 'Unverified' && <option value="Unverified" disabled>Unverified (verify via table action)</option>}
                  </select>
                </Field>
                <Field label="Type">
                  <select
                    style={INPUT}
                    value={form.clientType}
                    onChange={(e) => set("clientType", e.target.value)}
                    onFocus={onF} onBlur={onB}
                  >
                    <option value="external">External — independent submitting practice</option>
                    <option value="internal">Internal — affiliated site of this institution</option>
                  </select>
                </Field>
                <Field label="Jurisdiction">
                  <select
                    style={INPUT}
                    value={form.jurisdiction}
                    onChange={(e) => set("jurisdiction", e.target.value)}
                    onFocus={onF} onBlur={onB}
                  >
                    {(Object.entries(JURISDICTION_LABELS) as [Jurisdiction, string][]).map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Specimen / Block Labeling">
                  <select
                    style={INPUT}
                    value={form.specimenLabelStyle ?? 'alpha-specimen'}
                    onChange={(e) => set("specimenLabelStyle", e.target.value)}
                    onFocus={onF} onBlur={onB}
                  >
                    <option value="alpha-specimen">Specimen A, B, C / Block A1, A2, A3</option>
                    <option value="numeric-specimen">Specimen 1, 2, 3 / Block 1A, 1B, 1C</option>
                  </select>
                </Field>
                {form.clientType === 'internal' && (
                  <Field label="Parent Institution">
                    <select
                      style={INPUT}
                      value={form.parentId ?? ''}
                      onChange={(e) => set("parentId", e.target.value || undefined)}
                      onFocus={onF} onBlur={onB}
                    >
                      <option value="">None — this is the top-level institution</option>
                      {allClients
                        .filter(c => c.clientType === 'internal' && c.id !== client?.id)
                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                )}
                {form.clientType === 'internal' && (
                  <Field label="AI Orchestrator (narrative auto-draft)">
                    <select
                      style={INPUT}
                      value={
                        form.internalAiOrchestratorEnabled === true  ? 'on'
                        : form.internalAiOrchestratorEnabled === false ? 'off'
                        : 'inherit'
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        set("internalAiOrchestratorEnabled", v === 'inherit' ? null : v === 'on');
                      }}
                      onFocus={onF} onBlur={onB}
                    >
                      <option value="inherit">Inherit organisation default (Configuration → AI Behavior)</option>
                      <option value="on">Enabled for this lab</option>
                      <option value="off">Disabled for this lab</option>
                    </select>
                  </Field>
                )}
                {form.clientType === 'internal' && (
                  <Field label="Idle session timeout override">
                    <select
                      style={INPUT}
                      value={form.idleTimeoutMinutesOverride == null ? 'inherit' : String(form.idleTimeoutMinutesOverride)}
                      onChange={(e) => {
                        const v = e.target.value;
                        set("idleTimeoutMinutesOverride", v === 'inherit' ? null : Number(v));
                      }}
                      onFocus={onF} onBlur={onB}
                    >
                      <option value="inherit">Inherit organisation default (Configuration → System)</option>
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="20">20 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </Field>
                )}
              </div>

              <div style={SECTION}>Contact</div>
              <div style={grid2}>
                <Field label="Contact Prefix">
                  <select style={INPUT} value={form.contactNamePrefix ?? ''} onChange={(e) => set("contactNamePrefix", e.target.value)} onFocus={onF} onBlur={onB}>
                    <option value="">None</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mx.">Mx.</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </Field>
                <Field label="Contact Suffix">
                  {contactSuffixCustom ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input style={INPUT} value={form.contactNameSuffix ?? ''} onChange={(e) => set("contactNameSuffix", e.target.value)} onFocus={onF} onBlur={onB} placeholder="e.g. Esq., MD" />
                      <button type="button" onClick={() => { setContactSuffixCustom(false); set("contactNameSuffix", ""); }}
                        style={{ background: "none", border: "none", color: "#38bdf8", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", textDecoration: "underline" }}>
                        Use list
                      </button>
                    </div>
                  ) : (
                    <select style={INPUT} value={form.contactNameSuffix ?? ''} onChange={(e) => {
                      if (e.target.value === "__other__") { setContactSuffixCustom(true); set("contactNameSuffix", ""); }
                      else set("contactNameSuffix", e.target.value);
                    }} onFocus={onF} onBlur={onB}>
                      <option value="">None</option>
                      {SUFFIX_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="__other__">Other…</option>
                    </select>
                  )}
                </Field>
                <Field label="Contact Given Name(s)">
                  <input style={INPUT} value={form.contactGivenNames ?? ''} onChange={(e) => set("contactGivenNames", e.target.value)} onFocus={onF} onBlur={onB} placeholder="e.g. Jane" />
                </Field>
                <Field label="Contact Family Name(s)">
                  <input style={INPUT} value={form.contactFamilyNames ?? ''} onChange={(e) => set("contactFamilyNames", e.target.value)} onFocus={onF} onBlur={onB} placeholder="e.g. Smith" />
                </Field>
                <Field label="Contact Preferred Name" span>
                  <input style={INPUT} value={form.contactPreferredName ?? ''} onChange={(e) => set("contactPreferredName", e.target.value)} onFocus={onF} onBlur={onB} placeholder="Optional — what to call them" />
                </Field>
                <Field label="Email *">
                  <input
                    className={`ps-modal-dark-input${errors.email ? " ps-modal-dark-input--error" : ""}`}
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    onFocus={onF} onBlur={onB}
                    placeholder="contact@client.com"
                    type="email"
                  />
                  {errors.email && <div className="ps-client-editor-field-error">{errors.email}</div>}
                </Field>
                <Field label="Phone">
                  <input style={INPUT} value={form.phone} onChange={(e) => set("phone", e.target.value)} onFocus={onF} onBlur={onB} placeholder="555-000-0000" />
                </Field>
                <Field label="Address" span>
                  <input style={INPUT} value={form.address} onChange={(e) => set("address", e.target.value)} onFocus={onF} onBlur={onB} placeholder="123 Main St, City, State ZIP" />
                </Field>
              </div>
            </div>
          )}

          {/* HL7 */}
          {tab === "hl7" && (
            <div className="ps-client-editor-form">
              <div style={SECTION}>HL7 Integration</div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <input
                  type="checkbox"
                  id="hl7-enabled"
                  checked={form.hl7.enabled}
                  onChange={(e) => setHL7("enabled", e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#0891b2", cursor: "pointer" }}
                />
                <label htmlFor="hl7-enabled" style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", cursor: "pointer" }}>
                  Enable HL7 integration for this client
                </label>
              </div>

              <div style={{ opacity: form.hl7.enabled ? 1 : 0.45, pointerEvents: form.hl7.enabled ? "auto" : "none" }}>
                <div style={{ ...grid2, marginBottom: "12px" }}>
                  <Field label="Sending Facility (MSH-4)">
                    <input style={INPUT} value={form.hl7.sendingFacility} onChange={(e) => setHL7("sendingFacility", e.target.value)} onFocus={onF} onBlur={onB} placeholder="pathscribe" />
                  </Field>
                  <Field label="Receiving Facility (MSH-6)">
                    <input
                      style={{ ...INPUT, borderColor: (errors as Record<string, string>).hl7 ? "#ef4444" : "rgba(255,255,255,0.1)" }}
                      value={form.hl7.receivingFacility}
                      onChange={(e) => setHL7("receivingFacility", e.target.value)}
                      onFocus={onF} onBlur={onB}
                      placeholder="CLIENT_CODE"
                    />
                    {(errors as Record<string, string>).hl7 && (
                      <div className="ps-client-editor-field-error">
                        {(errors as Record<string, string>).hl7}
                      </div>
                    )}
                  </Field>
                  <Field label="HL7 Version">
                    <select style={INPUT} value={form.hl7.hl7Version} onChange={(e) => setHL7("hl7Version", e.target.value)} onFocus={onF} onBlur={onB}>
                      <option value="2.3">2.3</option>
                      <option value="2.4">2.4</option>
                      <option value="2.5">2.5</option>
                      <option value="2.5.1">2.5.1</option>
                      <option value="2.6">2.6</option>
                    </select>
                  </Field>
                </div>
              </div>

              {!form.hl7.enabled && (
                <div style={{ padding: "12px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid #fde047", borderRadius: "8px", fontSize: "12px", color: "#92400e" }}>
                  &#9888;&#65039; HL7 integration is disabled. Enable the toggle above to configure connection settings.
                </div>
              )}
            </div>
          )}

          {/* Reporting */}
          {tab === "reporting" && (
            <div className="ps-client-editor-form">
              <div style={SECTION}>Reporting Preferences</div>
              <div style={grid2}>
                <Field label="Report Format">
                  <select style={INPUT} value={form.reporting.reportFormat} onChange={(e) => setReporting("reportFormat", e.target.value)} onFocus={onF} onBlur={onB}>
                    <option value="PDF">PDF</option>
                    <option value="HL7">HL7</option>
                    <option value="Both">Both (PDF + HL7)</option>
                  </select>
                </Field>
                <Field label="Delivery Method">
                  <select style={INPUT} value={form.reporting.deliveryMethod} onChange={(e) => setReporting("deliveryMethod", e.target.value)} onFocus={onF} onBlur={onB}>
                    <option value="Email">Email</option>
                    <option value="Fax">Fax</option>
                    <option value="Portal">Portal</option>
                    <option value="HL7">HL7</option>
                  </select>
                </Field>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                {REPORTING_OPTIONS.map(([key, label]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <input
                      type="checkbox"
                      id={key}
                      checked={form.reporting[key] as boolean}
                      onChange={(e) => setReporting(key, e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "#0891b2", cursor: "pointer" }}
                    />
                    <label htmlFor={key} style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0", cursor: "pointer" }}>{label}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAT & Escalation */}
          {tab === "tat" && (
            <div className="ps-client-editor-form">
              <div style={SECTION}>Turnaround Time Targets</div>
              <div style={grid2}>
                <Field label="First Touch Target (hours)">
                  <input
                    style={INPUT}
                    type="number"
                    min={1}
                    max={168}
                    value={form.tatFirstTouchHours ?? ""}
                    onChange={(e) => set("tatFirstTouchHours", e.target.value === "" ? null : Number(e.target.value))}
                    onFocus={onF} onBlur={onB}
                    placeholder="4"
                  />
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                    Hours from received before first-open escalation fires. Blank = system default.
                  </div>
                </Field>
                <Field label="Total Case TAT Target (hours)">
                  <input
                    style={INPUT}
                    type="number"
                    min={1}
                    max={720}
                    value={form.tatTotalHours ?? ""}
                    onChange={(e) => set("tatTotalHours", e.target.value === "" ? null : Number(e.target.value))}
                    onFocus={onF} onBlur={onB}
                    placeholder="24"
                  />
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                    Hours from receivedDate to finalizedAt. Blank = system default.
                  </div>
                </Field>
              </div>

              <div style={SECTION}>Escalation Priority</div>
              <div style={{ maxWidth: "260px" }}>
                <Field label="Priority when threshold is breached">
                  <select
                    style={INPUT}
                    value={form.escalationPriority ?? "high"}
                    onChange={(e) => set("escalationPriority", e.target.value)}
                    onFocus={onF} onBlur={onB}
                  >
                    <option value="high">High - notify on next login</option>
                    <option value="critical">Critical - immediate notification</option>
                  </select>
                </Field>
              </div>

              <div style={SECTION}>Escalation Targets</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {ESCALATION_TARGETS.map(([key, label]) => (
                  <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <input
                      type="checkbox"
                      id={"esc-" + key}
                      checked={(form.escalationTargets ?? []).includes(key)}
                      onChange={(e) => {
                        const current = form.escalationTargets ?? [];
                        set("escalationTargets", e.target.checked ? [...current, key] : current.filter((x) => x !== key));
                      }}
                      style={{ width: "16px", height: "16px", accentColor: "#0891b2", cursor: "pointer", marginTop: "2px", flexShrink: 0 }}
                    />
                    <label htmlFor={"esc-" + key} style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0", cursor: "pointer", lineHeight: "1.4" }}>
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              <div style={{ padding: "12px 14px", background: "rgba(8,145,178,0.06)", border: "1px solid #bae6fd", borderRadius: "8px", fontSize: "12px", color: "#38bdf8" }}>
                When no escalation targets are selected, alerts are suppressed for this client.
                Leave blank to use system defaults (First Touch: 4h, Total TAT: 24h).
                Restricted cases (pediatric access control) always escalate at Critical regardless of this setting.
              </div>
            </div>
          )}

        </div>{/* end body */}

        {/* ── Footer ── */}
        <div className="ps-client-editor-footer">
          <button
            onClick={onClose}
            style={{ padding: "9px 20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
          >Cancel</button>
          <button
            onClick={handleSubmit}
            style={{ padding: "9px 24px", borderRadius: "8px", border: "none", background: saved ? "#10b981" : "#0891b2", color: "#0f172a", fontWeight: 700, fontSize: "13px", cursor: "pointer", transition: "background 0.2s" }}
          >
            {saved ? "Saved" : isEdit ? "Save Changes" : "Add Client"}
          </button>
        </div>

      </div>
    </div>
  );
};
