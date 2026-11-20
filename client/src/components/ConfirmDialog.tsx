import type { Lead } from '../types';
import { Modal } from './Modal';

interface Props {
  lead: Lead;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ lead, busy, onCancel, onConfirm }: Props) {
  return (
    <Modal
      title="Delete this lead?"
      subtitle={`${lead.name}${lead.company ? ` · ${lead.company}` : ''}`}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete lead'}
          </button>
        </>
      }
    >
      <p className="confirm-text">
        This removes the lead and its notes for good. It cannot be undone.
      </p>
    </Modal>
  );
}
