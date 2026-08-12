/**
 * ClientDictionaryPage.tsx
 * Located at: src/pages/system/ClientDictionaryPage.tsx
 *
<<<<<<< HEAD
 * Admin config page for the Client Dictionary.
 * Route: /system/clients
 */

import { useState } from "react";
import '../../pathscribe.css';
import { useClientDictionary } from "../../contexts/useClientDictionary";
import { ClientEditorModal } from "./ClientEditorModal";
import { ClientTable } from "./ClientTable";

export const ClientDictionaryPage = () => {
  const { clients, addClient, updateClient, deleteClient } = useClientDictionary();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingClientId(null);
=======
 * Admin config page for Facility Configuration.
 * Route: /system/clients (rendered as the 'clients' case in
 * Config/System/index.tsx)
 *
 * Reconciled June 2026: previously used contexts/useClientDictionary.ts,
 * a synchronous localStorage-backed hook with its own separate Client
 * type and ID scheme (client-INT-001 etc.), completely disconnected from
 * services/facilities/mockFacilityService.ts — the Client store every other
 * screen (Accession page, TAT Configuration, Subspecialties, Routing
 * Rules, Validation Studies) and existing case seed data (order.clientId)
 * actually use. Now wired to the same facilityService everything else uses,
 * so a client added here shows up everywhere else, and vice versa.
 * useClientDictionary.ts has been retired.
 */

import { useState, useEffect } from "react";
import '../../pathscribe.css';
import { facilityService } from "../../services";
import { checkClientReferences } from "../../services/referenceCheck/referenceCheckService";
import ConfirmModal from "../../components/Common/ConfirmModal";
import type { Facility as Client, FacilityInput } from "../../services/facilities/IFacilityService";
import { ClientEditorModal } from "../../components/ClientDictionary/ClientEditorModal";
import { ClientTable } from "../../components/ClientDictionary/ClientTable";

export const ClientDictionaryPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);

  useEffect(() => {
    facilityService.getAll().then(res => {
      if (res.ok) setClients(res.data);
      setLoading(false);
    });
  }, []);

  const handleAdd = () => {
    setEditingClient(undefined);
>>>>>>> upstream/main
    setIsEditorOpen(true);
  };

  const handleEdit = (clientId: string) => {
<<<<<<< HEAD
    setEditingClientId(clientId);
    setIsEditorOpen(true);
  };

  return (
    <div className="config-section-container">
      <div className="config-section-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 className="config-section-title">Client Dictionary</h2>
            <p className="config-section-description">
              Manage client definitions, HL7 integration settings, and reporting preferences.
            </p>
          </div>
          <button className="config-primary-button" onClick={handleAdd}>
            + Add Client
=======
    const c = clients.find(x => x.id === clientId);
    setEditingClient(c);
    setIsEditorOpen(true);
  };

  const handleSave = async (input: FacilityInput) => {
    if (editingClient) {
      const res = await facilityService.update(editingClient.id, input);
      if (res.ok) setClients(prev => prev.map(c => c.id === res.data.id ? res.data : c));
    } else {
      const res = await facilityService.add(input);
      if (res.ok) setClients(prev => [...prev, res.data]);
    }
  };

  const [pendingDeactivation, setPendingDeactivation] = useState<{ id: string; message: string } | null>(null);

  const handleToggleActive = async (id: string, activate: boolean) => {
    // Reactivating, or no references — proceed exactly as before, unchanged.
    if (activate) {
      const res = await facilityService.reactivate(id);
      if (res.ok) setClients(prev => prev.map(c => c.id === id ? res.data : c));
      return;
    }
    const refCheck = await checkClientReferences(id);
    if (refCheck.hasReferences) {
      const detail = refCheck.sources.map(s => `${s.count} ${s.label}`).join(', ');
      setPendingDeactivation({ id, message: `This facility is still referenced by: ${detail}. Deactivating it now won't remove those references — they'll keep pointing at a facility that's no longer active. Deactivate anyway?` });
      return;
    }
    const res = await facilityService.deactivate(id);
    if (res.ok) setClients(prev => prev.map(c => c.id === id ? res.data : c));
  };

  const confirmDeactivation = async () => {
    if (!pendingDeactivation) return;
    const res = await facilityService.deactivate(pendingDeactivation.id);
    if (res.ok) setClients(prev => prev.map(c => c.id === pendingDeactivation.id ? res.data : c));
    setPendingDeactivation(null);
  };

  const handleVerify = async (id: string) => {
    const res = await facilityService.verify(id);
    if (res.ok) setClients(prev => prev.map(c => c.id === id ? res.data : c));
  };

  if (loading) {
    return (
      <div className="config-section-container">
        <div className="config-section-loading">
          Loading clients...
        </div>
      </div>
    );
  }

  return (
    <div className="config-section-container">
      <div className="config-section-header">
        <div className="config-section-header-row">
          <div>
            <h2 className="config-section-title">Facility Configuration</h2>
            <p className="config-section-description">
              Manage facility definitions, roles, HL7 integration settings, and reporting preferences.
            </p>
          </div>
          <button className="config-primary-button" onClick={handleAdd}>
            + Add Facility
>>>>>>> upstream/main
          </button>
        </div>
      </div>

      <div className="config-section-body">
        <ClientTable
          clients={clients}
          onEdit={handleEdit}
<<<<<<< HEAD
          onDelete={deleteClient}
=======
          onToggleActive={handleToggleActive}
          onVerify={handleVerify}
>>>>>>> upstream/main
        />
      </div>

      {isEditorOpen && (
        <ClientEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
<<<<<<< HEAD
          clientId={editingClientId}
          addClient={addClient}
          updateClient={updateClient}
        />
      )}
=======
          client={editingClient}
          onSave={handleSave}
          allClients={clients}
        />
      )}

      <ConfirmModal
        show={!!pendingDeactivation}
        title="Facility still in use"
        message={pendingDeactivation?.message ?? ''}
        confirmLabel="Deactivate Anyway"
        cancelLabel="Cancel"
        onConfirm={confirmDeactivation}
        onCancel={() => setPendingDeactivation(null)}
      />
>>>>>>> upstream/main
    </div>
  );
};
