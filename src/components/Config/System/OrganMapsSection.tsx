// src/components/Config/System/OrganMapsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: Configuration → System → Organ maps (Clinical Lookups).
// • Colours & patterns (Pete: "sites to be able to configure the colours and
//   patterns as they could be different across jurisdictions"): an
//   enterprise layer, a layer per jurisdiction and per facility; each holds
//   only what it overrides. Every colour keeps a pattern. Saving needs
//   config:organ-map-scheme:manage and is audited.
// • Map bindings (Pete: "PathScribe questions + bindings"): which of a
//   template's synoptic questions feed the map, and what each answer means.
//   PathScribe's own map questions bind themselves. Saving needs
//   config:organ-map-bindings:manage and is audited.
// The maps are always drawn from the synoptic answers; nothing here stores
// case data. Rendering only: the edits are pure functions in
// services/organMapping/organMapConfigDraft.ts, the saves in organMapConfig.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { OrganMapSvg } from '@/components/OrganMap/OrganMapSvg';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganMapConfig } from '@/hooks/useOrganMapConfig';
import { useReportConfigDirty } from '../configDirtyGuardContext';
import {
  allowedCoreValues, allowedSectorsValues, bindingProblemInputKey, breastBindableFields, BREAST_CLOCK_VALUES, BREAST_FACE_VALUES, BREAST_FOCI_COLUMNS,
  BREAST_MARGIN_COLUMNS, BREAST_SIDE_VALUES, BREAST_TYPE_VALUES, marginGridRows, withBreastFoci, withBreastFociColumn, withBreastFociValue, withBreastMarginColumn,
  withBreastMarginRow, withBreastMargins, withBreastSide, withBreastSideValue, type BreastInput, bindableFields, bindingDraftDirty, bindingDraftOf, CORE_COLUMN_KEYS, draftScheme,
  draftThresholds, fieldInputCandidates, fieldInputValueKey, organMapColorectalPreviews, organMapHeadNeckPreviews, organMapRenalPreviews, derivedKeysFor, derivedKeyLabelKey, derivedCandidates, derivedValueKey, derivedValues, marginKeysFor, withDerivedField, withDerivedValue, ENE_VALUES, NECK_COLUMNS, NECK_LEVEL_IDS, withNeckColumn, withNeckEneValue, withNeckGrid, withNeckRow, withFieldInput, withFieldInputValue, thresholdHintKey, withThresholdRow, withoutThresholdRow, emptyOrganMapBinding, organMapBreastPreview, organMapMohsPreview, inheritedOrganMapScheme, inheritedOrganMapThresholds, organMapConfigOutcome, withThreshold, organMapBindingStatus, organMapSchemePreview, schemeDraftDirty, schemeDraftOf,
  valueKindOfColumn, withChoiceField, withChoiceValue, withCoreColumn, withCoreGrid, withCoreValue, withoutSchemeOverride,
  withSchemeOverride, withSchemeValue, type CoreValueKind, organMapThresholdConflicts, type OralThresholdConflict,
} from '@/services/organMapping/organMapConfigDraft';
import { schemeLayerOf, type OrganMapSchemeScope } from '@/services/organMapping/organMapConfig';
import { FIELD_INPUT_SPECS, isFieldInputsBinding, SECTORS_INPUTS, type OrganMapBinding, type SectorsInput } from '@/services/organMapping/organMapBindings';
import { organMapDrawingLabels, organMapLabelsFor, organMapLegendLabel, organMapSectorName, organMapSectorSummary } from '@/services/organMapping/organMapLabels';
import { isThresholdProblem, MARGIN_OPERATORS, organMapSchemeVars, thresholdProblemValues, type OrganMapThresholds, THRESHOLD_LIMITS, THRESHOLD_ROWS, type MarginOperator, type NumericThresholdKey, type PartialScheme } from '@/services/organMapping/organMapScheme';
import { MAP_OVERLAYS, MAP_PATTERNS, MAP_STYLE_KEYS, ORGAN_MAP_TYPES, type MapPattern, type MapStyleKey, type OrganMapType } from '@/services/organMapping/organMapTypes';

const K = 'organMapsSection';
type Tab = 'scheme' | 'bindings';
type ScopeKind = OrganMapSchemeScope['kind'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Template = any;

// ── Colours & patterns ──────────────────────────────────────────────────────

/** A number box that lets the person clear it and type a new value: the text is
 *  kept as typed, and only a number reaches the draft (the save validates the range). */
const ThresholdInput: React.FC<{ id: string; thresholdKey: NumericThresholdKey; value: number; disabled: boolean; onCommit: (n: number) => void }> = ({ id, thresholdKey, value, disabled, onCommit }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => { if (Number(text) !== value) setText(String(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input id={id} className="ps-conf-input ps-organmap-config-number" type="number" step="0.1"
      min={THRESHOLD_LIMITS[thresholdKey].min} max={THRESHOLD_LIMITS[thresholdKey].max}
      disabled={disabled} value={text}
      onChange={e => { setText(e.target.value); const n = Number(e.target.value); if (e.target.value.trim() !== '' && Number.isFinite(n)) onCommit(n); }} />
  );
};

const SchemePanel: React.FC<{ cfg: ReturnType<typeof useOrganMapConfig> }> = ({ cfg }) => {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ScopeKind>('enterprise');
  const [code, setCode] = useState('');
  const jurisdictions = useMemo(() => [...new Set(cfg.facilities.map(f => f.jurisdiction).filter((j): j is string => !!j))].sort(), [cfg.facilities]);
  const scope: OrganMapSchemeScope | null = kind === 'enterprise' ? { kind } : code ? (kind === 'jurisdiction' ? { kind, code } : { kind, facilityId: code }) : null;
  const facilityJurisdiction = kind === 'facility' ? cfg.facilities.find(f => f.id === code)?.jurisdiction : undefined;
  const saved = scope ? schemeLayerOf(cfg.layers, scope) : undefined;
  const [draft, setDraft] = useState<PartialScheme>({});
  const [message, setMessage] = useState<string | null>(null);
  // The draft starts again when the level changes (and once the stored settings are read), not after a save,
  // so the save's message stays on screen.
  useEffect(() => { setDraft(scope ? schemeDraftOf(cfg.layers, scope) : {}); setMessage(null); }, [cfg.loaded, kind, code]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = schemeDraftDirty(draft, saved);
  useReportConfigDirty(dirty);
  const inherited = scope ? inheritedOrganMapScheme(cfg.layers, scope, facilityJurisdiction) : null;
  const inheritedThresholds = scope ? inheritedOrganMapThresholds(cfg.layers, scope, facilityJurisdiction) : null;
  const scheme = inherited ? draftScheme(inherited, draft) : null;
  const capContext = { facilityId: kind === 'facility' ? code || null : null };
  // Batch 465b (Pete): layers whose oral cavity rules conflict with what they inherit (named, with the distances).
  const conflicts = organMapThresholdConflicts(cfg.layers, Object.fromEntries(cfg.facilities.map(f => [f.id, f.jurisdiction ?? null])));
  const scopeName = (s: OralThresholdConflict['scope']) => (s.kind === 'enterprise' ? t(`${K}.scheme.scope.enterprise`)
    : s.kind === 'jurisdiction' ? t(`jurisdictionNames.${s.code}`, { defaultValue: s.code })
      : cfg.facilities.find(f => f.id === s.facilityId)?.name ?? s.facilityId);
  const conflictText = (c: OralThresholdConflict) => t(`${K}.thresholds.conflict`, { scope: scopeName(c.scope), involved: c.involvedMm, close: c.closeMm });

  const save = async (layer: PartialScheme | null) => {
    if (!scope) return;
    const o = organMapConfigOutcome(await cfg.saveLayer(scope, layer));
    if (o.kind === 'saved' && !layer) setDraft({});
    setMessage(o.kind === 'saved' ? [t(`${K}.scheme.saved`), ...(o.warnings ?? []).map(conflictText)].join(' ')
      : o.kind === 'notPermitted' ? t(`${K}.errors.notPermitted`)
        : o.problems.map(p => t(`${K}.errors.scheme.${p.problem}`, isThresholdProblem(p)
          ? { key: t(`${K}.thresholds.${p.key}`), ...thresholdProblemValues(p.key as keyof OrganMapThresholds) }
          : { key: organMapLegendLabel(t, scheme!, p.key as MapStyleKey) })).join(' '));
  };

  return (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t(`${K}.tabs.scheme`)}</div>
      <p className="ps-conf-field-hint">{t(`${K}.scheme.pairedHint`)}</p>
      {conflicts.length > 0 && (
        <ul className="ps-organmap-config-conflicts" role="alert">
          {conflicts.map((c, i) => <li key={i}>{conflictText(c)}</li>)}
        </ul>
      )}
      <div className="ps-conf-row-actions">
        <label className="ps-conf-label" htmlFor="organmap-scope">{t(`${K}.scheme.scopeLabel`)}</label>
        <select id="organmap-scope" className="ps-conf-select" value={kind} onChange={e => { setKind(e.target.value as ScopeKind); setCode(''); }}>
          {(['enterprise', 'jurisdiction', 'facility'] as ScopeKind[]).map(k => <option key={k} value={k}>{t(`${K}.scheme.scope.${k}`)}</option>)}
        </select>
        {kind === 'jurisdiction' && (
          <select className="ps-conf-select" aria-label={t(`${K}.scheme.pickJurisdiction`)} value={code} onChange={e => setCode(e.target.value)}>
            <option value="">{t(`${K}.scheme.pickJurisdiction`)}</option>
            {jurisdictions.map(j => <option key={j} value={j}>{t(`jurisdictionNames.${j}`, { defaultValue: j })}</option>)}
          </select>
        )}
        {kind === 'facility' && (
          <select className="ps-conf-select" aria-label={t(`${K}.scheme.pickFacility`)} value={code} onChange={e => setCode(e.target.value)}>
            <option value="">{t(`${K}.scheme.pickFacility`)}</option>
            {cfg.facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
      </div>
      {scope && inherited && scheme && (
        <div className="ps-organmap-config">
          <table className="ps-conf-table ps-organmap-config-table">
            <thead>
              <tr>
                <th>{t(`${K}.scheme.colKey`)}</th>
                <th>{t(`${K}.scheme.colColour`)}</th>
                <th>{t(`${K}.scheme.colPattern`)}</th>
                <th>{t(`${K}.scheme.colLabel`)}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {MAP_STYLE_KEYS.map(key => {
                const own = draft[key];
                const style = scheme[key];
                const patterns = MAP_PATTERNS.filter(p => p !== 'none' || key === 'benign' || key === 'notSampled');
                return (
                  <tr key={key}>
                    <td>{(MAP_OVERLAYS as readonly string[]).includes(key) ? t('organMap.details.separator', { a: t(`organMap.legend.${key}`), b: t(`${K}.scheme.overlay`) }) : t(`organMap.legend.${key}`)}</td>
                    <td>
                      <input type="color" className="ps-organmap-config-colour" aria-label={t(`${K}.scheme.colColour`)} value={style.colour} disabled={!own}
                        onChange={e => setDraft(withSchemeValue(draft, key, { colour: e.target.value }))} />
                    </td>
                    <td>
                      <select className="ps-conf-select" aria-label={t(`${K}.scheme.colPattern`)} value={style.pattern} disabled={!own}
                        onChange={e => setDraft(withSchemeValue(draft, key, { pattern: e.target.value as MapPattern }))}>
                        {patterns.map(p => <option key={p} value={p}>{t(`${K}.pattern.${p}`)}</option>)}
                      </select>
                    </td>
                    <td>
                      <input className="ps-conf-input" maxLength={40} aria-label={t(`${K}.scheme.colLabel`)} disabled={!own}
                        placeholder={t(`organMap.legend.${key}`)} value={own?.label ?? (own ? '' : inherited[key].label ?? '')}
                        onChange={e => setDraft(withSchemeValue(draft, key, { label: e.target.value }))} />
                    </td>
                    <td>
                      {own
                        ? <button type="button" className="ps-conf-btn-secondary" onClick={() => setDraft(withoutSchemeOverride(draft, key))}>{t(`${K}.scheme.useInherited`)}</button>
                        : <button type="button" className="ps-conf-btn-secondary" onClick={() => setDraft(withSchemeOverride(draft, key, inherited))}>{t(`${K}.scheme.override`)}</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Batch 462: the breast close-margin threshold (Pete: per site, 2 mm by default). Batch 464: the
              malignant-polyp and rectal CRM involved margins, each a distance and how it is compared (Pete). */}
          {THRESHOLD_ROWS.map(row => {
            const current = draftThresholds(inheritedThresholds!, draft);
            const own = draft.thresholds?.[row.key] !== undefined || (row.operator !== undefined && draft.thresholds?.[row.operator] !== undefined);
            return (
              <div key={row.key} className="ps-conf-row-actions ps-organmap-config-threshold">
                <label className="ps-conf-label" htmlFor={`organmap-threshold-${row.key}`}>{t(`${K}.thresholds.${row.key}`)}</label>
                {row.operator && (
                  <select className="ps-conf-select" aria-label={t(`${K}.thresholds.${row.operator}`)} disabled={!own} value={current[row.operator]}
                    onChange={e => setDraft(withThreshold(draft, row.operator!, e.target.value as MarginOperator))}>
                    {MARGIN_OPERATORS.map(op => <option key={op} value={op}>{t(`${K}.thresholds.operator.${op}`)}</option>)}
                  </select>
                )}
                <ThresholdInput id={`organmap-threshold-${row.key}`} thresholdKey={row.key} disabled={!own} value={current[row.key]}
                  onCommit={n => setDraft(withThreshold(draft, row.key, n))} />
                <span className="ps-conf-field-hint">{t(`${K}.thresholds.${thresholdHintKey(row.key)}`)}</span>
                {own
                  ? <button type="button" className="ps-conf-btn-secondary" onClick={() => setDraft(withoutThresholdRow(draft, row))}>{t(`${K}.scheme.useInherited`)}</button>
                  : <button type="button" className="ps-conf-btn-secondary" onClick={() => setDraft(withThresholdRow(draft, row, inheritedThresholds!))}>{t(`${K}.scheme.override`)}</button>}
              </div>
            );
          })}
          <div className="ps-organmap-config-preview" style={organMapSchemeVars(scheme) as React.CSSProperties}>
            <div className="ps-conf-label">{t(`${K}.scheme.preview`)}</div>
            {(() => {
              const preview = organMapSchemePreview(scheme);
              return (
                <>
                  <OrganMapSvg payload={preview} scheme={scheme} labels={organMapDrawingLabels(t, preview.mapType, scheme)} summaryOf={s => organMapSectorSummary(t, preview.mapType, s, scheme)} />
                  <ul className="ps-organmap-legend ps-organmap-legend--light">
                    {preview.legend.map(l => <li key={l.key} className="ps-organmap-legend-item">{t('organMap.details.separator', { a: organMapLegendLabel(t, scheme, l.key), b: t(`${K}.pattern.${l.pattern}`) })}</li>)}
                  </ul>
                  {(() => {
                    const breast = organMapBreastPreview(scheme, draftThresholds(inheritedThresholds!, draft));
                    return <OrganMapSvg payload={breast} scheme={scheme} labels={organMapLabelsFor(t, breast, scheme)} summaryOf={x => organMapSectorSummary(t, breast.mapType, x, scheme, breast.side)} />;
                  })()}
                  {(() => {
                    const mohs = organMapMohsPreview(scheme);
                    return <OrganMapSvg payload={mohs} scheme={scheme} labels={organMapLabelsFor(t, mohs, scheme)} summaryOf={x => organMapSectorSummary(t, mohs.mapType, x, scheme)} />;
                  })()}
                  {[...organMapColorectalPreviews(scheme, draftThresholds(inheritedThresholds!, draft)), ...organMapHeadNeckPreviews(scheme, draftThresholds(inheritedThresholds!, draft)), ...organMapRenalPreviews(scheme, draftThresholds(inheritedThresholds!, draft))].map((p, i) => (
                    <OrganMapSvg key={i} payload={p} scheme={scheme} labels={organMapLabelsFor(t, p, scheme)} summaryOf={x => organMapSectorSummary(t, p.mapType, x, scheme)} />
                  ))}
                </>
              );
            })()}
          </div>
          <div className="ps-conf-row-actions">
            {message && <span className="ps-conf-field-hint" role="status">{message}</span>}
            <CapabilityButton capability="config:organ-map-scheme:manage" context={capContext} className="ps-conf-btn-secondary" disabled={!saved} onClick={() => { void save(null); }}>
              {t(`${K}.scheme.reset`)}
            </CapabilityButton>
            <CapabilityButton capability="config:organ-map-scheme:manage" context={capContext} className="ps-conf-btn-primary" disabled={!dirty} onClick={() => { void save(draft); }}>
              {t('common.save')}
            </CapabilityButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Map bindings ────────────────────────────────────────────────────────────

const ValueSelect: React.FC<{ values: readonly string[]; value: string; label: (v: string) => string; onChange: (v: string) => void; ariaLabel: string }> = ({ values, value, label, onChange, ariaLabel }) => {
  const { t } = useTranslation();
  return (
    <select className="ps-conf-select" aria-label={ariaLabel} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{t(`${K}.bindings.ignore`)}</option>
      {values.map(v => <option key={v} value={v}>{label(v)}</option>)}
    </select>
  );
};

const BindingsPanel: React.FC<{ cfg: ReturnType<typeof useOrganMapConfig> }> = ({ cfg }) => {
  const { t } = useTranslation();
  const [templateId, setTemplateId] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [draft, setDraftState] = useState<OrganMapBinding | null>(null);
  /** Where editing started (the stored, PathScribe's or an empty binding): Save is offered once the draft differs. */
  const [base, setBase] = useState<OrganMapBinding | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const setDraft = (b: OrganMapBinding) => { setDraftState(b); setMessage(null); };
  const startFrom = (b: OrganMapBinding | null) => { setBase(b); setDraftState(b); };
  useEffect(() => {
    setMessage(null);
    if (!templateId) { setTemplate(null); startFrom(null); return; }
    void cfg.loadTemplate(templateId).then(tpl => { setTemplate(tpl); startFrom(tpl ? bindingDraftOf(tpl, cfg.bindings) : null); });
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps
  const saved = templateId ? cfg.bindings[templateId] : undefined;
  const dirty = !!draft && bindingDraftDirty(draft, base ?? undefined);
  useReportConfigDirty(dirty);
  const status = template ? organMapBindingStatus(template, cfg.bindings) : null;

  const sectorValueLabel = (input: SectorsInput) => (v: string) =>
    input === 'gradeGroup' ? t('organMap.details.gradeGroup', { n: v })
      : input === 'svInvasion' ? t(`${K}.bindings.values.${v}`)
        : organMapSectorName(t, 'prostateSectors', v);
  const coreValueLabel = (kind: CoreValueKind) => (v: string) =>
    kind === 'site' ? organMapSectorName(t, 'prostateBiopsy', v)
      : kind === 'cancer' ? t(`${K}.bindings.values.${v}`)
        : kind === 'gradeGroup' ? t('organMap.details.gradeGroup', { n: v })
          : t(`${K}.bindings.gleasonPattern`, { n: v });

  const save = async (binding: OrganMapBinding | null) => {
    if (!template) return;
    const o = organMapConfigOutcome(await cfg.saveBinding(template, binding));
    setMessage(o.kind === 'saved' ? t(binding ? `${K}.bindings.saved` : `${K}.bindings.removed`)
      : o.kind === 'notPermitted' ? t(`${K}.errors.notPermitted`)
        : o.problems.map(p => t(`${K}.errors.binding.${p.problem}`, { input: t(`${K}.bindings.${bindingProblemInputKey(p.input, binding?.mapType)}`) })).join(' '));
    if (o.kind === 'saved' && binding) setBase(binding);
    if (o.kind === 'saved' && !binding) {
      const { [template.id]: _removed, ...others } = cfg.bindings; // eslint-disable-line @typescript-eslint/no-unused-vars
      startFrom(bindingDraftOf(template, others));
    }
  };

  const fieldsFor = (mapType: OrganMapType) => (template ? bindableFields(template, mapType) : []);

  return (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t(`${K}.tabs.bindings`)}</div>
      <p className="ps-conf-field-hint">{t(`${K}.bindings.source`)}</p>
      <div className="ps-conf-row-actions">
        <label className="ps-conf-label" htmlFor="organmap-template">{t(`${K}.bindings.template`)}</label>
        <select id="organmap-template" className="ps-conf-select" value={templateId} onChange={e => setTemplateId(e.target.value)}>
          <option value="">{t(`${K}.bindings.pickTemplate`)}</option>
          {cfg.templates.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
        </select>
        {status && <span className={`ps-organmap-config-status ps-organmap-config-status--${status}`}>{t(`${K}.bindings.status.${status}`)}</span>}
      </div>
      {template && draft && (
        <div className="ps-organmap-config">
          <div className="ps-conf-row-actions">
            <label className="ps-conf-label" htmlFor="organmap-maptype">{t(`${K}.bindings.mapType`)}</label>
            <select id="organmap-maptype" className="ps-conf-select" value={draft.mapType} onChange={e => startFrom(bindingDraftOf(template, cfg.bindings, e.target.value as OrganMapType))}>
              {ORGAN_MAP_TYPES.map(m => <option key={m} value={m}>{t(`organMap.title.${m}`)}</option>)}
            </select>
          </div>

          {draft.mapType === 'prostateSectors' && SECTORS_INPUTS.map(input => {
            const b = draft[input];
            const field = fieldsFor('prostateSectors').find((f: Template) => f.id === b?.fieldId);
            return (
              <div key={input} className="ps-organmap-config-input">
                <div className="ps-conf-row-actions">
                  <label className="ps-conf-label" htmlFor={`organmap-in-${input}`}>{t(`${K}.bindings.inputs.${input}`)}</label>
                  <select id={`organmap-in-${input}`} className="ps-conf-select" value={b?.fieldId ?? ''} onChange={e => setDraft(withChoiceField(draft, input, e.target.value))}>
                    <option value="">{t(`${K}.bindings.noQuestion`)}</option>
                    {fieldsFor('prostateSectors').map((f: Template) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                {b && field && (
                  <table className="ps-conf-table ps-organmap-config-table">
                    <thead><tr><th>{t(`${K}.bindings.answer`)}</th><th>{t(`${K}.bindings.meaning`)}</th></tr></thead>
                    <tbody>
                      {(field.options ?? []).map((o: Template) => (
                        <tr key={o.id}>
                          <td>{o.label}</td>
                          <td><ValueSelect ariaLabel={o.label} values={allowedSectorsValues(input)} value={b.values[o.id] ?? ''} label={sectorValueLabel(input)} onChange={v => setDraft(withChoiceValue(draft, input, o.id, v))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          {/* Batch 464: the colorectal maps (Batch 465: and the oral cavity) — each input a choice question (with what its answers mean) or a numeric one. */}
          {isFieldInputsBinding(draft) && FIELD_INPUT_SPECS[draft.mapType].map(spec => {
            const b = draft.inputs[spec.key];
            const field = fieldInputCandidates(template, spec).find((f: Template) => f.id === b?.fieldId);
            return (
              <div key={spec.key} className="ps-organmap-config-input">
                <div className="ps-conf-row-actions">
                  <label className="ps-conf-label" htmlFor={`organmap-cr-${spec.key}`}>{t(`${K}.bindings.colorectal.inputs.${spec.key}`)}</label>
                  <select id={`organmap-cr-${spec.key}`} className="ps-conf-select" value={b?.fieldId ?? ''} onChange={e => setDraft(withFieldInput(draft, spec, e.target.value))}>
                    <option value="">{t(`${K}.bindings.noQuestion`)}</option>
                    {fieldInputCandidates(template, spec).map((f: Template) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                {spec.kind === 'choice' && b && field && (
                  <table className="ps-conf-table ps-organmap-config-table">
                    <thead><tr><th>{t(`${K}.bindings.answer`)}</th><th>{t(`${K}.bindings.meaning`)}</th></tr></thead>
                    <tbody>
                      {(field.options ?? []).map((o: Template) => (
                        <tr key={o.id}>
                          <td>{o.label}</td>
                          <td><ValueSelect ariaLabel={o.label} values={spec.values} value={(b as { values?: Record<string, string> }).values?.[o.id] ?? ''} label={v => t(fieldInputValueKey(draft.mapType, spec.key, v))}
                            onChange={v => setDraft(withFieldInputValue(draft, spec.key, o.id, v))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          {draft.mapType === 'mohsStages' && (
            <div className="ps-organmap-config-input">
              <div className="ps-conf-row-actions">
                <label className="ps-conf-label" htmlFor="organmap-mohs-stages">{t(`${K}.bindings.mohs.stagesQuestion`)}</label>
                <select id="organmap-mohs-stages" className="ps-conf-select" value={draft.stagesFieldId} onChange={e => setDraft({ mapType: 'mohsStages', stagesFieldId: e.target.value })}>
                  <option value="">{t(`${K}.bindings.noQuestion`)}</option>
                  {fieldsFor('mohsStages').map((f: Template) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <p className="ps-conf-field-hint">{t(`${K}.bindings.mohs.hint`)}</p>
            </div>
          )}

          {draft.mapType === 'breastClock' && (() => {
            const b = draft;
            const fieldOf = (id: string | undefined) => (template ? breastBindableFields(template, id === b.side?.fieldId ? 'side' : 'foci') : []).find((f: Template) => f.id === id);
            const sideField = template ? breastBindableFields(template, 'side').find((f: Template) => f.id === b.side?.fieldId) : undefined;
            const fociGrid = fieldOf(b.foci?.fieldId);
            const marginGrid = template ? breastBindableFields(template, 'margins').find((f: Template) => f.id === b.margins?.fieldId) : undefined;
            const questionSelect = (input: BreastInput, value: string, onChange: (v: string) => void) => (
              <div className="ps-conf-row-actions">
                <label className="ps-conf-label" htmlFor={`organmap-breast-${input}`}>{t(`${K}.bindings.breast.inputs.${input}`)}</label>
                <select id={`organmap-breast-${input}`} className="ps-conf-select" value={value} onChange={e => onChange(e.target.value)}>
                  <option value="">{t(`${K}.bindings.noQuestion`)}</option>
                  {(template ? breastBindableFields(template, input) : []).map((f: Template) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
            );
            const meaningTable = (options: Template[], values: Record<string, string>, allowed: readonly string[], label: (v: string) => string, onChange: (optionId: string, v: string) => void) => (
              <table className="ps-conf-table ps-organmap-config-table">
                <thead><tr><th>{t(`${K}.bindings.answer`)}</th><th>{t(`${K}.bindings.meaning`)}</th></tr></thead>
                <tbody>
                  {options.map((o: Template) => (
                    <tr key={o.id}><td>{o.label}</td><td><ValueSelect ariaLabel={o.label} values={allowed} value={values[o.id] ?? ''} label={label} onChange={v => onChange(o.id, v)} /></td></tr>
                  ))}
                </tbody>
              </table>
            );
            const columnSelect = (id: string, labelKey: string, grid: Template, value: string, onChange: (v: string) => void) => (
              <div className="ps-conf-row-actions" key={id}>
                <label className="ps-conf-label" htmlFor={id}>{t(labelKey)}</label>
                <select id={id} className="ps-conf-select" value={value} onChange={e => onChange(e.target.value)}>
                  <option value="">{t(`${K}.bindings.noQuestion`)}</option>
                  {(grid.columns ?? []).map((c: Template) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            );
            const columnOptions = (grid: Template, columnId: string | undefined) => (grid?.columns ?? []).find((c: Template) => c.id === columnId)?.options ?? [];
            return (
              <>
                <div className="ps-organmap-config-input">
                  {questionSelect('side', b.side?.fieldId ?? '', v => setDraft(withBreastSide(b, v)))}
                  {b.side && sideField && meaningTable(sideField.options ?? [], b.side.values, BREAST_SIDE_VALUES, v => t(`${K}.bindings.values.${v}`), (o, v) => setDraft(withBreastSideValue(b, o, v)))}
                </div>
                <div className="ps-organmap-config-input">
                  {questionSelect('foci', b.foci?.fieldId ?? '', v => setDraft(withBreastFoci(b, v)))}
                  {b.foci && fociGrid && BREAST_FOCI_COLUMNS.map(key => (
                    <div key={key} className="ps-organmap-config-column">
                      {columnSelect(`organmap-foci-${key}`, `${K}.bindings.breast.fociColumns.${key}`, fociGrid, b.foci!.columns[key] ?? '', v => setDraft(withBreastFociColumn(b, key, v)))}
                      {(key === 'type' || key === 'clock') && columnOptions(fociGrid, b.foci!.columns[key]).length > 0
                        && meaningTable(columnOptions(fociGrid, b.foci!.columns[key]), b.foci!.values[key], key === 'type' ? BREAST_TYPE_VALUES : BREAST_CLOCK_VALUES,
                          v => (key === 'type' ? t(`organMap.legend.${v}`) : v === 'central' ? t('organMap.breast.central') : t('organMap.breast.hourName', { n: v })),
                          (o, v) => setDraft(withBreastFociValue(b, key, o, v)))}
                    </div>
                  ))}
                </div>
                <div className="ps-organmap-config-input">
                  {questionSelect('margins', b.margins?.fieldId ?? '', v => setDraft(withBreastMargins(b, v)))}
                  {b.margins && marginGrid && (marginGridRows(marginGrid).length === 0
                    ? <p className="ps-conf-field-hint">{t(`${K}.bindings.breast.marginRowsNeeded`)}</p>
                    : (
                      <>
                        {meaningTable(marginGridRows(marginGrid), b.margins.rows, BREAST_FACE_VALUES, v => t(`organMap.breast.face.${v}`), (row, v) => setDraft(withBreastMarginRow(b, row, v)))}
                        {BREAST_MARGIN_COLUMNS.map(key => columnSelect(`organmap-margins-${key}`, `${K}.bindings.breast.marginColumns.${key}`, marginGrid, b.margins!.columns[key] ?? '', v => setDraft(withBreastMarginColumn(b, key, v))))}
                      </>
                    ))}
                </div>
              </>
            );
          })()}

          {/* Batch 465: the neck dissection — a results grid whose rows are the levels and sides. */}
          {draft.mapType === 'neckDissection' && (() => {
            const b = draft;
            const grid = fieldsFor('neckDissection').find((f: Template) => f.id === b.grid?.fieldId);
            const eneColumn = (grid?.columns ?? []).find((c: Template) => c.id === b.grid?.columns.ene);
            return (
              <div className="ps-organmap-config-input">
                <div className="ps-conf-row-actions">
                  <label className="ps-conf-label" htmlFor="organmap-neck-grid">{t(`${K}.bindings.neck.gridQuestion`)}</label>
                  <select id="organmap-neck-grid" className="ps-conf-select" value={b.grid?.fieldId ?? ''} onChange={e => setDraft(withNeckGrid(b, e.target.value, template))}>
                    <option value="">{t(`${K}.bindings.noQuestion`)}</option>
                    {fieldsFor('neckDissection').map((f: Template) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                <p className="ps-conf-field-hint">{t(`${K}.bindings.neck.hint`)}</p>
                {b.grid && grid && (
                  <>
                    <table className="ps-conf-table ps-organmap-config-table">
                      <thead><tr><th>{t(`${K}.bindings.neck.row`)}</th><th>{t(`${K}.bindings.neck.level`)}</th></tr></thead>
                      <tbody>
                        {marginGridRows(grid).map(r => (
                          <tr key={r.id}>
                            <td>{r.label ?? r.id}</td>
                            <td><ValueSelect ariaLabel={r.label ?? r.id} values={NECK_LEVEL_IDS} value={b.grid!.rows[r.id] ?? ''} label={v => organMapSectorName(t, 'neckDissection', v)} onChange={v => setDraft(withNeckRow(b, r.id, v))} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {NECK_COLUMNS.map(key => (
                      <div key={key} className="ps-conf-row-actions">
                        <label className="ps-conf-label" htmlFor={`organmap-neck-${key}`}>{t(`${K}.bindings.neck.columns.${key}`)}</label>
                        <select id={`organmap-neck-${key}`} className="ps-conf-select" value={b.grid!.columns[key] ?? ''} onChange={e => setDraft(withNeckColumn(b, key, e.target.value))}>
                          <option value="">{t(`${K}.bindings.noQuestion`)}</option>
                          {(grid.columns ?? []).map((c: Template) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </div>
                    ))}
                    {eneColumn?.options?.length > 0 && (
                      <table className="ps-conf-table ps-organmap-config-table">
                        <thead><tr><th>{t(`${K}.bindings.answer`)}</th><th>{t(`${K}.bindings.meaning`)}</th></tr></thead>
                        <tbody>
                          {eneColumn.options.map((o: Template) => (
                            <tr key={o.id}>
                              <td>{o.label}</td>
                              <td><ValueSelect ariaLabel={o.label} values={ENE_VALUES} value={b.grid!.eneValues[o.id] ?? ''} label={v => t(`organMap.headNeck.neck.ene.${v}`)} onChange={v => setDraft(withNeckEneValue(b, o.id, v))} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {draft.mapType === 'prostateBiopsy' && (() => {
            const grid = fieldsFor('prostateBiopsy').find((f: Template) => f.id === draft.coreGrid.fieldId);
            return (
              <div className="ps-organmap-config-input">
                <div className="ps-conf-row-actions">
                  <label className="ps-conf-label" htmlFor="organmap-grid">{t(`${K}.bindings.gridQuestion`)}</label>
                  <select id="organmap-grid" className="ps-conf-select" value={draft.coreGrid.fieldId} onChange={e => setDraft(withCoreGrid(e.target.value))}>
                    <option value="">{t(`${K}.bindings.noQuestion`)}</option>
                    {fieldsFor('prostateBiopsy').map((f: Template) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                {grid && CORE_COLUMN_KEYS.map(key => {
                  const columnId = draft.coreGrid.columns[key] ?? '';
                  const column = (grid.columns ?? []).find((c: Template) => c.id === columnId);
                  const kind = valueKindOfColumn(key);
                  return (
                    <div key={key} className="ps-organmap-config-column">
                      <div className="ps-conf-row-actions">
                        <label className="ps-conf-label" htmlFor={`organmap-col-${key}`}>{t(`${K}.bindings.columns.${key}`)}</label>
                        <select id={`organmap-col-${key}`} className="ps-conf-select" value={columnId} onChange={e => setDraft(withCoreColumn(draft, key, e.target.value))}>
                          <option value="">{t(`${K}.bindings.noQuestion`)}</option>
                          {(grid.columns ?? []).map((c: Template) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </div>
                      {kind && column?.options?.length > 0 && (
                        <table className="ps-conf-table ps-organmap-config-table">
                          <thead><tr><th>{t(`${K}.bindings.answer`)}</th><th>{t(`${K}.bindings.meaning`)}</th></tr></thead>
                          <tbody>
                            {column.options.map((o: Template) => (
                              <tr key={o.id}>
                                <td>{o.label}</td>
                                <td><ValueSelect ariaLabel={o.label} values={allowedCoreValues(kind)} value={draft.coreGrid.values[kind][o.id] ?? ''} label={coreValueLabel(kind)} onChange={v => setDraft(withCoreValue(draft, kind, o.id, v))} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Batch 466b (Pete): the template's generic margin questions, calculated from the map and locked on the form. */}
          {marginKeysFor(draft.mapType).length > 0 && (
            <div className="ps-organmap-config-input">
              <div className="ps-conf-label">{t(`${K}.bindings.derived.title`)}</div>
              <p className="ps-conf-field-hint">{t(`${K}.bindings.derived.hint`)}</p>
              {/* Batch 466d: a binding saved before margins were per component waits for the lab to assign them. */}
              {status === 'needsReview' && <p className="ps-organmap-config-review" role="status">{t(`${K}.bindings.derived.needsReview`)}</p>}
              {derivedKeysFor(draft.mapType).map(key => {
                const b = draft.derived?.[key];
                const field = derivedCandidates(template, draft, key).find((f: Template) => f.id === b?.fieldId);
                return (
                  <div key={key} className="ps-organmap-config-column">
                    <div className="ps-conf-row-actions">
                      <label className="ps-conf-label" htmlFor={`organmap-derived-${key}`}>{t(derivedKeyLabelKey(key, draft.mapType))}</label>
                      <select id={`organmap-derived-${key}`} className="ps-conf-select" value={b?.fieldId ?? ''} onChange={e => setDraft(withDerivedField(draft, key, e.target.value))}>
                        <option value="">{t(`${K}.bindings.noQuestion`)}</option>
                        {derivedCandidates(template, draft, key).map((f: Template) => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                    </div>
                    {b && field && (
                      <table className="ps-conf-table ps-organmap-config-table">
                        <thead><tr><th>{t(`${K}.bindings.answer`)}</th><th>{t(`${K}.bindings.meaning`)}</th></tr></thead>
                        <tbody>
                          {(field.options ?? []).map((o: Template) => (
                            <tr key={o.id}>
                              <td>{o.label}</td>
                              <td><ValueSelect ariaLabel={o.label} values={derivedValues(key, draft)} value={b.values[o.id] ?? ''} label={v => t(derivedValueKey(key, draft.mapType, v))} onChange={v => setDraft(withDerivedValue(draft, key, o.id, v))} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="ps-conf-row-actions">
            {message && <span className="ps-conf-field-hint" role="status">{message}</span>}
            <button type="button" className="ps-conf-btn-secondary" onClick={() => setDraft(emptyOrganMapBinding(draft.mapType))}>{t(`${K}.bindings.clear`)}</button>
            <CapabilityButton capability="config:organ-map-bindings:manage" className="ps-conf-btn-secondary" disabled={!saved} onClick={() => { void save(null); }}>
              {t(`${K}.bindings.revert`)}
            </CapabilityButton>
            <CapabilityButton capability="config:organ-map-bindings:manage" className="ps-conf-btn-primary" disabled={!dirty} onClick={() => { void save(draft); }}>
              {t('common.save')}
            </CapabilityButton>
          </div>
        </div>
      )}
    </div>
  );
};

const OrganMapsSection: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cfg = useOrganMapConfig(user?.name ?? user?.id ?? '');
  const [tab, setTab] = useState<Tab>('scheme');
  return (
    <div className="ps-conf-page">
      <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
      <p className="ps-conf-section-subtitle ps-conf-section-subtitle--spaced">{t(`${K}.subtitle`)}</p>
      <div className="ps-organmap-config-tabs" role="tablist">
        {(['scheme', 'bindings'] as Tab[]).map(id => (
          <button key={id} type="button" role="tab" aria-selected={tab === id}
            className={`ps-organmap-config-tab${tab === id ? ' ps-organmap-config-tab--active' : ''}`} onClick={() => setTab(id)}>
            {t(`${K}.tabs.${id}`)}
          </button>
        ))}
      </div>
      {tab === 'scheme' ? <SchemePanel cfg={cfg} /> : <BindingsPanel cfg={cfg} />}
    </div>
  );
};

export default OrganMapsSection;
