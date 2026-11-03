// src/components/Requisitions/RequisitionInboxLink.tsx
// Batch 762: the way into the Requisition Inbox from the Accession screen, for those who may open it.
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useCapabilities } from '@/hooks/useCapabilities';
import { canOpenTile } from '@/services';
import './Requisitions.css';

export function RequisitionInboxLink() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { has } = useCapabilities();
  if (!canOpenTile('requisitionInbox', c => has(c))) return null;
  return (
    <button type="button" className="ps-btn-small ps-req-inbox-link" onClick={() => navigate('/accession/requisitions')}>
      {t('requisitions.inboxLink')}
    </button>
  );
}

export default RequisitionInboxLink;
