import { apiJson, authenticatedFetch, getApiBaseUrl } from '../../lib/http';

export type MosqueModuleRole = 'head' | 'supervisor' | 'personnel' | 'university_member' | 'viewer';

export type MosqueSite = {
  id: string;
  publicToken: string;
  name: string;
  siteType: 'mosque' | 'jami' | 'prayer_room';
  city?: string | null;
  district?: string | null;
  campusLocation?: string | null;
  area?: number | null;
  capacity?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string | null;
  status: 'active' | 'maintenance' | 'temporarily_closed';
  imamName?: string | null;
  muezzinName?: string | null;
  khateebName?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  images?: string[] | null;
  supervisorUserId?: string | null;
  _count?: { requests: number; tickets: number; personnel: number };
};

export type MosqueRequest = {
  id: string;
  requestNumber: string;
  siteId: string;
  requestType: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  attachments?: string[] | null;
  notes?: string | null;
  submittedBy?: string | null;
  assignedTo?: string | null;
  rejectionReason?: string | null;
  returnReason?: string | null;
  completionEvidenceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { name: string; siteType?: string };
};

export type MosqueTicket = {
  id: string;
  ticketNumber: string;
  trackingToken: string;
  siteId: string;
  ticketType: string;
  description: string;
  reporterName?: string | null;
  reporterPhone?: string | null;
  reporterEmail?: string | null;
  attachmentUrl?: string | null;
  status: string;
  assignedTo?: string | null;
  convertedRequestId?: string | null;
  rejectionReason?: string | null;
  resolutionNote?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { name: string };
};

export type MosqueLeave = {
  id: string;
  leaveNumber: string;
  siteId: string;
  personnelId?: string | null;
  applicantUserId?: string | null;
  requestType: string;
  startDate: string;
  endDate: string;
  reason: string;
  replacementName: string;
  status: string;
  reviewerNote?: string | null;
  rejectionReason?: string | null;
  returnReason?: string | null;
  createdAt: string;
  site?: { name: string };
  personnel?: { name: string; role: string } | null;
};

export type MosqueJobApplication = {
  id: string;
  applicationNumber: string;
  trackingToken: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  qualification: string;
  experience?: string | null;
  jobType: string;
  preferredLocation?: string | null;
  cvUrl?: string | null;
  attachments?: string[] | null;
  status: string;
  internalNotes?: string | null;
  interviewAt?: string | null;
  createdAt: string;
};

export type MosquePersonnel = {
  id: string;
  siteId: string;
  userId?: string | null;
  name: string;
  role: string;
  mobile?: string | null;
  email?: string | null;
  active: boolean;
  site?: { name: string };
};

export type MosqueAssignment = {
  id: string;
  userId: string;
  role: MosqueModuleRole;
  siteId?: string | null;
  personnelRole?: string | null;
  site?: { name: string } | null;
};


export type MosqueStaffUser = {
  uid: string;
  username: string;
  email: string;
  isActive: boolean;
  moduleRole: MosqueModuleRole;
  siteId?: string | null;
  personnelRole?: string | null;
};

export type MosqueNotification = {
  id: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
};

export type MosqueDashboard = {
  role: MosqueModuleRole;
  siteId?: string | null;
  personnelRole?: string | null;
  stats: {
    sites: number;
    newRequests: number;
    reviewRequests: number;
    approvedRequests: number;
    lateRequests: number;
    openTickets: number;
    pendingLeaves: number;
    jobs: number;
    managedSites: number;
    assignedRequests: number;
    urgentRequests: number;
    newTickets: number;
    myRequests: number;
    myLeaves: number;
  };
  recentRequests: MosqueRequest[];
  recentTickets: MosqueTicket[];
  linkedSite?: MosqueSite | null;
  managedSiteIds?: string[];
};

export type PublicMosqueSite = Pick<MosqueSite, 'publicToken' | 'name' | 'siteType' | 'city' | 'district' | 'campusLocation' | 'area' | 'capacity' | 'latitude' | 'longitude' | 'mapUrl' | 'status'>;

const publicJson = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL غير مفعّل');
  const response = await fetch(`${base}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || 'تعذر تنفيذ الطلب');
  return body as T;
};

export const mosqueApi = {
  me: () => apiJson<{ role: MosqueModuleRole; siteId?: string | null; personnelRole?: string | null; userId: string; isAdmin: boolean }>('/api/mosques/me'),
  dashboard: () => apiJson<MosqueDashboard>('/api/mosques/dashboard'),
  sites: () => apiJson<MosqueSite[]>('/api/mosques/sites'),
  createSite: (input: Partial<MosqueSite>) => apiJson<MosqueSite>('/api/mosques/sites', { method: 'POST', body: JSON.stringify(input) }),
  updateSite: (id: string, input: Partial<MosqueSite>) => apiJson<MosqueSite>(`/api/mosques/sites/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteSite: (id: string) => apiJson<void>(`/api/mosques/sites/${id}`, { method: 'DELETE' }),

  requests: () => apiJson<MosqueRequest[]>('/api/mosques/requests'),
  createRequest: (input: Record<string, unknown>) => apiJson<MosqueRequest>('/api/mosques/requests', { method: 'POST', body: JSON.stringify(input) }),
  updateRequestStatus: (id: string, input: Record<string, unknown>) => apiJson<MosqueRequest>(`/api/mosques/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify(input) }),

  tickets: () => apiJson<MosqueTicket[]>('/api/mosques/tickets'),
  updateTicketStatus: (id: string, input: Record<string, unknown>) => apiJson<MosqueTicket>(`/api/mosques/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify(input) }),
  convertTicketToRequest: (id: string, input: Record<string, unknown> = {}) => apiJson<MosqueRequest>(`/api/mosques/tickets/${id}/convert-to-request`, { method: 'POST', body: JSON.stringify(input) }),

  leaves: () => apiJson<MosqueLeave[]>('/api/mosques/leaves'),
  createLeave: (input: Record<string, unknown>) => apiJson<MosqueLeave>('/api/mosques/leaves', { method: 'POST', body: JSON.stringify(input) }),
  updateLeaveStatus: (id: string, input: Record<string, unknown>) => apiJson<MosqueLeave>(`/api/mosques/leaves/${id}/status`, { method: 'PATCH', body: JSON.stringify(input) }),

  jobs: () => apiJson<MosqueJobApplication[]>('/api/mosques/jobs'),
  updateJobStatus: (id: string, input: Record<string, unknown>) => apiJson<MosqueJobApplication>(`/api/mosques/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify(input) }),

  personnel: () => apiJson<MosquePersonnel[]>('/api/mosques/personnel'),
  createPersonnel: (input: Record<string, unknown>) => apiJson<MosquePersonnel>('/api/mosques/personnel', { method: 'POST', body: JSON.stringify(input) }),
  createPersonnelAccount: (input: Record<string, unknown>) => apiJson<{ personnel: MosquePersonnel; user: { uid: string; username: string; email: string; isActive: boolean }; accountCreated: boolean; message: string }>('/api/mosques/personnel/account', { method: 'POST', body: JSON.stringify(input) }),
  staffDirectory: () => apiJson<MosqueStaffUser[]>('/api/mosques/staff-directory'),
  assignments: () => apiJson<MosqueAssignment[]>('/api/mosques/assignments'),
  setAssignment: (userId: string, input: Record<string, unknown>) => apiJson<MosqueAssignment>(`/api/mosques/assignments/${userId}`, { method: 'PUT', body: JSON.stringify(input) }),

  notifications: () => apiJson<MosqueNotification[]>('/api/mosques/notifications'),
  readNotification: (id: string) => apiJson<MosqueNotification>(`/api/mosques/notifications/${id}/read`, { method: 'PATCH' }),
  reportSummary: (from?: string, to?: string) => apiJson<any>(`/api/mosques/reports/summary?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()}`),

  upload: async (file: File) => {
    const data = new FormData();
    data.append('file', file);
    const response = await authenticatedFetch('/api/uploads', { method: 'POST', headers: { 'x-upload-module': 'mosques' }, body: data });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.message || 'تعذر رفع الملف');
    return body as { driveUrl: string; driveFileId?: string; fileName?: string };
  },
};

export const mosquePublicApi = {
  sites: () => publicJson<PublicMosqueSite[]>('/api/mosques/public/sites'),
  site: (token: string) => publicJson<PublicMosqueSite>(`/api/mosques/public/sites/${encodeURIComponent(token)}`),
  submitTicket: async (data: FormData) => publicJson<{ ticketNumber: string; trackingToken: string; status: string }>('/api/mosques/public/tickets', { method: 'POST', body: data }),
  trackTicket: (token: string) => publicJson<any>(`/api/mosques/public/tickets/track/${encodeURIComponent(token)}`),
  submitJob: async (data: FormData) => publicJson<{ applicationNumber: string; trackingToken: string; status: string }>('/api/mosques/public/jobs', { method: 'POST', body: data }),
  trackJob: (token: string) => publicJson<any>(`/api/mosques/public/jobs/track/${encodeURIComponent(token)}`),
};
