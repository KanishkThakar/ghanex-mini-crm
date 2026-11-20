import type { Lead, LeadInput, LeadList, LeadStatus, Stats } from './types';

export class ApiError extends Error {
  status: number;
  details: Record<string, string>;

  constructor(message: string, status: number, details: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...init });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      body?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      body?.error?.details ?? {},
    );
  }
  return body as T;
}

export interface ListParams {
  search?: string;
  status?: LeadStatus;
  sort?: 'updated_at' | 'created_at' | 'name' | 'value';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export const api = {
  async listLeads(params: ListParams = {}): Promise<LeadList> {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') q.set(key, String(value));
    }
    return request<LeadList>(`/api/leads?${q.toString()}`);
  },

  async stats(): Promise<Stats> {
    return (await request<{ data: Stats }>('/api/stats')).data;
  },

  async createLead(input: LeadInput): Promise<Lead> {
    return (await request<{ data: Lead }>('/api/leads', { method: 'POST', body: JSON.stringify(input) })).data;
  },

  async updateLead(id: number, patch: Partial<LeadInput>): Promise<Lead> {
    return (await request<{ data: Lead }>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })).data;
  },

  async deleteLead(id: number): Promise<void> {
    await request<void>(`/api/leads/${id}`, { method: 'DELETE' });
  },
};
