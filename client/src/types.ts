export const STATUSES = ['New', 'Contacted', 'Qualified', 'Converted'] as const;
export type LeadStatus = (typeof STATUSES)[number];

export const SOURCES = ['Website', 'Instagram', 'LinkedIn', 'Referral', 'Email', 'Walk-in', 'Other'] as const;

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: LeadStatus;
  notes: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export type LeadInput = Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>;

export interface LeadList {
  data: Lead[];
  total: number;
  limit: number;
  offset: number;
}

export interface Stats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  valueByStatus: Record<LeadStatus, number>;
  bySource: { source: string; count: number }[];
  pipelineValue: number;
  conversionRate: number;
}
