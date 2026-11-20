import { initials, money, timeAgo } from '../format';
import { STATUSES, type Lead, type LeadStatus } from '../types';

interface Props {
  leads: Lead[];
  loading: boolean;
  hasFilters: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
  onClearFilters: () => void;
  onAdd: () => void;
}

export function LeadTable({
  leads,
  loading,
  hasFilters,
  onEdit,
  onDelete,
  onStatusChange,
  onClearFilters,
  onAdd,
}: Props) {
  if (loading) {
    return (
      <div className="table-wrap" aria-busy="true" aria-label="Loading leads">
        {[0, 1, 2, 3, 4].map((row) => (
          <div className="skeleton-row" key={row}>
            <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%' }} />
            <div className="skeleton" style={{ width: '22%' }} />
            <div className="skeleton" style={{ width: '26%' }} />
            <div className="skeleton" style={{ width: '12%' }} />
            <div className="skeleton" style={{ width: '10%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="empty">
        <h3>{hasFilters ? 'No leads match those filters' : 'No leads yet'}</h3>
        <p>
          {hasFilters
            ? 'Try a different search term, or clear the filters to see everything.'
            : 'Add your first enquiry and it will show up here.'}
        </p>
        <button type="button" className="btn btn--primary" onClick={hasFilters ? onClearFilters : onAdd}>
          {hasFilters ? 'Clear filters' : 'Add a lead'}
        </button>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="col-lead">Lead</th>
            <th className="col-contact">Contact</th>
            <th className="col-source">Source</th>
            <th className="col-status">Status</th>
            <th className="col-value">Value</th>
            <th className="col-updated">Updated</th>
            <th className="col-actions" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td className="col-lead">
                <div className="lead-cell">
                  <span className="avatar" aria-hidden="true">
                    {initials(lead.name)}
                  </span>
                  <div>
                    <div className="lead-cell__name">{lead.name}</div>
                    <div className="lead-cell__company">{lead.company || 'No company'}</div>
                  </div>
                </div>
              </td>
              <td className="col-contact">
                <div>{lead.email}</div>
                <div className="muted">{lead.phone || 'No phone'}</div>
              </td>
              <td className="col-source">
                <span className="chip">{lead.source}</span>
              </td>
              <td className="col-status">
                <select
                  className={`status-select status-${lead.status.toLowerCase()}`}
                  value={lead.status}
                  onChange={(e) => onStatusChange(lead, e.target.value as LeadStatus)}
                  aria-label={`Status for ${lead.name}`}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td className="col-value mono">{lead.value ? money(lead.value) : '—'}</td>
              <td className="col-updated muted">{timeAgo(lead.updatedAt)}</td>
              <td className="col-actions">
                <div className="row-actions">
                  <button type="button" className="icon-btn" onClick={() => onEdit(lead)} aria-label={`Edit ${lead.name}`}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    onClick={() => onDelete(lead)}
                    aria-label={`Delete ${lead.name}`}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
