/**
 * ClientDictionaryPage.tsx
 * Located at: src/pages/system/ClientDictionaryPage.tsx
 *
 * Admin config page for the Client Dictionary.
 * Route: /system/clients (rendered as the 'clients' case in
 * Config/System/index.tsx)
 *
 * Reconciled June 2026: previously used contexts/useClientDictionary.ts,
 * a synchronous localStorage-backed hook with its own separate Client
 * type and ID scheme (client-INT-001 etc.), completely disconnected from
 * services/clients/mockClientService.ts — the Client store every other
 * screen (Accession page, TAT Configuration, Subspecialties, Routing
 * Rules, Validation Studies) and existing case seed data (order.clientId)
 * actually use. Now wired to the same clientService everything else uses,
 * so a client added here shows up everywhere else, and vice versa.
 * useClientDictionary.ts has been retired.
 */

import { useState, useEffect } from "react";
import '../../pathscribe.css';
import { clientService } from "../../services";
import type { Client, ClientInput } from "../../services/clients/IClientService";
import { ClientEditorModal } from "../../components/ClientDictionary/ClientEditorModal";
import { ClientTable } from "../../components/ClientDictionary/ClientTable";

export const ClientDictionaryPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);

  useEffect(() => {
    clientService.getAll().then(res => {
      if (res.ok) setClients(res.data);
      setLoading(false);
    });
  }, []);

  const handleAdd = () => {
    setEditingClient(undefined);
    setIsEditorOpen(true);
  };

  const handleEdit = (clientId: string) => {
    const c = clients.find(x => x.id === clientId);
    setEditingClient(c);
    setIsEditorOpen(true);
  };

  const handleSave = async (input: ClientInput) => {
    if (editingClient) {
      const res = await clientService.update(editingClient.id, input);
      if (res.ok) setClients(prev => prev.map(c => c.id === res.data.id ? res.data : c));
    } else {
      const res = await clientService.add(input);
      if (res.ok) setClients(prev => [...prev, res.data]);
    }
  };

  const handleToggleActive = async (id: string, activate: boolean) => {
    const res = activate ? await clientService.reactivate(id) : await clientService.deactivate(id);
    if (res.ok) setClients(prev => prev.map(c => c.id === id ? res.data : c));
  };

  const handleVerify = async (id: string) => {
    const res = await clientService.verify(id);
    if (res.ok) setClients(prev => prev.map(c => c.id === id ? res.data : c));
  };

  if (loading) {
    return (
      <div className="config-section-container">
        <div style={{ padding: '40px 24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
          Loading clients...
        </div>
      </div>
    );
  }

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
          </button>
        </div>
      </div>

      <div className="config-section-body">
        <ClientTable
          clients={clients}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
          onVerify={handleVerify}
        />
      </div>

      {isEditorOpen && (
        <ClientEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          client={editingClient}
          onSave={handleSave}
          allClients={clients}
        />
      )}
    </div>
  );
};
