import { apiJson, authenticatedFetch, getApiBaseUrl } from '../../lib/http';

export type MosqueModuleRole = 'head' | 'supervisor' | 'personnel' | 'university_member' | 'viewer';

export type MosqueSiteMediaItem = {
  url: string;
  fileId?: string | null;
  fileName?: string | null;
  description?: string | null;
  mimeType?: string | null;
  category?: 'site_image' | 'mosque_image';
};

export type MosqueSiteDocumentItem = {
  url: string;
  fileId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

export type MosqueSiteMediaLibrary = {
  photos: MosqueSiteMediaItem[];
  documents: MosqueSiteDocumentItem[];
};

export type MosqueBuilding = {
  id: string;
  buildingNumber: string;
  name?: string | null;
  campusLocation?: string | null;
  city?: string | null;
  district?: string | null;
  expectedUsers?: number | null;
  coverageStatus: 'unassessed' | 'covered' | 'needs_prayer_room' | 'under_feasibility_study' | 'not_feasible_alternative' | 'under_implementation';
  creationFeasibility: 'available' | 'unavailable' | 'under_study';
  unavailableReason?: string | null;
  approvedAlternative?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sites?: Array<{
    id: string;
    name: string;
    siteType: 'mosque' | 'jami' | 'prayer_room';
    prayerRoomGender?: 'men' | 'women' | null;
  spatialRelation?: 'inside_building' | 'independent';
  buildingId?: string | null;
  floor?: string | null;
  roomNumber?: string | null;
  building?: Pick<MosqueBuilding, 'id' | 'buildingNumber' | 'name' | 'coverageStatus' | 'creationFeasibility'> | null;
    status: 'active' | 'maintenance' | 'temporarily_closed';
  }>;
  _count?: { sites: number };
};

export type MosqueSite = {
  id: string;
  publicToken: string;
  name: string;
  siteType: 'mosque' | 'jami' | 'prayer_room';
  prayerRoomGender?: 'men' | 'women' | null;
  city?: string | null;
  district?: string | null;
  campusLocation?: string | null;
  area?: number | null;
  capacity?: number | null;
  quranTargetCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string | null;
  status: 'active' | 'maintenance' | 'temporarily_closed';
  imamName?: string | null;
  muezzinName?: string | null;
  khateebName?: string | null;
  coordinatorName?: string | null;
  supervisorName?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  images?: string[] | MosqueSiteMediaLibrary | null;
  supervisorUserId?: string | null;
  _count?: { requests: number; tickets: number; personnel: number };
};

export type MosqueFieldVisitImage = {
  url: string;
  fileId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  capturedAt?: string | null;
};

export type MosqueFieldVisitAttachment = MosqueFieldVisitImage;

export type MosqueQuranInventoryCorrectionSnapshot = {
  largeCount: number;
  mediumCount: number;
  smallCount: number;
  recommendedWithdrawalCount: number;
  totalCount: number;
};

export type MosqueQuranInventoryCorrectionEntry = {
  correctedAt: string;
  correctedBy?: string | null;
  reason: string;
  before: MosqueQuranInventoryCorrectionSnapshot;
  after: MosqueQuranInventoryCorrectionSnapshot;
};

export type MosqueFieldVisitQuranInventoryDetails = {
  largeCount?: number | null;
  mediumCount?: number | null;
  smallCount?: number | null;
  recommendedWithdrawalCount?: number | null;
  conditionStatus?: 'not_checked' | 'good' | 'needs_attention';
  publisherStatus?: 'not_checked' | 'approved' | 'needs_review';
  notes?: string | null;
  capturedFrom?: 'field_visit';
  reconciliationStatus?: 'valid' | 'needs_correction' | 'corrected';
  reconciliationMessage?: string | null;
  correctionReason?: string | null;
  correctionDetectedAt?: string | null;
  correctionDetectedBy?: string | null;
  correctionBaseline?: MosqueQuranInventoryCorrectionSnapshot | null;
  correctionHistory?: MosqueQuranInventoryCorrectionEntry[];
};


export type MosqueFieldVisitQuranRackDetails = {
  itemType?: 'individual_stand' | 'shelf_unit';
  presentCount?: number | null;
  targetCount?: number | null;
  capacityCount?: number | null;
  quranCapacityCount?: number | null;
  goodCount?: number | null;
  damagedCount?: number | null;
  capturedFrom?: 'field_visit';
};

export type MosqueFieldVisitItemDetails = {
  quranInventory?: MosqueFieldVisitQuranInventoryDetails;
  quranRackInventory?: MosqueFieldVisitQuranRackDetails;
  [key: string]: unknown;
};

export type MosqueFieldVisitItem = {
  id?: string;
  visitId?: string;
  category: string;
  title: string;
  status: 'good' | 'needs_action' | 'not_available' | 'not_applicable' | 'not_checked';
  note?: string | null;
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  responsibleEntity?: string | null;
  dueDate?: string | null;
  resolutionStatus: 'new' | 'referred' | 'in_progress' | 'resolved' | 'closed';
  resolutionNote?: string | null;
  details?: MosqueFieldVisitItemDetails | null;
  beforeImages: MosqueFieldVisitImage[];
  afterImages: MosqueFieldVisitImage[];
};

export type MosqueFieldVisit = {
  id: string;
  visitNumber: string;
  tourId?: string | null;
  siteId: string;
  visitType: 'initial' | 'follow_up' | 'urgent' | 'closure_verification';
  visitDate: string;
  departureAt?: string | null;
  representativeName?: string | null;
  teamMembers: string[];
  overallStatus: 'excellent' | 'good' | 'needs_attention' | 'critical';
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  workflowStatus: 'planned' | 'in_progress' | 'completed' | 'follow_up' | 'closed';
  generalNotes?: string | null;
  recommendations?: string | null;
  attachments: MosqueFieldVisitAttachment[];
  createdBy?: string | null;
  isOwner?: boolean;
  hasStarted?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  createdAt: string;
  updatedAt: string;
  site: Pick<MosqueSite, 'id' | 'publicToken' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'status'>;
  tour?: Pick<MosqueFieldTour, 'id' | 'tourNumber' | 'title' | 'scheduledDate' | 'status'> | null;
  items: MosqueFieldVisitItem[];
};

export type MosqueFieldTour = {
  id: string;
  tourNumber: string;
  title: string;
  scheduledDate: string;
  scope?: string | null;
  teamMembers: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';
  notes?: string | null;
  createdBy?: string | null;
  isOwner?: boolean;
  hasStarted?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canCancel?: boolean;
  createdAt: string;
  updatedAt: string;
  visits?: Array<Pick<MosqueFieldVisit, 'id' | 'visitNumber' | 'siteId' | 'visitDate' | 'workflowStatus' | 'overallStatus' | 'priority' | 'site'>>;
};

export type MosqueFieldVisitSummary = {
  totalSites: number;
  visitedSites: number;
  remainingSites: number;
  coveragePercent: number;
  visits: number;
  openItems: number;
  urgentItems: number;
  resolvedItems: number;
  overdueItems: number;
};

export type MosqueApplicantInfo = {
  userId?: string | null;
  name: string;
  email?: string | null;
  mobile?: string | null;
  role?: string | null;
  roleLabel?: string | null;
  moduleRole?: string | null;
  active?: boolean;
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
  applicant?: MosqueApplicantInfo | null;
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
  applicant?: MosqueApplicantInfo | null;
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


export type MosqueQuranInventory = {
  id: string;
  siteId: string;
  largeCount: number;
  mediumCount: number;
  smallCount: number;
  damagedCount: number;
  neededCount: number;
  totalCount: number;
  countedAt: string;
  countedBy?: string | null;
  countedByName?: string | null;
  notes?: string | null;
  createdAt: string;
  site?: { id: string; name: string };
};

export type MosqueQuranInventoryOverviewItem = {
  site: Pick<MosqueSite, 'id' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'status'>;
  latest: MosqueQuranInventory | null;
};

export type MosqueQuranInventorySummary = {
  sites: number;
  countedSites: number;
  total: number;
  large: number;
  medium: number;
  small: number;
  damaged: number;
  needed: number;
};

export type MosqueQuranInventoryResponse = {
  items: MosqueQuranInventoryOverviewItem[];
  summary: MosqueQuranInventorySummary;
};

export type MosqueQuranStockCount = {
  largeCount: number;
  mediumCount: number;
  smallCount: number;
  totalCount: number;
};

export type MosqueQuranWarehouse = {
  id: string;
  code: string;
  name: string;
  location?: string | null;
  active: boolean;
  minLargeCount: number;
  minMediumCount: number;
  minSmallCount: number;
  notes?: string | null;
  balance: MosqueQuranStockCount;
  shortage: MosqueQuranStockCount;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MosqueQuranStockMovement = {
  id: string;
  movementNumber: string;
  movementType: 'receipt' | 'distribution' | 'return' | 'site_withdrawal' | 'warehouse_damage' | 'adjustment_in' | 'adjustment_out';
  warehouseId: string;
  siteId?: string | null;
  largeCount: number;
  mediumCount: number;
  smallCount: number;
  totalCount: number;
  referenceNumber?: string | null;
  movementAt: string;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
  warehouse?: { id: string; code: string; name: string };
  site?: { id: string; name: string; siteType?: string; prayerRoomGender?: string | null } | null;
};

export type MosqueQuranStockDashboard = {
  warehouses: MosqueQuranWarehouse[];
  summary: {
    warehouseTotal: number;
    warehouseLarge: number;
    warehouseMedium: number;
    warehouseSmall: number;
    receivedTotal: number;
    distributedTotal: number;
    returnedTotal: number;
    withdrawnTotal: number;
    damagedTotal: number;
    adjustmentInTotal: number;
    adjustmentOutTotal: number;
    warehouseInflowTotal: number;
    warehouseOutflowTotal: number;
    warehouseNetMovement: number;
    siteSystemTotal: number;
    systemTotal: number;
    siteNeedTotal: number;
    lowStockWarehouses: number;
    shortageTotal: number;
  };
  sites: Array<{
    site: Pick<MosqueSite, 'id' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'quranTargetCount'>;
    latestInventory: MosqueQuranInventory | null;
    systemStock: MosqueQuranStockCount;
    withdrawnStock: MosqueQuranStockCount;
    targetCount: number;
    needCount: number;
    coveragePercent: number | null;
    needLevel: 'not_set' | 'complete' | 'low' | 'medium' | 'high';
  }>;
  recentMovements: MosqueQuranStockMovement[];
};



export type MosqueQuranEquipmentType = 'individual_stand' | 'shelf_unit';

export type MosqueQuranRackInventory = {
  id: string;
  siteId: string;
  itemType: MosqueQuranEquipmentType;
  presentCount: number;
  targetCount: number;
  capacityCount: number;
  quranCapacityCount: number;
  goodCount: number;
  damagedCount: number;
  surplusCount?: number;
  shortageCount?: number;
  remainingCapacity?: number | null;
  countedAt: string;
  countedBy?: string | null;
  countedByName?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type MosqueQuranRackMovement = {
  id: string;
  movementNumber: string;
  movementType: 'surplus_to_stock' | 'stock_to_site' | 'receipt' | 'stock_damage' | 'adjustment_in' | 'adjustment_out';
  itemType: MosqueQuranEquipmentType;
  siteId?: string | null;
  quantity: number;
  movementAt: string;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
};

export type MosqueQuranRackTypeSummary = {
  centralStock: number;
  countedSites: number;
  totalPresent: number;
  totalGood: number;
  totalDamaged: number;
  totalSurplus: number;
  totalShortage: number;
  totalQuranCapacity: number;
};

export type MosqueQuranRackDashboard = {
  summary: {
    centralStock: number;
    centralStockIndividualStands: number;
    centralStockShelfUnits: number;
    countedSites: number;
    countedEntries: number;
    totalPresent: number;
    totalGood: number;
    totalDamaged: number;
    totalSurplus: number;
    totalShortage: number;
    totalQuranCapacity: number;
    byType: Record<MosqueQuranEquipmentType, MosqueQuranRackTypeSummary>;
  };
  sites: Array<{
    site: Pick<MosqueSite, 'id' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'status'>;
    itemType: MosqueQuranEquipmentType;
    latest: MosqueQuranRackInventory | null;
    presentCount: number;
    targetCount: number;
    capacityCount: number;
    quranCapacityCount: number;
    goodCount: number;
    damagedCount: number;
    surplusCount: number;
    shortageCount: number;
    remainingCapacity: number | null;
  }>;
  recentMovements: MosqueQuranRackMovement[];
};

export type MosqueQuranOpeningBaselineStatus = {
  closed: boolean;
  closedAt?: string | null;
  closedByName?: string | null;
  totalSites: number;
  countedSites: number;
  remainingSites: number;
  items: Array<{
    site: Pick<MosqueSite, 'id' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'status'>;
    counted: boolean;
    baseline: null | {
      largeCount: number;
      mediumCount: number;
      smallCount: number;
      totalCount: number;
      recommendedWithdrawalCount: number;
      countedAt: string;
      countedByName?: string | null;
      notes?: string | null;
      inventoryId?: string | null;
    };
  }>;
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

export type MosqueWorkflowKind = 'request' | 'ticket' | 'leave' | 'job';
export type MosqueWorkflowHistoryEntry = {
  id: string;
  action: string;
  description?: string | null;
  details?: { kind?: string; fromStatus?: string | null; toStatus?: string | null; note?: string | null } | null;
  username?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
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

export type PublicMosqueSite = Pick<MosqueSite, 'publicToken' | 'name' | 'siteType' | 'prayerRoomGender' | 'city' | 'district' | 'campusLocation' | 'area' | 'capacity' | 'latitude' | 'longitude' | 'mapUrl' | 'status'>;

const publicJson = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL غير مفعّل');
  const response = await fetch(`${base}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || 'تعذر تنفيذ الطلب');
  return body as T;
};

export const mosqueApi = {
  me: () => apiJson<{ role: MosqueModuleRole; siteId?: string | null; personnelRole?: string | null; userId: string; username: string; isAdmin: boolean; fullPermissionAccess?: boolean; accessSource?: string }>('/api/mosques/me'),
  dashboard: () => apiJson<MosqueDashboard>('/api/mosques/dashboard'),
  sites: () => apiJson<MosqueSite[]>('/api/mosques/sites'),
  buildings: () => apiJson<MosqueBuilding[]>('/api/mosques/buildings'),
  createBuilding: (input: Partial<MosqueBuilding>) => apiJson<MosqueBuilding>('/api/mosques/buildings', { method: 'POST', body: JSON.stringify(input) }),
  updateBuilding: (id: string, input: Partial<MosqueBuilding>) => apiJson<MosqueBuilding>(`/api/mosques/buildings/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteBuilding: (id: string) => apiJson<void>(`/api/mosques/buildings/${id}`, { method: 'DELETE' }),
  createSite: (input: Partial<MosqueSite>) => apiJson<MosqueSite>('/api/mosques/sites', { method: 'POST', body: JSON.stringify(input) }),
  updateSite: (id: string, input: Partial<MosqueSite>) => apiJson<MosqueSite>(`/api/mosques/sites/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteSite: (id: string) => apiJson<void>(`/api/mosques/sites/${id}`, { method: 'DELETE' }),

  fieldVisitChecklist: () => apiJson<MosqueFieldVisitItem[]>('/api/mosques/field-visits/checklist-template'),
  fieldTours: () => apiJson<MosqueFieldTour[]>('/api/mosques/field-tours'),
  createFieldTour: (input: Record<string, unknown>) => apiJson<MosqueFieldTour>('/api/mosques/field-tours', { method: 'POST', body: JSON.stringify(input) }),
  updateFieldTour: (id: string, input: Record<string, unknown>) => apiJson<MosqueFieldTour>(`/api/mosques/field-tours/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteFieldTour: (id: string) => apiJson<void>(`/api/mosques/field-tours/${id}`, { method: 'DELETE' }),
  fieldVisits: (filters: { siteId?: string; tourId?: string; workflowStatus?: string } = {}) => apiJson<MosqueFieldVisit[]>(`/api/mosques/field-visits?${new URLSearchParams(filters).toString()}`),
  fieldVisit: (id: string) => apiJson<MosqueFieldVisit>(`/api/mosques/field-visits/${id}`),
  fieldVisitSummary: () => apiJson<MosqueFieldVisitSummary>('/api/mosques/field-visits/summary'),
  createFieldVisit: (input: Record<string, unknown>) => apiJson<MosqueFieldVisit>('/api/mosques/field-visits', { method: 'POST', body: JSON.stringify(input) }),
  updateFieldVisit: (id: string, input: Record<string, unknown>) => apiJson<MosqueFieldVisit>(`/api/mosques/field-visits/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteFieldVisit: (id: string) => apiJson<void>(`/api/mosques/field-visits/${id}`, { method: 'DELETE' }),

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

  workflowHistory: (kind: MosqueWorkflowKind, id: string) => apiJson<MosqueWorkflowHistoryEntry[]>(`/api/mosques/workflow/${kind}/${id}/history`),
  updateWorkflow: <T = any>(kind: MosqueWorkflowKind, id: string, input: Record<string, unknown>) => apiJson<T>(`/api/mosques/workflow/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  workflowAction: <T = any>(kind: MosqueWorkflowKind, id: string, input: Record<string, unknown>) => apiJson<T>(`/api/mosques/workflow/${kind}/${id}/action`, { method: 'PATCH', body: JSON.stringify(input) }),
  resubmitWorkflow: <T = any>(kind: 'request' | 'leave', id: string, input: Record<string, unknown>) => apiJson<T>(`/api/mosques/workflow/${kind}/${id}/resubmit`, { method: 'PATCH', body: JSON.stringify(input) }),

  quranInventory: () => apiJson<MosqueQuranInventoryResponse>('/api/mosques/quran-inventory'),
  quranInventoryHistory: (siteId: string) => apiJson<MosqueQuranInventory[]>(`/api/mosques/quran-inventory/${siteId}/history`),
  createQuranInventory: (input: Record<string, unknown>) => apiJson<MosqueQuranInventory>('/api/mosques/quran-inventory', { method: 'POST', body: JSON.stringify(input) }),


quranRackDashboard: () => apiJson<MosqueQuranRackDashboard>('/api/mosques/quran-racks/dashboard'),
createQuranRackInventory: (input: Record<string, unknown>) => apiJson<MosqueQuranRackInventory>('/api/mosques/quran-racks/inventory', { method: 'POST', body: JSON.stringify(input) }),
createQuranRackMovement: (input: Record<string, unknown>) => apiJson<{ movement: MosqueQuranRackMovement; dashboard: MosqueQuranRackDashboard }>('/api/mosques/quran-racks/movements', { method: 'POST', body: JSON.stringify(input) }),

  quranStockDashboard: () => apiJson<MosqueQuranStockDashboard>('/api/mosques/quran-stock/dashboard'),
  quranOpeningBaselineStatus: () => apiJson<MosqueQuranOpeningBaselineStatus>('/api/mosques/quran-stock/opening-baseline'),
  saveQuranOpeningBaseline: (input: Record<string, unknown>) => apiJson<{ message: string; inventory: MosqueQuranInventory; state: MosqueQuranOpeningBaselineStatus }>('/api/mosques/quran-stock/opening-baseline', { method: 'POST', body: JSON.stringify(input) }),
  closeQuranOpeningBaseline: (confirmation: string) => apiJson<{ message: string; state: MosqueQuranOpeningBaselineStatus }>('/api/mosques/quran-stock/opening-baseline/close', { method: 'POST', body: JSON.stringify({ confirmation }) }),
  quranStockMovements: () => apiJson<MosqueQuranStockMovement[]>('/api/mosques/quran-stock/movements'),
  createQuranWarehouse: (input: Record<string, unknown>) => apiJson<MosqueQuranWarehouse>('/api/mosques/quran-warehouses', { method: 'POST', body: JSON.stringify(input) }),
  updateQuranWarehouse: (id: string, input: Record<string, unknown>) => apiJson<MosqueQuranWarehouse>(`/api/mosques/quran-warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteQuranWarehouse: (id: string) => apiJson<void>(`/api/mosques/quran-warehouses/${id}`, { method: 'DELETE' }),
  createQuranStockMovement: (input: Record<string, unknown>) => apiJson<MosqueQuranStockMovement>('/api/mosques/quran-stock/movements', { method: 'POST', body: JSON.stringify(input) }),
  reverseQuranStockMovement: (id: string, input: { reason: string }) => apiJson<{ reversedMovementId: string; reversal: MosqueQuranStockMovement }>(`/api/mosques/quran-stock/movements/${id}/reverse`, { method: 'POST', body: JSON.stringify(input) }),
  resetQuranLibrary: (confirmation: string) => apiJson<{ message: string; reset: { warehouses: number; movements: number; inventories: number; notifications: number } }>('/api/mosques/quran-stock/reset', { method: 'POST', body: JSON.stringify({ confirmation }) }),

  personnel: () => apiJson<MosquePersonnel[]>('/api/mosques/personnel'),
  createPersonnel: (input: Record<string, unknown>) => apiJson<MosquePersonnel>('/api/mosques/personnel', { method: 'POST', body: JSON.stringify(input) }),
  createPersonnelAccount: (input: Record<string, unknown>) => apiJson<{ personnel: MosquePersonnel; user: { uid: string; username: string; email: string; isActive: boolean }; accountCreated: boolean; message: string }>('/api/mosques/personnel/account', { method: 'POST', body: JSON.stringify(input) }),
  updatePersonnel: (id: string, input: Record<string, unknown>) => apiJson<MosquePersonnel>(`/api/mosques/personnel/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deletePersonnel: (id: string) => apiJson<{ id: string; detachedUserId?: string | null }>(`/api/mosques/personnel/${id}`, { method: 'DELETE' }),
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
    return body as { driveUrl: string; driveFileId?: string; fileName?: string; mimeType?: string };
  },
  mediaBlob: async (fileId: string) => {
    const response = await authenticatedFetch(`/api/uploads/${encodeURIComponent(fileId)}/content`, { headers: { 'x-upload-module': 'mosques' } });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.message || 'تعذر تحميل معاينة الملف');
    }
    return response.blob();
  },
  deleteUpload: async (fileId: string) => {
    const response = await authenticatedFetch(`/api/uploads/${encodeURIComponent(fileId)}`, { method: 'DELETE', headers: { 'x-upload-module': 'mosques' } });
    if (!response.ok && response.status !== 404) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.message || 'تعذر حذف الملف المرفوع');
    }
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
