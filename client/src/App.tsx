import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import type { Lead, LeadInput, LeadStatus, Stats } from './types';
import { StatsBar } from './components/StatsBar';
import { LeadTable } from './components/LeadTable';
import { LeadForm } from './components/LeadForm';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toasts, type Toast } from './components/Toasts';

const PAGE_SIZE = 8;

const SORTS = [
  { value: 'updated_at:desc', label: 'Recently updated' },
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'value:desc', label: 'Highest value' },
] as const;

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<string>('updated_at:desc');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4000);
  }, []);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [sortKey, order] = sort.split(':') as ['updated_at' | 'created_at' | 'name' | 'value', 'asc' | 'desc'];
    try {
      const [list, summary] = await Promise.all([
        api.listLeads({
          search: debouncedSearch || undefined,
          status: statusFilter === 'All' ? undefined : statusFilter,
          sort: sortKey,
          order,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
        api.stats(),
      ]);
      setLeads(list.data);
      setTotal(list.total);
      setStats(summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong while loading leads.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(input: LeadInput) {
    if (editing) {
      const updated = await api.updateLead(editing.id, input);
      toast(`${updated.name} updated`);
    } else {
      const created = await api.createLead(input);
      toast(`${created.name} added`);
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  }

  async function handleStatusChange(lead: Lead, status: LeadStatus) {
    const previous = leads;
    setLeads((current) => current.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    try {
      await api.updateLead(lead.id, { status });
      toast(`${lead.name} moved to ${status}`);
      await load();
    } catch {
      setLeads(previous);
      toast('Could not change the status', 'error');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.deleteLead(deleting.id);
      toast(`${deleting.name} deleted`);
      setDeleting(null);
      if (leads.length === 1 && page > 0) setPage((p) => p - 1);
      else await load();
    } catch {
      toast('Could not delete the lead', 'error');
    } finally {
      setDeletingBusy(false);
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('All');
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const hasFilters = statusFilter !== 'All' || debouncedSearch !== '';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            ◆
          </span>
          <div>
            <h1>Mini CRM</h1>
            <p>Leads and customer enquiries in one place</p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + New lead
        </button>
      </header>

      <main>
        <StatsBar
          stats={stats}
          active={statusFilter}
          onSelect={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
        />

        <section className="panel">
          <div className="panel__head">
            <div className="search">
              <span className="search__icon" aria-hidden="true">
                ⌕
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, company, phone…"
                aria-label="Search leads"
              />
            </div>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort leads">
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <div className="empty">
              <h3>Could not load leads</h3>
              <p>{error}</p>
              <button type="button" className="btn btn--primary" onClick={() => void load()}>
                Try again
              </button>
            </div>
          ) : (
            <LeadTable
              leads={leads}
              loading={loading}
              hasFilters={hasFilters}
              onEdit={(lead) => {
                setEditing(lead);
                setFormOpen(true);
              }}
              onDelete={setDeleting}
              onStatusChange={handleStatusChange}
              onClearFilters={clearFilters}
              onAdd={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            />
          )}

          <div className="panel__foot">
            <span>
              {loading ? 'Loading…' : total === 0 ? 'No leads' : `Showing ${from}–${to} of ${total}`}
              {statusFilter !== 'All' && !loading ? ` · ${statusFilter}` : ''}
            </span>
            <div className="pager">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1 || loading}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {formOpen && (
        <LeadForm
          lead={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      {deleting && (
        <ConfirmDialog
          lead={deleting}
          busy={deletingBusy}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toasts toasts={toasts} />
    </div>
  );
}
