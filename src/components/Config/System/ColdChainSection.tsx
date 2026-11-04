// src/components/Config/System/ColdChainSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (queue entries #17 and #123): the cold-chain administration the
// services already had no screen for.
//   • Storage units  : freezers and refrigerators — add, edit, deactivate, and
//                      each unit's readings and excursion status.
//   • Condition types: the temperature rules a unit or smart container is held to.
//   • Smart containers: containers that report temperature, with their readings.
// Every change needs config:cold-chain:manage (checked in the services). Readings
// come from the labelled Simulated control until a sensor feed exists (server).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AssetReadingsPanel } from '@/components/ColdChain/AssetReadingsPanel';
import { LoadingState } from '@/components/Common/LoadingState';
import {
  storageUnitService, storageConditionTypeService, hardwareContainerRegistryService,
  type StorageUnit, type StorageConditionType,
} from '@/services';
import type { HardwareContainer } from '@/services/hardwareContainers/IHardwareContainerRegistryService';

type Tab = 'units' | 'types' | 'containers';

interface UnitDraft { name: string; storageConditionTypeId: string; active: boolean }
interface TypeDraft { name: string; max: string; min: string; active: boolean }

const ColdChainSection: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('units');
  const [units, setUnits] = useState<StorageUnit[]>([]);
  const [types, setTypes] = useState<StorageConditionType[]>([]);
  const [containers, setContainers] = useState<HardwareContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openReadings, setOpenReadings] = useState<string | null>(null);
  const [unitModal, setUnitModal] = useState<{ unit?: StorageUnit } | null>(null);
  const [typeModal, setTypeModal] = useState<{ type?: StorageConditionType } | null>(null);
  const [unitDraft, setUnitDraft] = useState<UnitDraft>({ name: '', storageConditionTypeId: '', active: true });
  const [typeDraft, setTypeDraft] = useState<TypeDraft>({ name: '', max: '', min: '', active: true });

  const load = useCallback(async () => {
    const [u, ty, c] = await Promise.all([storageUnitService.getAll(), storageConditionTypeService.getAll(), hardwareContainerRegistryService.getAll()]);
    if (u.ok) setUnits(u.data);
    if (ty.ok) setTypes(ty.data);
    if (c.ok) setContainers(c.data.filter(x => x.isSmartContainer));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const typeName = (id?: string) => types.find(x => x.id === id)?.name ?? '—';

  const openUnit = (unit?: StorageUnit) => {
    setUnitDraft(unit
      ? { name: unit.name, storageConditionTypeId: unit.storageConditionTypeId, active: unit.active }
      : { name: '', storageConditionTypeId: types.find(x => x.active)?.id ?? '', active: true });
    setUnitModal({ unit });
  };
  const saveUnit = async () => {
    const body = { name: unitDraft.name.trim(), storageConditionTypeId: unitDraft.storageConditionTypeId, active: unitDraft.active };
    const res = unitModal?.unit ? await storageUnitService.update(unitModal.unit.id, body) : await storageUnitService.add(body);
    if (res.ok) { setUnitModal(null); await load(); }
  };
  const setUnitActive = async (u: StorageUnit, active: boolean) => {
    const res = active ? await storageUnitService.update(u.id, { active: true }) : await storageUnitService.deactivate(u.id);
    if (res.ok) await load();
  };

  const openType = (type?: StorageConditionType) => {
    setTypeDraft(type
      ? { name: type.name, max: String(type.maxTemperatureCelsius), min: type.minTemperatureCelsius === undefined ? '' : String(type.minTemperatureCelsius), active: type.active }
      : { name: '', max: '', min: '', active: true });
    setTypeModal({ type });
  };
  const typeDraftValid = typeDraft.name.trim() !== '' && Number.isFinite(Number(typeDraft.max)) && typeDraft.max.trim() !== ''
    && (typeDraft.min.trim() === '' || (Number.isFinite(Number(typeDraft.min)) && Number(typeDraft.min) < Number(typeDraft.max)));
  const saveType = async () => {
    const body = {
      name: typeDraft.name.trim(), maxTemperatureCelsius: Number(typeDraft.max),
      ...(typeDraft.min.trim() !== '' ? { minTemperatureCelsius: Number(typeDraft.min) } : {}), active: typeDraft.active,
    };
    const res = typeModal?.type ? await storageConditionTypeService.update(typeModal.type.id, body) : await storageConditionTypeService.add(body);
    if (res.ok) { setTypeModal(null); await load(); }
  };
  const setTypeActive = async (ty: StorageConditionType, active: boolean) => {
    const res = active ? await storageConditionTypeService.reactivate(ty.id) : await storageConditionTypeService.deactivate(ty.id);
    if (res.ok) await load();
  };
  const removeType = async (ty: StorageConditionType) => {
    if (!window.confirm(t('coldChain.section.types.removeConfirm', { name: ty.name }))) return;
    const res = await storageConditionTypeService.remove(ty.id);
    if (res.ok) await load();
  };

  if (loading) return <LoadingState label={t('coldChain.section.loading')} />;

  const range = (ty: StorageConditionType) => ty.minTemperatureCelsius === undefined
    ? t('coldChain.section.types.rangeMaxOnly', { max: ty.maxTemperatureCelsius })
    : t('coldChain.section.types.rangeBoth', { min: ty.minTemperatureCelsius, max: ty.maxTemperatureCelsius });

  return (
    <div className="ps-conf-section" data-testid="cold-chain-section">
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">{t('coldChain.section.title')}</h3>
          <p className="ps-conf-section-subtitle">{t('coldChain.section.subtitle')}</p>
        </div>
        {tab === 'units' && <button className="ps-conf-btn-primary ps-conf-btn-primary--nowrap" onClick={() => openUnit()}>+ {t('coldChain.section.units.add')}</button>}
        {tab === 'types' && <button className="ps-conf-btn-primary ps-conf-btn-primary--nowrap" onClick={() => openType()}>+ {t('coldChain.section.types.add')}</button>}
      </div>
      <p className="ps-conf-identity-sub"><span className="ps-simulated-badge">{t('coldChain.simulated')}</span> {t('coldChain.section.simulatedNote')}</p>

      <div className="ps-conf-form-row">
        {(['units', 'types', 'containers'] as Tab[]).map(id => (
          <button key={id} data-config-nav className={tab === id ? 'ps-btn-primary' : 'ps-btn-ghost-dark'} onClick={() => setTab(id)}>{t(`coldChain.section.tabs.${id}`)}</button>
        ))}
      </div>

      {tab === 'units' && (
        <div className="ps-conf-table-wrap"><div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky"><tr>
              <th className="ps-conf-th">{t('coldChain.section.units.name')}</th>
              <th className="ps-conf-th">{t('coldChain.section.units.conditionType')}</th>
              <th className="ps-conf-th">{t('coldChain.section.units.status')}</th>
              <th className="ps-conf-th">{t('coldChain.section.actions')}</th>
            </tr></thead>
            <tbody>
              {units.map(u => (
                <React.Fragment key={u.id}>
                  <tr className="ps-conf-tr">
                    <td className="ps-conf-td"><div className="ps-conf-identity-name">{u.name}</div></td>
                    <td className="ps-conf-td">{typeName(u.storageConditionTypeId)}</td>
                    <td className="ps-conf-td">{u.active ? t('common.active') : t('common.inactive')}</td>
                    <td className="ps-conf-td"><div className="ps-conf-row-actions">
                      <button className="ps-conf-btn-row" onClick={() => setOpenReadings(openReadings === u.id ? null : u.id)}>{t('coldChain.section.readings')}</button>
                      <button className="ps-conf-btn-row" onClick={() => openUnit(u)}>{t('common.edit')}</button>
                      <button className="ps-conf-btn-row" onClick={() => { void setUnitActive(u, !u.active); }}>{u.active ? t('coldChain.section.deactivate') : t('coldChain.section.reactivate')}</button>
                    </div></td>
                  </tr>
                  {openReadings === u.id && (
                    <tr><td className="ps-conf-td" colSpan={4}><AssetReadingsPanel assetType="storage_unit" assetId={u.id} assetLabel={u.name} /></td></tr>
                  )}
                </React.Fragment>
              ))}
              {units.length === 0 && <tr><td className="ps-conf-empty-row" colSpan={4}>{t('coldChain.section.units.empty')}</td></tr>}
            </tbody>
          </table>
        </div></div>
      )}

      {tab === 'types' && (
        <div className="ps-conf-table-wrap"><div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky"><tr>
              <th className="ps-conf-th">{t('coldChain.section.types.name')}</th>
              <th className="ps-conf-th">{t('coldChain.section.types.range')}</th>
              <th className="ps-conf-th">{t('coldChain.section.units.status')}</th>
              <th className="ps-conf-th">{t('coldChain.section.actions')}</th>
            </tr></thead>
            <tbody>
              {types.map(ty => (
                <tr key={ty.id} className="ps-conf-tr">
                  <td className="ps-conf-td"><div className="ps-conf-identity-name">{ty.name}</div>{ty.isSystem && <div className="ps-conf-identity-sub">{t('coldChain.section.types.system')}</div>}</td>
                  <td className="ps-conf-td">{range(ty)}</td>
                  <td className="ps-conf-td">{ty.active ? t('common.active') : t('common.inactive')}</td>
                  <td className="ps-conf-td"><div className="ps-conf-row-actions">
                    <button className="ps-conf-btn-row" onClick={() => openType(ty)}>{t('common.edit')}</button>
                    <button className="ps-conf-btn-row" onClick={() => { void setTypeActive(ty, !ty.active); }}>{ty.active ? t('coldChain.section.deactivate') : t('coldChain.section.reactivate')}</button>
                    {!ty.isSystem && <button className="ps-conf-btn-row" onClick={() => { void removeType(ty); }}>{t('coldChain.section.types.remove')}</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}

      {tab === 'containers' && (
        <div className="ps-conf-table-wrap"><div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky"><tr>
              <th className="ps-conf-th">{t('coldChain.section.containers.rack')}</th>
              <th className="ps-conf-th">{t('coldChain.section.units.conditionType')}</th>
              <th className="ps-conf-th">{t('coldChain.section.containers.state')}</th>
              <th className="ps-conf-th">{t('coldChain.section.actions')}</th>
            </tr></thead>
            <tbody>
              {containers.map(c => (
                <React.Fragment key={c.id}>
                  <tr className="ps-conf-tr">
                    <td className="ps-conf-td"><div className="ps-conf-identity-name">{c.rackId}</div></td>
                    <td className="ps-conf-td">{typeName(c.storageConditionTypeId)}</td>
                    <td className="ps-conf-td">{c.status}</td>
                    <td className="ps-conf-td"><div className="ps-conf-row-actions">
                      <button className="ps-conf-btn-row" onClick={() => setOpenReadings(openReadings === c.id ? null : c.id)}>{t('coldChain.section.readings')}</button>
                    </div></td>
                  </tr>
                  {openReadings === c.id && (
                    <tr><td className="ps-conf-td" colSpan={4}><AssetReadingsPanel assetType="hardware_container" assetId={c.id} assetLabel={c.rackId} /></td></tr>
                  )}
                </React.Fragment>
              ))}
              {containers.length === 0 && <tr><td className="ps-conf-empty-row" colSpan={4}>{t('coldChain.section.containers.empty')}</td></tr>}
            </tbody>
          </table>
        </div></div>
      )}

      {unitModal && (
        <div className="ps-ms-overlay"><div className="ps-ms-modal">
          <div className="ps-ms-header">{unitModal.unit ? t('coldChain.section.units.editTitle') : t('coldChain.section.units.addTitle')}</div>
          <div className="ps-ms-body">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label" htmlFor="cc-unit-name">{t('coldChain.section.units.name')} <span className="ps-conf-required">*</span></label>
              <input id="cc-unit-name" className="ps-conf-input" value={unitDraft.name} onChange={e => setUnitDraft({ ...unitDraft, name: e.target.value })} />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label" htmlFor="cc-unit-type">{t('coldChain.section.units.conditionType')}</label>
              <select id="cc-unit-type" className="ps-conf-select" value={unitDraft.storageConditionTypeId} onChange={e => setUnitDraft({ ...unitDraft, storageConditionTypeId: e.target.value })}>
                {types.filter(x => x.active || x.id === unitDraft.storageConditionTypeId).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
            <label className="ps-conf-label"><input type="checkbox" checked={unitDraft.active} onChange={e => setUnitDraft({ ...unitDraft, active: e.target.checked })} /> {t('common.active')}</label>
          </div>
          <div className="ps-ms-footer">
            <button className="ps-ms-btn-cancel" onClick={() => setUnitModal(null)}>{t('common.cancel')}</button>
            <button className="ps-ms-btn-apply" disabled={unitDraft.name.trim() === '' || unitDraft.storageConditionTypeId === ''} onClick={() => { void saveUnit(); }}>{t('common.save')}</button>
          </div>
        </div></div>
      )}

      {typeModal && (
        <div className="ps-ms-overlay"><div className="ps-ms-modal">
          <div className="ps-ms-header">{typeModal.type ? t('coldChain.section.types.editTitle') : t('coldChain.section.types.addTitle')}</div>
          <div className="ps-ms-body">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label" htmlFor="cc-type-name">{t('coldChain.section.types.name')} <span className="ps-conf-required">*</span></label>
              <input id="cc-type-name" className="ps-conf-input" value={typeDraft.name} onChange={e => setTypeDraft({ ...typeDraft, name: e.target.value })} />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label" htmlFor="cc-type-max">{t('coldChain.section.types.max')} <span className="ps-conf-required">*</span></label>
              <input id="cc-type-max" type="number" step="0.1" className="ps-conf-input" value={typeDraft.max} onChange={e => setTypeDraft({ ...typeDraft, max: e.target.value })} />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label" htmlFor="cc-type-min">{t('coldChain.section.types.min')}</label>
              <input id="cc-type-min" type="number" step="0.1" className="ps-conf-input" value={typeDraft.min} onChange={e => setTypeDraft({ ...typeDraft, min: e.target.value })} />
              <div className="ps-conf-identity-sub">{t('coldChain.section.types.minHelp')}</div>
            </div>
            <label className="ps-conf-label"><input type="checkbox" checked={typeDraft.active} onChange={e => setTypeDraft({ ...typeDraft, active: e.target.checked })} /> {t('common.active')}</label>
          </div>
          <div className="ps-ms-footer">
            <button className="ps-ms-btn-cancel" onClick={() => setTypeModal(null)}>{t('common.cancel')}</button>
            <button className="ps-ms-btn-apply" disabled={!typeDraftValid} onClick={() => { void saveType(); }}>{t('common.save')}</button>
          </div>
        </div></div>
      )}
    </div>
  );
};

export default ColdChainSection;
