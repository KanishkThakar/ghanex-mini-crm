import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../api';
import { SOURCES, STATUSES, type Lead, type LeadInput } from '../types';
import { Modal } from './Modal';

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onSave: (input: LeadInput) => Promise<void>;
}

const blank: LeadInput = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: 'Website',
  status: 'New',
  notes: '',
  value: 0,
};

function validate(values: LeadInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.name.trim().length < 2) errors.name = 'Name needs at least 2 characters';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) errors.email = 'Enter a valid email address';
  if (values.phone.trim() && !/^[+]?[\d\s()-]{7,20}$/.test(values.phone.trim())) errors.phone = 'Enter a valid phone number';
  if (!Number.isFinite(values.value) || values.value < 0) errors.value = 'Deal value cannot be negative';
  return errors;
}

function Field({
  label,
  error,
  hint,
  wide,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`field${wide ? ' field--wide' : ''}${error ? ' field--error' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function LeadForm({ lead, onClose, onSave }: Props) {
  const [values, setValues] = useState<LeadInput>(
    lead
      ? {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          source: lead.source,
          status: lead.status,
          notes: lead.notes,
          value: lead.value,
        }
      : blank,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof LeadInput>(key: K, value: LeadInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await onSave({
        ...values,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        company: values.company.trim(),
        notes: values.notes.trim(),
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details);
        setFormError(err.message);
      } else {
        setFormError('Could not save the lead. Try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={lead ? 'Edit lead' : 'New lead'}
      subtitle={lead ? `Updating ${lead.name}` : 'Capture an enquiry so it does not get lost'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="lead-form" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : lead ? 'Save changes' : 'Add lead'}
          </button>
        </>
      }
    >
      <form id="lead-form" onSubmit={submit} noValidate>
        {formError && <div className="form-error">{formError}</div>}
        <div className="form-grid">
          <Field label="Name" error={errors.name}>
            <input
              autoFocus
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Priya Nair"
              maxLength={80}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="priya@company.com"
              maxLength={120}
            />
          </Field>
          <Field label="Phone" error={errors.phone} hint="Optional">
            <input
              value={values.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+91 98765 43210"
              maxLength={20}
            />
          </Field>
          <Field label="Company" error={errors.company} hint="Optional">
            <input
              value={values.company}
              onChange={(e) => set('company', e.target.value)}
              placeholder="Finlytics"
              maxLength={80}
            />
          </Field>
          <Field label="Enquiry source" error={errors.source}>
            <select value={values.source} onChange={(e) => set('source', e.target.value)}>
              {SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" error={errors.status}>
            <select value={values.status} onChange={(e) => set('status', e.target.value as LeadInput['status'])}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deal value (₹)" error={errors.value} hint="Optional, whole rupees">
            <input
              type="number"
              min={0}
              step={1000}
              value={Number.isFinite(values.value) ? values.value : 0}
              onChange={(e) => set('value', e.target.value === '' ? 0 : Number(e.target.value))}
            />
          </Field>
          <Field label="Notes" error={errors.notes} wide hint="What they asked for, next step, anything useful">
            <textarea
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Wants a demo next week, budget approved"
              maxLength={1000}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
